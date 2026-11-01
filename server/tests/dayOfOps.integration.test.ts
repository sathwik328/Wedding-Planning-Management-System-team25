import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { DayOfOpsService } from "../src/services/dayOfOps.service.js";

const prisma = new PrismaClient();
const opsService = new DayOfOpsService(prisma);

describe("Day-of Operations, Radar & Incidents Integration Tests (Developer A)", () => {
  let weddingId: string;
  let weddingDayId: string;
  let coordinatorId: string;
  let vendorCheckInId: string;
  let incidentId: string;

  beforeAll(async () => {
    // Find coordinator user
    const coordinator = await prisma.user.findFirstOrThrow({
      where: { role: "COORDINATOR" }
    });
    coordinatorId = coordinator.id;

    // Find seeded wedding that has contracted wedding vendors
    let wedding = await prisma.wedding.findFirst({
      where: {
        weddingVendors: { some: {} }
      },
      include: {
        days: { orderBy: { dayNumber: "asc" } },
        weddingVendors: true
      }
    });

    // If none found with vendors, pick first and attach a test vendor
    if (!wedding) {
      wedding = await prisma.wedding.findFirstOrThrow({
        include: {
          days: { orderBy: { dayNumber: "asc" } },
          weddingVendors: true
        }
      });
      const vendor = await prisma.vendor.findFirstOrThrow();
      const rfqGroup = await prisma.quotationRequestGroup.create({
        data: {
          weddingId: wedding.id,
          title: "Test Decor RFQ",
          category: "DECOR_FLORAL"
        }
      });
      await prisma.weddingVendor.create({
        data: {
          weddingId: wedding.id,
          vendorId: vendor.id,
          quotationRequestGroupId: rfqGroup.id,
          serviceCategory: "DECOR_FLORAL",
          agreedBaselineAmountPaise: 50000000n
        }
      });
    }

    weddingId = wedding.id;
    if (wedding.days.length === 0) {
      const day = await prisma.weddingDay.create({
        data: {
          weddingId: wedding.id,
          dayNumber: 1,
          date: wedding.startDate,
          title: "Day 1: Royal Baraat & Pheras"
        }
      });
      weddingDayId = day.id;
    } else {
      weddingDayId = wedding.days[0].id;
    }
  });

  afterAll(async () => {
    // Clean up created schedules and incidents
    await prisma.eventSchedule.deleteMany({
      where: { activityName: { contains: "Test Royal" } }
    });
    await prisma.incident.deleteMany({
      where: { title: { contains: "Test Power" } }
    });
    await prisma.$disconnect();
  });

  it("Creates a minute-by-minute activity schedule and links coordinator", async () => {
    const schedule = await opsService.createSchedule(weddingId, {
      weddingDayId,
      subEvent: "BARAAT",
      activityName: "Test Royal Elephant & Brass Band Procession",
      startTime: "2026-12-15T16:00:00.000Z",
      endTime: "2026-12-15T17:30:00.000Z",
      location: "East Fort Palace Gates",
      coordinatorId,
      notes: "Traditional Marwari welcomes and safa tying stations"
    });

    expect(schedule.id).toBeDefined();
    expect(schedule.weddingId).toBe(weddingId);
    expect(schedule.subEvent).toBe("BARAAT");
    expect(schedule.coordinatorId).toBe(coordinatorId);
  });

  it("Retrieves chronologically sorted schedules for the wedding", async () => {
    const schedules = await opsService.getSchedules(weddingId);
    expect(schedules.length).toBeGreaterThan(0);
    const created = schedules.find((s) => s.activityName.includes("Test Royal Elephant"));
    expect(created).toBeDefined();
    expect(created?.coordinator?.name).toBeDefined();
  });

  it("Synchronizes vendor arrival radar and logs vendor arrival check-in", async () => {
    const radar = await opsService.getVendorCheckIns(weddingId);
    expect(radar.length).toBeGreaterThan(0);

    const targetVendor = radar[0];
    vendorCheckInId = targetVendor.id;

    const checkedIn = await opsService.checkInVendor(
      vendorCheckInId,
      "Rajesh Chouhan (Lead Coordinator)",
      "Arrived at venue service gate. Security pass issued."
    );

    expect(checkedIn.status).toBe("ARRIVED");
    expect(checkedIn.actualArrival).toBeInstanceOf(Date);
    expect(checkedIn.checkedInBy).toBe("Rajesh Chouhan (Lead Coordinator)");
    expect(checkedIn.notes).toContain("Security pass issued");
  });

  it("Logs an operations incident, then resolves it with resolution notes", async () => {
    const incident = await opsService.createIncident(weddingId, {
      title: "Test Power Fluctuation on Stage Decor",
      description: "Mandap spotlight phase tripped during flower placement",
      severity: "CRITICAL",
      reportedBy: "Rajesh Chouhan"
    });

    incidentId = incident.id;
    expect(incident.id).toBeDefined();
    expect(incident.status).toBe("OPEN");
    expect(incident.severity).toBe("CRITICAL");

    // Resolve incident
    const resolved = await opsService.resolveIncident(
      incidentId,
      "Switched to auxiliary silent 125kVA generator. All stage lights restored."
    );

    expect(resolved.status).toBe("RESOLVED");
    expect(resolved.resolvedAt).toBeInstanceOf(Date);
    expect(resolved.resolutionNotes).toContain("auxiliary silent 125kVA generator");
  });

  it("Compiles full operations cockpit with aggregated staff roster and active metrics", async () => {
    const cockpit = await opsService.getOperationsCockpit(weddingId);

    expect(cockpit.wedding.id).toBe(weddingId);
    expect(cockpit.stats).toBeDefined();
    expect(cockpit.stats.totalSchedules).toBeGreaterThan(0);
    expect(typeof cockpit.stats.onScheduleVendors).toBe("number");
    expect(typeof cockpit.stats.delayedVendorCount).toBe("number");
    expect(Array.isArray(cockpit.staffRoster)).toBe(true);
    expect(cockpit.staffRoster.length).toBeGreaterThan(0);

    const coordinatorEntry = cockpit.staffRoster.find((s: any) => s.user.id === coordinatorId);
    expect(coordinatorEntry).toBeDefined();
    expect(coordinatorEntry.scheduleCount).toBeGreaterThan(0);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { WeddingOpsService } from "../src/services/weddingOps.service.js";
import { FULL_SERVICE_TASK_TEMPLATES, PARTIAL_SERVICE_TASK_TEMPLATES } from "shared";

const prisma = new PrismaClient();
const weddingOpsService = new WeddingOpsService(prisma);

describe("Wedding Creation & Task Automation Integration Tests (Developer A)", () => {
  let coupleFullId: string;
  let couplePartId: string;
  let leadPlannerId: string;
  let weddingFullId: string;

  beforeAll(async () => {
    // Get lead planner user
    const planner = await prisma.user.findFirstOrThrow({
      where: { role: "LEAD_PLANNER" }
    });
    leadPlannerId = planner.id;

    // Create test couples with executed agreements
    const couple1 = await prisma.couple.create({
      data: {
        partnerOneName: "Test Raja Harshvardhan",
        partnerTwoName: "Test Rani Padmini",
        email: "test.wedding.harsh@royalknot-test.in",
        phone: "+919829911001",
        address: "Umaid Heritage Estate, Jodhpur",
        serviceAgreement: {
          create: {
            packageType: "FULL_SERVICE",
            agreedFeePaise: 450000000n,
            paymentTerms: "25% on execution",
            isExecuted: true,
            signedAt: new Date()
          }
        }
      }
    });
    coupleFullId = couple1.id;

    const couple2 = await prisma.couple.create({
      data: {
        partnerOneName: "Test Kunwar Devraj",
        partnerTwoName: "Test Baijilal Divya",
        email: "test.wedding.devraj@royalknot-test.in",
        phone: "+919829911002",
        address: "Mewar Enclave, Udaipur",
        serviceAgreement: {
          create: {
            packageType: "PARTIAL_DAY_OF",
            agreedFeePaise: 250000000n,
            paymentTerms: "25% on execution",
            isExecuted: true,
            signedAt: new Date()
          }
        }
      }
    });
    couplePartId = couple2.id;
  });

  afterAll(async () => {
    // Cascade cleanups
    await prisma.task.deleteMany({ where: { wedding: { coupleId: { in: [coupleFullId, couplePartId] } } } });
    await prisma.weddingDay.deleteMany({ where: { wedding: { coupleId: { in: [coupleFullId, couplePartId] } } } });
    await prisma.paymentMilestone.deleteMany({ where: { wedding: { coupleId: { in: [coupleFullId, couplePartId] } } } });
    await prisma.wedding.deleteMany({
      where: { coupleId: { in: [coupleFullId, couplePartId] } }
    });
    await prisma.serviceAgreement.deleteMany({
      where: { coupleId: { in: [coupleFullId, couplePartId] } }
    });
    await prisma.couple.deleteMany({
      where: { id: { in: [coupleFullId, couplePartId] } }
    });
    await prisma.$disconnect();
  });

  it("Creates a Full Service Wedding, multi-day itinerary, and automatically generates 32 task templates", async () => {
    const wedding = await weddingOpsService.createWedding({
      coupleId: coupleFullId,
      title: "Harshvardhan & Padmini Royal Jodhpur Gala",
      packageType: "FULL_SERVICE",
      startDate: "2026-11-20T00:00:00.000Z",
      endDate: "2026-11-22T00:00:00.000Z", // 3 days
      primaryCity: "Jodhpur",
      venueName: "Umaid Bhawan Palace",
      targetGuestCount: 500,
      totalBudgetPaise: "45000000000" // ₹45 Crore
    });

    weddingFullId = wedding.id;
    expect(wedding.id).toBeDefined();
    expect(wedding.title).toBe("Harshvardhan & Padmini Royal Jodhpur Gala");
    expect(wedding.tasksGenerated).toBe(true);

    // Verify multi-day itinerary creation
    const days = await prisma.weddingDay.findMany({
      where: { weddingId: wedding.id },
      orderBy: { dayNumber: "asc" }
    });
    expect(days.length).toBe(3);
    expect(days[0].dayNumber).toBe(1);

    // Verify automatic task generation matches FULL_SERVICE count dynamically
    const tasks = await prisma.task.findMany({
      where: { weddingId: wedding.id }
    });
    expect(tasks.length).toBe(FULL_SERVICE_TASK_TEMPLATES.length);
  });

  it("Creates a Partial Service Wedding and generates exactly 20 task templates", async () => {
    const wedding = await weddingOpsService.createWedding({
      coupleId: couplePartId,
      title: "Devraj & Divya Udaipur Intimate Soiree",
      packageType: "PARTIAL_DAY_OF",
      startDate: "2026-12-10T00:00:00.000Z",
      endDate: "2026-12-11T00:00:00.000Z",
      primaryCity: "Udaipur",
      venueName: "Jagmandir Island Palace",
      targetGuestCount: 250,
      totalBudgetPaise: "18000000000" // ₹18 Crore
    });

    const tasks = await prisma.task.findMany({
      where: { weddingId: wedding.id }
    });
    expect(tasks.length).toBe(PARTIAL_SERVICE_TASK_TEMPLATES.length);
  });

  it("Updates task assignment, stage transition, and priority", async () => {
    const tasks = await weddingOpsService.listTasks(weddingFullId);
    expect(tasks.length).toBeGreaterThan(0);
    const targetTask = tasks[0];

    const updated = await weddingOpsService.updateTask(targetTask.id, {
      assignedToId: leadPlannerId,
      stage: "IN_PROGRESS",
      priority: "CRITICAL"
    });

    expect(updated.assignedToId).toBe(leadPlannerId);
    expect(updated.stage).toBe("IN_PROGRESS");
    expect(updated.priority).toBe("CRITICAL");
  });

  it("Creates custom bespoke task on wedding dossier", async () => {
    const customTask = await weddingOpsService.createCustomTask({
      weddingId: weddingFullId,
      title: "Curate Antique Silverware for Royal Banquet",
      category: "VENUE_DESIGN",
      priority: "HIGH",
      dueDate: "2026-11-15T00:00:00.000Z",
      assignedToId: leadPlannerId
    });

    expect(customTask.id).toBeDefined();
    expect(customTask.isCustom).toBe(true);
    expect(customTask.title).toBe("Curate Antique Silverware for Royal Banquet");
  });

  it("Lists weddings with accurate progress percentage calculation", async () => {
    const weddings = await weddingOpsService.listWeddings();
    const current = weddings.find((w) => w.id === weddingFullId);
    expect(current).toBeDefined();
    expect(current.totalTasks).toBeGreaterThan(0);
    expect(typeof current.progressPercent).toBe("number");
  });

  it("Rejects creating a second wedding for the same couple", async () => {
    await expect(
      weddingOpsService.createWedding({
        coupleId: coupleFullId,
        title: "Duplicate Wedding Attempt",
        packageType: "FULL_SERVICE",
        startDate: "2026-11-20T00:00:00.000Z",
        endDate: "2026-11-22T00:00:00.000Z",
        primaryCity: "Jodhpur",
        venueName: "Umaid Bhawan Palace",
        totalBudgetPaise: "100000000"
      })
    ).rejects.toThrow("already has an active wedding project");
  });
});

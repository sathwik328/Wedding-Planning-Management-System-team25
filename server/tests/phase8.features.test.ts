import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ReadinessRadarService } from "../src/services/readiness-radar.service.js";
import { BudgetSimulatorService } from "../src/services/budget-simulator.service.js";
import { GuestPortalService, normalizeE164 } from "../src/services/guest-portal.service.js";
import { ContingencyService } from "../src/services/contingency.service.js";
import { VendorReliabilityService } from "../src/services/vendor-reliability.service.js";

const prisma = new PrismaClient();

describe("Phase 8: Five Special Features Comprehensive Integration Tests", () => {
  let weddingId: string;
  let coupleId: string;
  let commanderId: string;
  let vendorId: string;

  const testWeddingIds: string[] = [];
  const testCoupleIds: string[] = [];

  async function cleanupTargeted() {
    if (testWeddingIds.length === 0 && testCoupleIds.length === 0) return;

    await prisma.vendorPayment.deleteMany({
      where: { vendorBill: { weddingVendor: { weddingId: { in: testWeddingIds } } } }
    });
    await prisma.additionalCharge.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.vendorBill.deleteMany({
      where: { weddingVendor: { weddingId: { in: testWeddingIds } } }
    });
    await prisma.vendorCheckIn.deleteMany({
      where: { weddingVendor: { weddingId: { in: testWeddingIds } } }
    });
    await prisma.quotationLineItem.deleteMany({
      where: { quotation: { vendorRequest: { group: { weddingId: { in: testWeddingIds } } } } }
    });
    await prisma.quotationRequestGroup.updateMany({
      where: { weddingId: { in: testWeddingIds } },
      data: { awardedQuotationId: null }
    });
    await prisma.vendorQuotation.deleteMany({
      where: { vendorRequest: { group: { weddingId: { in: testWeddingIds } } } }
    });
    await prisma.vendorRequest.deleteMany({
      where: { group: { weddingId: { in: testWeddingIds } } }
    });
    await prisma.weddingVendor.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.quotationRequestGroup.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.contingencyPlan.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.guest.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.rsvpSubmission.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.incident.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.task.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.eventSchedule.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.weddingDay.deleteMany({
      where: { weddingId: { in: testWeddingIds } }
    });
    await prisma.wedding.deleteMany({
      where: { id: { in: testWeddingIds } }
    });
    await prisma.couple.deleteMany({
      where: { id: { in: testCoupleIds } }
    });

    testWeddingIds.length = 0;
    testCoupleIds.length = 0;
  }

  beforeEach(async () => {
    await cleanupTargeted();

    // Seed test couple
    const couple = await prisma.couple.create({
      data: {
        partnerOneName: "Test Vikramaditya",
        partnerTwoName: "Test Gayatri",
        email: `vikram.gayatri.${Date.now()}@royalknot.in`,
        phone: "+919829011111"
      }
    });
    coupleId = couple.id;
    testCoupleIds.push(couple.id);

    // Seed test wedding
    const wedding = await prisma.wedding.create({
      data: {
        coupleId: couple.id,
        title: "The Royal Rajputana Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-12-12T10:00:00.000Z"),
        endDate: new Date("2026-12-14T22:00:00.000Z"),
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        targetGuestCount: 450,
        totalBudgetPaise: 3500000000n, // ₹3.5 Cr
        status: "PLANNING"
      }
    });
    weddingId = wedding.id;
    testWeddingIds.push(wedding.id);

    // Seed commander user
    const commander = await prisma.user.upsert({
      where: { email: "lead.planner@royalknot.in" },
      update: { role: "LEAD_PLANNER" },
      create: {
        email: "lead.planner@royalknot.in",
        name: "Naina Kapoor",
        role: "LEAD_PLANNER",
        phone: "+919829022222"
      }
    });
    commanderId = commander.id;

    // Seed vendor
    const vendor = await prisma.vendor.upsert({
      where: { id: "v-test-floral-01" },
      update: {},
      create: {
        id: "v-test-floral-01",
        businessName: "Royal Rajputana Florals",
        category: "DECOR_FLORAL",
        contactPerson: "Mahesh Singh",
        phone: "+919829033333",
        email: "florals@royalknot.in",
        city: "Jaipur"
      }
    });
    vendorId = vendor.id;
  });

  afterAll(async () => {
    await cleanupTargeted();
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // FEATURE 1: WEDDING READINESS RADAR & OVERLAP NULL-SAFETY
  // ---------------------------------------------------------------------------
  describe("Feature 1: Wedding Readiness Radar", () => {
    it("correctly identifies unstaffed activities at distinct locations as non-colliding", async () => {
      const radarService = new ReadinessRadarService(prisma);

      // Create wedding day
      const day = await prisma.weddingDay.create({
        data: {
          weddingId,
          dayNumber: 1,
          date: new Date("2026-12-12"),
          title: "Day 1 Sangeet"
        }
      });

      // Activity A: Ballroom, null coordinator
      await prisma.eventSchedule.create({
        data: {
          weddingId,
          weddingDayId: day.id,
          subEvent: "SANGEET",
          activityName: "Sangeet Soundcheck",
          startTime: new Date("2026-12-12T14:00:00.000Z"),
          endTime: new Date("2026-12-12T16:00:00.000Z"),
          location: "Grand Ballroom",
          coordinatorId: null
        }
      });

      // Activity B: Lawn, null coordinator (overlapping time, different location, both null coordinators)
      await prisma.eventSchedule.create({
        data: {
          weddingId,
          weddingDayId: day.id,
          subEvent: "HALDI",
          activityName: "High Tea Setup",
          startTime: new Date("2026-12-12T15:00:00.000Z"),
          endTime: new Date("2026-12-12T17:00:00.000Z"),
          location: "Crescent Lawn",
          coordinatorId: null
        }
      });

      // Add 1 task and 1 vendor to prevent INCOMPLETE_DATA short circuit
      await prisma.task.create({
        data: {
          weddingId,
          templateKey: "TEST_TASK_01",
          title: "Initial Planning",
          category: "VENUE_DESIGN",
          stage: "DONE",
          dueDate: new Date("2026-12-10")
        }
      });

      const rfqGroup = await prisma.quotationRequestGroup.create({
        data: {
          weddingId,
          title: "Test Floral RFQ",
          category: "DECOR_FLORAL"
        }
      });

      await prisma.weddingVendor.create({
        data: {
          weddingId,
          vendorId,
          quotationRequestGroupId: rfqGroup.id,
          serviceCategory: "DECOR_FLORAL",
          agreedBaselineAmountPaise: 50000000n
        }
      });

      const audit = await radarService.getWeddingReadinessAudit(weddingId);
      expect(audit.missingOperationalData).toBe(false);
      expect(audit.pillars.timelineIntegrity.detail).toContain("0 room/staff overlaps");
      expect(audit.hardBlockers.some((h) => h.code === "SCHEDULE_COLLISION")).toBe(false);
    });

    it("triggers hard blocker override to CRITICAL when an open critical incident exists", async () => {
      const radarService = new ReadinessRadarService(prisma);

      await prisma.task.create({
        data: {
          weddingId,
          templateKey: "TEST_TASK_DONE",
          title: "Done Task",
          category: "VENUE_DESIGN",
          stage: "DONE",
          dueDate: new Date("2026-12-10")
        }
      });

      const rfqGroup = await prisma.quotationRequestGroup.create({
        data: {
          weddingId,
          title: "Test Floral RFQ",
          category: "DECOR_FLORAL"
        }
      });

      await prisma.weddingVendor.create({
        data: {
          weddingId,
          vendorId,
          quotationRequestGroupId: rfqGroup.id,
          serviceCategory: "DECOR_FLORAL",
          agreedBaselineAmountPaise: 50000000n
        }
      });

      // Create an open critical incident
      await prisma.incident.create({
        data: {
          weddingId,
          title: "Substation Transformer Overheat",
          description: "Main ballroom power grid failing",
          severity: "CRITICAL",
          status: "OPEN",
          reportedBy: "Naina Kapoor"
        }
      });

      const audit = await radarService.getWeddingReadinessAudit(weddingId);
      expect(audit.severityLevel).toBe("CRITICAL");
      expect(audit.hardBlockers.some((b) => b.code === "OPEN_CRITICAL_INCIDENT")).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // FEATURE 2: BUDGET IMPACT SIMULATOR
  // ---------------------------------------------------------------------------
  describe("Feature 2: Budget Impact Simulator", () => {
    it("accurately projects expense deltas and agency markup without double counting", async () => {
      const budgetService = new BudgetSimulatorService(prisma);

      // Create RFQ Group for catering with awarded plate rate of ₹3,500 (350000 paise)
      const rfqGroup = await prisma.quotationRequestGroup.create({
        data: {
          weddingId,
          title: "Banquet Catering RFQ",
          category: "CATERING",
          targetGuestCount: 450,
          status: "AWARDED"
        }
      });

      const vendorRequest = await prisma.vendorRequest.create({
        data: {
          quotationRequestGroupId: rfqGroup.id,
          vendorId,
          requirement: "Luxury Banquet Catering for 450 guests"
        }
      });

      const awardedQuotation = await prisma.vendorQuotation.create({
        data: {
          vendorRequestId: vendorRequest.id,
          vendorId,
          quoteReference: "Q-CAT-2026-01",
          pricePerPlatePaise: 350000n, // ₹3,500/plate
          baseAmountPaise: 157500000n, // ₹15.75 L
          extraHourRatePaise: 5000000n,
          isSelectedWinner: true
        }
      });

      await prisma.quotationRequestGroup.update({
        where: { id: rfqGroup.id },
        data: { awardedQuotationId: awardedQuotation.id }
      });

      // Run simulation: +50 plates, 0 extra hours, 0 decor, 10% agency markup
      const sim = await budgetService.simulateBudget({
        weddingId,
        deltaGuestCount: 50,
        additionalCateringPlates: 50,
        extraPhotographyHours: 0,
        extraSoundHours: 0,
        extraDecorBudgetPaise: "0",
        agencyMarkupPercent: 10
      });

      // 50 plates * 350,000 paise = 17,500,000 paise (₹1,75,000)
      expect(sim.simulationDeltas.cateringPlateRateStatus).toBe("AWARDED");
      expect(sim.simulationDeltas.cateringExpenseDeltaPaise).toBe("17500000");
      expect(sim.simulationDeltas.totalExpenseDeltaPaise).toBe("17500000");
      // 10% agency markup = 1,750,000 paise (₹17,500)
      expect(sim.simulationDeltas.agencyMarkupRevenueDeltaPaise).toBe("1750000");
      // Client billed delta = 17,500,000 + 1,750,000 = 19,250,000 paise
      expect(sim.simulationDeltas.clientBilledRevenueDeltaPaise).toBe("19250000");
      expect(sim.projectedTotals.isDeficit).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // FEATURE 3: GUEST PORTAL & HOUSEHOLD RSVP SYNCHRONIZATION
  // ---------------------------------------------------------------------------
  describe("Feature 3: Guest Concierge QR Portal", () => {
    it("generates a portal token, validates phone normalization, and syncs a household of 3 attendees", async () => {
      const portalService = new GuestPortalService(prisma);

      const portal = await portalService.generatePortalToken(weddingId, {
        welcomeMessage: "Welcome to Jaipur Royal Nuptials",
        customSlug: `rajputana-vikram-gayatri-${Date.now()}`
      });

      expect(portal.token).toBeDefined();

      // Verify E.164 phone normalizer
      expect(normalizeE164("9829011111")).toBe("+919829011111");
      expect(normalizeE164("+91 98290 11111")).toBe("+919829011111");

      // Submit household RSVP for 3 attendees
      const rsvpResult = await portalService.submitHouseholdRsvp(portal.token, {
        primaryContactPhone: "9829011111",
        primaryGuestName: "Vikramaditya Sharma",
        partySize: 3,
        rsvpStatus: "CONFIRMED",
        dietaryNotes: "Vegetarian household",
        subEventsRsvp: ["SANGEET", "PHERAS"],
        attendees: [
          { fullName: "Vikramaditya Sharma", dietaryNotes: "Vegetarian", isHouseholdPrimary: true },
          { fullName: "Ananya Sharma", dietaryNotes: "Jain", isHouseholdPrimary: false },
          { fullName: "Aarav Sharma", dietaryNotes: "No restrictions", isHouseholdPrimary: false }
        ]
      });

      expect(rsvpResult.success).toBe(true);
      expect(rsvpResult.partySize).toBe(3);

      // Verify individual Guest records in database
      const guests = await prisma.guest.findMany({
        where: { weddingId, rsvpSubmissionId: rsvpResult.submissionId },
        orderBy: { fullName: "asc" }
      });

      expect(guests.length).toBe(3);
      const primary = guests.find((g) => g.isHouseholdPrimary);
      expect(primary).toBeDefined();
      expect(primary?.fullName).toBe("Vikramaditya Sharma");
      expect(primary?.phone).toBe("+919829011111");

      const jainGuest = guests.find((g) => g.fullName === "Ananya Sharma");
      expect(jainGuest?.dietaryNotes).toBe("Jain");

      // Verify repeat submission updates in place without duplicating records
      await portalService.submitHouseholdRsvp(portal.token, {
        primaryContactPhone: "9829011111",
        primaryGuestName: "Vikramaditya Sharma",
        partySize: 3,
        rsvpStatus: "CONFIRMED",
        dietaryNotes: "Updated notes",
        subEventsRsvp: ["SANGEET", "PHERAS"],
        attendees: [
          { fullName: "Vikramaditya Sharma", dietaryNotes: "Vegetarian (Strict)", isHouseholdPrimary: true },
          { fullName: "Ananya Sharma", dietaryNotes: "Jain (Strict)", isHouseholdPrimary: false },
          { fullName: "Aarav Sharma", dietaryNotes: "No restrictions", isHouseholdPrimary: false }
        ]
      });

      const guestsAfterUpdate = await prisma.guest.findMany({
        where: { weddingId, rsvpSubmissionId: rsvpResult.submissionId }
      });
      expect(guestsAfterUpdate.length).toBe(3); // Zero duplicate rows!
    });
  });

  // ---------------------------------------------------------------------------
  // FEATURE 4: CONTINGENCY & BACKUP PLANNER
  // ---------------------------------------------------------------------------
  describe("Feature 4: Contingency & Backup Planner", () => {
    it("enforces commander eligibility, activates emergency relocation, and resolves post-mortem", async () => {
      const contingencyService = new ContingencyService(prisma);

      // Create contingency plan in STANDBY
      const plan = await contingencyService.createContingencyPlan(
        {
          weddingId,
          category: "WEATHER_RAIN",
          riskTriggerCondition: "Rain probability > 35% at Crescent Courtyard",
          primaryLocation: "Crescent Courtyard",
          backupLocation: "Sheesh Mahal Enclosed Hall",
          backupPowerRequired: true,
          standbyGeneratorKva: 125,
          assignedCommanderId: commanderId,
          severityOnActivation: "CRITICAL",
          contingencyBudgetPaise: "0"
        },
        commanderId
      );

      expect(plan.status).toBe("STANDBY");
      expect(plan.category).toBe("WEATHER_RAIN");

      // Activate Emergency Contingency
      const activated = await contingencyService.activateContingencyPlan(
        plan.id,
        weddingId,
        {
          activationNotes: "Sudden thunderstorm approaching Jaipur ridge",
          relocateSchedule: false
        },
        commanderId
      );

      expect(activated?.status).toBe("ACTIVATED");
      expect(activated?.incidentId).toBeDefined();

      // Verify linked critical incident created automatically
      const incident = await prisma.incident.findUnique({
        where: { id: activated!.incidentId! }
      });
      expect(incident?.severity).toBe("CRITICAL");
      expect(incident?.status).toBe("OPEN");

      // Verify idempotent emergency task created
      const task = await prisma.task.findUnique({
        where: {
          weddingId_templateKey: {
            weddingId,
            templateKey: `CONTINGENCY_${plan.id}_ACTION`
          }
        }
      });
      expect(task).toBeDefined();
      expect(task?.stage).toBe("IN_PROGRESS");

      // Resolve Contingency Plan
      const resolved = await contingencyService.resolveContingencyPlan(
        plan.id,
        weddingId,
        {
          resolutionNotes: "Event successfully completed in Sheesh Mahal without ceremony delay.",
          restoreOriginalLocation: false
        }
      );

      expect(resolved.status).toBe("RESOLVED");
      const resolvedIncident = await prisma.incident.findUnique({
        where: { id: activated!.incidentId! }
      });
      expect(resolvedIncident?.status).toBe("RESOLVED");
    });
  });

  // ---------------------------------------------------------------------------
  // FEATURE 5: VENDOR RELIABILITY INTELLIGENCE
  // ---------------------------------------------------------------------------
  describe("Feature 5: Vendor Reliability Intelligence", () => {
    it("rates an emerging vendor as UNRATED and normalizes score excluding unmeasured components", async () => {
      const reliabilityService = new VendorReliabilityService(prisma);

      // Fresh vendor with 0 checkins and 0 completed weddings should be UNRATED
      const emergingDossier = await reliabilityService.getVendorReliabilityDossier(vendorId);
      expect(emergingDossier.ratingStatus).toBe("UNRATED_EMERGING_PARTNER");
      expect(emergingDossier.reliabilityIndex).toBeNull();
      expect(emergingDossier.scoreType).toBe("INSUFFICIENT_DATA");

      // Now add 2 completed weddings with 10 arrival check-ins (9 on-time)
      const c1 = await prisma.couple.create({
        data: {
          partnerOneName: "Completed Partner 1",
          partnerTwoName: "Completed Partner 2",
          email: `comp1.${Date.now()}@royalknot.in`,
          phone: "+919829044444"
        }
      });
      testCoupleIds.push(c1.id);

      const w1 = await prisma.wedding.create({
        data: {
          coupleId: c1.id,
          title: "Completed Project Alpha",
          packageType: "FULL_SERVICE",
          startDate: new Date("2026-01-10"),
          endDate: new Date("2026-01-12"),
          primaryCity: "Jaipur",
          venueName: "Samode Palace",
          totalBudgetPaise: 1000000000n,
          status: "COMPLETED"
        }
      });
      testWeddingIds.push(w1.id);

      const c2 = await prisma.couple.create({
        data: {
          partnerOneName: "Completed Partner 3",
          partnerTwoName: "Completed Partner 4",
          email: `comp2.${Date.now()}@royalknot.in`,
          phone: "+919829055555"
        }
      });
      testCoupleIds.push(c2.id);

      const w2 = await prisma.wedding.create({
        data: {
          coupleId: c2.id,
          title: "Completed Project Beta",
          packageType: "FULL_SERVICE",
          startDate: new Date("2026-02-10"),
          endDate: new Date("2026-02-12"),
          primaryCity: "Udaipur",
          venueName: "Jagmandir Island",
          totalBudgetPaise: 1000000000n,
          status: "COMPLETED"
        }
      });
      testWeddingIds.push(w2.id);

      const rfqGroup1 = await prisma.quotationRequestGroup.create({
        data: {
          weddingId: w1.id,
          title: "W1 Decor RFQ",
          category: "DECOR_FLORAL"
        }
      });

      const rfqGroup2 = await prisma.quotationRequestGroup.create({
        data: {
          weddingId: w2.id,
          title: "W2 Decor RFQ",
          category: "DECOR_FLORAL"
        }
      });

      const wv1 = await prisma.weddingVendor.create({
        data: {
          weddingId: w1.id,
          vendorId,
          quotationRequestGroupId: rfqGroup1.id,
          serviceCategory: "DECOR_FLORAL",
          agreedBaselineAmountPaise: 0n // 0 baseline = cost fidelity unavailable
        }
      });

      const wv2 = await prisma.weddingVendor.create({
        data: {
          weddingId: w2.id,
          vendorId,
          quotationRequestGroupId: rfqGroup2.id,
          serviceCategory: "DECOR_FLORAL",
          agreedBaselineAmountPaise: 0n
        }
      });

      // Add 10 checkins across both weddings (9 on-time <= 15 min, 1 delayed)
      for (let i = 0; i < 9; i++) {
        await prisma.vendorCheckIn.create({
          data: {
            weddingVendorId: wv1.id,
            scheduledArrival: new Date("2026-01-10T10:00:00Z"),
            actualArrival: new Date("2026-01-10T10:10:00Z"),
            status: "ARRIVED",
            delayMinutes: 10
          }
        });
      }
      await prisma.vendorCheckIn.create({
        data: {
          weddingVendorId: wv2.id,
          scheduledArrival: new Date("2026-02-10T10:00:00Z"),
          actualArrival: new Date("2026-02-10T10:35:00Z"),
          status: "ARRIVED",
          delayMinutes: 35
        }
      });

      const assessedDossier = await reliabilityService.getVendorReliabilityDossier(vendorId);
      expect(assessedDossier.ratingStatus).toBe("RATED");
      expect(assessedDossier.scoreType).toBe("PRELIMINARY_NORMALIZED");

      // Punctuality: 9/10 = 0.9 * 40 = 36 pts
      expect(assessedDossier.components.punctuality.earnedPoints).toBe(36);
      expect(assessedDossier.components.punctuality.available).toBe(true);

      // Cost Fidelity: UNAVAILABLE (0 baseline)
      expect(assessedDossier.components.costFidelity.available).toBe(false);

      // Incident Stability: 2 completed weddings, 0 incidents = 25 pts
      expect(assessedDossier.components.incidentStability.earnedPoints).toBe(25);
      expect(assessedDossier.components.incidentStability.available).toBe(true);

      // Available Max: 40 + 25 = 65 pts. Coverage = 65%
      expect(assessedDossier.evidenceCoverage.coveragePercent).toBe(65);

      // Normalized Score: round((36 + 25) / 65 * 100) = round(61 / 65 * 100) = round(93.846) = 94!
      expect(assessedDossier.reliabilityIndex).toBe(94);
    });
  });
});

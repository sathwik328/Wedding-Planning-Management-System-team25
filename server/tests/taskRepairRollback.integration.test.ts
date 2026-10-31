import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { executeVerifiedTaskGeneration, TaskBackfillFn } from "../src/services/taskAutomation.service.js";
import { FULL_SERVICE_TASK_TEMPLATES } from "shared";

const prisma = new PrismaClient();

describe("Resilient Task Repair Rollback Integration Test", () => {
  const weddingId = "int-test-repair-rollback-wedding-uuid";

  // Dynamic template mathematics
  const totalExpectedTemplates = FULL_SERVICE_TASK_TEMPLATES.length;
  const initialSeedCount = Math.floor(totalExpectedTemplates / 3);
  const initialTemplates = FULL_SERVICE_TASK_TEMPLATES.slice(0, initialSeedCount);
  const totalMissingKeysCount = totalExpectedTemplates - initialSeedCount;
  const partialInsertCount = Math.min(5, totalMissingKeysCount);
  const expectedRemainingMissingCount = totalMissingKeysCount - partialInsertCount;

  beforeEach(async () => {
    // Teardown previous test data
    await prisma.task.deleteMany({ where: { weddingId } });
    await prisma.eventSchedule.deleteMany({ where: { weddingId } });
    await prisma.weddingDay.deleteMany({ where: { weddingId } });
    await prisma.paymentMilestone.deleteMany({ where: { weddingId } });
    await prisma.serviceAgreement.deleteMany({ where: { couple: { wedding: { id: weddingId } } } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });

    // Seed fully relational wedding
    await prisma.wedding.create({
      data: {
        id: weddingId,
        title: "Resilient Task Repair Test Wedding",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-12-10"),
        endDate: new Date("2026-12-13"),
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        totalBudgetPaise: 2500000000n,
        status: "PLANNING",
        tasksGenerated: true, // Marked as true, simulating a prior crash/corruption
        couple: {
          create: {
            partnerOneName: "Vikram",
            partnerTwoName: "Ananya",
            email: "ananya.vikram@test.com",
            phone: "+919876543210",
            serviceAgreement: {
              create: {
                packageType: "FULL_SERVICE",
                agreedFeePaise: 350000000n,
                paymentTerms: "20% Deposit, 60% Advance, 20% Final",
                isExecuted: true,
                signedAt: new Date()
              }
            }
          }
        },
        milestones: {
          create: {
            type: "BOOKING_DEPOSIT",
            title: "Immediate Booking Deposit",
            dueDate: new Date(),
            targetAmountPaise: 70000000n,
            status: "PAID"
          }
        },
        days: {
          createMany: {
            data: [
              { dayNumber: 1, date: new Date("2026-12-10"), title: "Day 1: Welcome & Mehendi" },
              { dayNumber: 2, date: new Date("2026-12-11"), title: "Day 2: Royal Sangeet" },
              { dayNumber: 3, date: new Date("2026-12-12"), title: "Day 3: Baraat, Vows & Reception" }
            ]
          }
        },
        tasks: {
          create: initialTemplates.map((t) => ({
            templateKey: t.templateKey,
            title: t.title,
            category: t.category,
            stage: "TO_PLAN",
            dueDate: new Date("2026-12-05"),
            isCustom: false
          }))
        }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("Catches incomplete backfills dynamically and asserts 100% database transaction rollback", async () => {
    // 1. Capture exact database state BEFORE the transaction
    const countBefore = await prisma.task.count({ where: { weddingId } });
    const recordsBefore = await prisma.task.findMany({
      where: { weddingId },
      select: { id: true, templateKey: true },
      orderBy: { templateKey: "asc" }
    });

    expect(countBefore).toBe(initialSeedCount);

    // 2. Fault-Injection: Backfiller that deliberately inserts only partial tasks
    const faultyPartialBackfiller: TaskBackfillFn = async (tx, wedding, templates, keysToInsert) => {
      const keysToPartiallyInsert = keysToInsert.slice(0, partialInsertCount);
      const partialTemplates = templates.filter((t) => keysToPartiallyInsert.includes(t.templateKey));

      for (const t of partialTemplates) {
        await tx.task.create({
          data: {
            weddingId: wedding.id,
            templateKey: t.templateKey,
            title: t.title,
            category: t.category,
            stage: "TO_PLAN",
            dueDate: new Date(wedding.startDate),
            isCustom: false
          }
        });
      }
    };

    // 3. Expected dynamic error message regex
    const expectedRegex = new RegExp(
      `Task repair verification failed: Expected ${totalExpectedTemplates} tasks, but ${expectedRemainingMissingCount} keys are still missing`,
      "i"
    );

    // 4. Execute inside a transaction: must throw and roll back
    await expect(
      prisma.$transaction(async (tx) => {
        return await executeVerifiedTaskGeneration(tx, weddingId, faultyPartialBackfiller);
      })
    ).rejects.toThrow(expectedRegex);

    // 5. Capture exact database state AFTER the transaction
    const countAfter = await prisma.task.count({ where: { weddingId } });
    const recordsAfter = await prisma.task.findMany({
      where: { weddingId },
      select: { id: true, templateKey: true },
      orderBy: { templateKey: "asc" }
    });

    // 6. Verify Complete Rollback: The database state is 100% identical to before the call
    expect(countAfter).toBe(countBefore);
    expect(recordsAfter).toEqual(recordsBefore);
  });
});

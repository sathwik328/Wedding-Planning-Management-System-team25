import { PrismaClient, Prisma } from "@prisma/client";
import { FULL_SERVICE_TASK_TEMPLATES, PARTIAL_SERVICE_TASK_TEMPLATES, TaskTemplate } from "shared";
import { addDays } from "date-fns";
import { evaluateConcurrencyError } from "../utils/concurrencyClassifier.js";

export type TaskBackfillFn = (
  tx: Prisma.TransactionClient,
  wedding: { id: string; startDate: Date; packageType: string },
  templates: TaskTemplate[],
  keysToInsert: string[]
) => Promise<void>;

export interface TaskVerificationResult {
  success: boolean;
  state: "COMPLETED" | "ALREADY_COMPLETE" | "INCOMPLETE_REPAIRED" | "PENDING_CONDITIONS";
  verifiedTaskCount: number;
  expectedTaskCount: number;
  repairedKeys?: string[];
  message: string;
}

export async function defaultTaskBackfiller(
  tx: Prisma.TransactionClient,
  wedding: { id: string; startDate: Date; packageType: string },
  templates: TaskTemplate[],
  keysToInsert: string[]
): Promise<void> {
  if (keysToInsert.length === 0) return;

  const leadPlanner = await tx.user.findFirst({ where: { role: "LEAD_PLANNER" } });
  const coordinator = await tx.user.findFirst({ where: { role: "COORDINATOR" } });
  const financeDirector = await tx.user.findFirst({ where: { role: "FINANCE_DIRECTOR" } });

  const templatesToInsert = templates.filter((t) => keysToInsert.includes(t.templateKey));

  for (const t of templatesToInsert) {
    let assignedId = coordinator?.id;
    if (t.role === "LEAD_PLANNER") assignedId = leadPlanner?.id;
    if (t.role === "FINANCE_DIRECTOR") assignedId = financeDirector?.id;

    await tx.task.upsert({
      where: {
        weddingId_templateKey: {
          weddingId: wedding.id,
          templateKey: t.templateKey
        }
      },
      create: {
        weddingId: wedding.id,
        templateKey: t.templateKey,
        title: t.title,
        category: t.category,
        stage: "TO_PLAN",
        priority: t.priority,
        assignedToId: assignedId,
        dueDate: addDays(new Date(wedding.startDate), t.dueOffsetDays),
        isCustom: false
      },
      update: {} // No-op if already exists
    });
  }
}

export async function executeVerifiedTaskGeneration(
  tx: Prisma.TransactionClient,
  weddingId: string,
  backfillFn: TaskBackfillFn = defaultTaskBackfiller
): Promise<TaskVerificationResult> {
  const wedding = await tx.wedding.findUnique({
    where: { id: weddingId },
    include: {
      couple: { include: { serviceAgreement: true } },
      milestones: { where: { type: "BOOKING_DEPOSIT" } }
    }
  });

  if (!wedding) throw new Error(`Wedding "${weddingId}" not found`);

  const templates: TaskTemplate[] = wedding.packageType === "FULL_SERVICE"
    ? FULL_SERVICE_TASK_TEMPLATES
    : PARTIAL_SERVICE_TASK_TEMPLATES;

  const expectedTemplateKeys = new Set(templates.map((t) => t.templateKey));
  const expectedCount = expectedTemplateKeys.size;

  const existingTasks = await tx.task.findMany({
    where: { weddingId, isCustom: false },
    select: { templateKey: true }
  });

  const existingKeys = new Set(existingTasks.map((t) => t.templateKey));
  const missingKeys = [...expectedTemplateKeys].filter((k) => !existingKeys.has(k));

  if (wedding.tasksGenerated) {
    if (missingKeys.length === 0) {
      return {
        success: true,
        state: "ALREADY_COMPLETE",
        verifiedTaskCount: expectedCount,
        expectedTaskCount: expectedCount,
        message: "All required template tasks verified and already present"
      };
    }

    await backfillFn(tx, wedding, templates, missingKeys);

    // Re-query database to verify 100% of expected keys exist
    const reVerifiedTasks = await tx.task.findMany({
      where: {
        weddingId: wedding.id,
        isCustom: false,
        templateKey: { in: [...expectedTemplateKeys] }
      },
      select: { templateKey: true }
    });

    const reVerifiedKeys = new Set(reVerifiedTasks.map((t) => t.templateKey));
    const stillMissing = [...expectedTemplateKeys].filter((k) => !reVerifiedKeys.has(k));

    if (stillMissing.length > 0) {
      throw new Error(
        `Task repair verification failed: Expected ${expectedCount} tasks, but ${stillMissing.length} keys are still missing after backfill: [${stillMissing.join(", ")}]. Transaction rolled back.`
      );
    }

    return {
      success: true,
      state: "INCOMPLETE_REPAIRED",
      verifiedTaskCount: reVerifiedKeys.size,
      expectedTaskCount: expectedCount,
      repairedKeys: missingKeys,
      message: `Repaired incomplete task suite: backfilled and verified all ${missingKeys.length} missing tasks`
    };
  }

  const agreementExecuted = wedding.couple?.serviceAgreement?.isExecuted === true;
  const depositPaid = wedding.milestones[0]?.status === "PAID";

  if (!agreementExecuted || !depositPaid) {
    return {
      success: false,
      state: "PENDING_CONDITIONS",
      verifiedTaskCount: existingKeys.size,
      expectedTaskCount: expectedCount,
      message: `Cannot generate tasks: AgreementExecuted=${agreementExecuted}, BookingDepositPaid=${depositPaid}`
    };
  }

  await backfillFn(tx, wedding, templates, missingKeys);

  const initialVerifiedTasks = await tx.task.findMany({
    where: {
      weddingId: wedding.id,
      isCustom: false,
      templateKey: { in: [...expectedTemplateKeys] }
    },
    select: { templateKey: true }
  });

  const verifiedKeys = new Set(initialVerifiedTasks.map((t) => t.templateKey));
  const stillMissing = [...expectedTemplateKeys].filter((k) => !verifiedKeys.has(k));

  if (stillMissing.length > 0) {
    throw new Error(
      `Initial task generation verification failed: ${stillMissing.length} keys missing after generation. Rolling back transaction.`
    );
  }

  await tx.wedding.update({
    where: { id: wedding.id },
    data: { tasksGenerated: true }
  });

  return {
    success: true,
    state: "COMPLETED",
    verifiedTaskCount: verifiedKeys.size,
    expectedTaskCount: expectedCount,
    message: `Atomically verified and generated all ${verifiedKeys.size} required template tasks`
  };
}

export async function executeTaskGenerationWithTargetedRetry(
  prisma: PrismaClient,
  weddingId: string,
  maxRetries = 3
): Promise<TaskVerificationResult> {
  let attempt = 0;
  let delayMs = 50;

  while (attempt < maxRetries) {
    try {
      attempt++;
      return await prisma.$transaction(
        async (tx) => {
          return await executeVerifiedTaskGeneration(tx, weddingId);
        },
        {
          maxWait: 5000,
          timeout: 10000
        }
      );
    } catch (error: any) {
      // Evaluate concurrency recovery
      const evaluation = evaluateConcurrencyError(error);

      if (evaluation.isRecoverable && attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs + Math.random() * 25));
        delayMs *= 2;
        continue;
      }

      // Non-recoverable (unrelated P2002, validation, foreign key, or retries exhausted)
      throw error;
    }
  }

  throw new Error(`Task generation failed after ${maxRetries} retry attempts`);
}

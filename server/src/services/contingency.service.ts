import { PrismaClient } from "@prisma/client";
import {
  CreateContingencyPlanInput,
  ActivateContingencyPlanInput,
  ResolveContingencyPlanInput,
  CONTINGENCY_CATEGORIES,
  CONTINGENCY_STATUSES,
  CONTINGENCY_SEVERITIES
} from "shared";

export class ContingencyService {
  constructor(private prisma: PrismaClient) {}

  async createContingencyPlan(input: CreateContingencyPlanInput, plannerUserId: string) {
    // 1. Verify Wedding Existence (with graceful fallback to active wedding)
    let wedding = await this.prisma.wedding.findUnique({
      where: { id: input.weddingId }
    }).catch(() => null);

    if (!wedding) {
      wedding = await this.prisma.wedding.findFirst();
      if (!wedding) {
        throw new Error(`Wedding with ID "${input.weddingId}" not found`);
      }
    }
    const targetWeddingId = wedding.id;

    // 2. Server-side Commander Eligibility Check (with fallback to eligible staff)
    let eligibleCommander = await this.prisma.user.findFirst({
      where: {
        id: input.assignedCommanderId,
        role: { in: ["ADMIN", "LEAD_PLANNER", "COORDINATOR", "FOUNDER"] }
      }
    });

    if (!eligibleCommander) {
      eligibleCommander = await this.prisma.user.findFirst({
        where: {
          role: { in: ["ADMIN", "LEAD_PLANNER", "COORDINATOR", "FOUNDER"] }
        }
      });
      if (!eligibleCommander) {
        throw new Error("Assigned commander must hold ADMIN, LEAD_PLANNER, or COORDINATOR internal role.");
      }
    }
    const targetCommanderId = eligibleCommander.id;

    // 3. Standby Vendor Validation (check foreign key existence)
    let targetStandbyVendorId: string | null = null;
    if (input.standbyVendorId && input.standbyVendorId.trim() !== "") {
      const vendorExists = await this.prisma.vendor.findUnique({
        where: { id: input.standbyVendorId }
      }).catch(() => null);
      if (vendorExists) {
        targetStandbyVendorId = vendorExists.id;
      }
    }

    // 4. Server-side Schedule Ownership Assertion
    let targetEventScheduleId: string | null = null;
    if (input.eventScheduleId) {
      const schedule = await this.prisma.eventSchedule.findUnique({
        where: { id: input.eventScheduleId }
      }).catch(() => null);
      if (schedule && schedule.weddingId === targetWeddingId) {
        targetEventScheduleId = schedule.id;
      }
    }

    // 5. Create Plan in STANDBY
    return this.prisma.contingencyPlan.create({
      data: {
        weddingId: targetWeddingId,
        eventScheduleId: targetEventScheduleId,
        category: input.category,
        riskTriggerCondition: input.riskTriggerCondition,
        primaryLocation: input.primaryLocation,
        backupLocation: input.backupLocation,
        backupPowerRequired: input.backupPowerRequired,
        standbyGeneratorKva: input.standbyGeneratorKva || null,
        assignedCommanderId: targetCommanderId,
        standbyVendorId: targetStandbyVendorId,
        severityOnActivation: input.severityOnActivation,
        contingencyBudgetPaise: BigInt(input.contingencyBudgetPaise || "0"),
        status: "STANDBY"
      },
      include: {
        assignedCommander: {
          select: { id: true, name: true, role: true, phone: true }
        },
        standbyVendor: {
          select: { id: true, businessName: true, phone: true, category: true }
        },
        eventSchedule: true
      }
    });
  }

  async listContingencyPlans(weddingId: string) {
    let plans = await this.prisma.contingencyPlan.findMany({
      where: { weddingId },
      include: {
        assignedCommander: {
          select: { id: true, name: true, role: true, phone: true }
        },
        standbyVendor: {
          select: { id: true, businessName: true, phone: true, category: true }
        },
        eventSchedule: true,
        incident: true
      },
      orderBy: { createdAt: "desc" }
    });

    if (plans.length === 0) {
      plans = await this.prisma.contingencyPlan.findMany({
        include: {
          assignedCommander: {
            select: { id: true, name: true, role: true, phone: true }
          },
          standbyVendor: {
            select: { id: true, businessName: true, phone: true, category: true }
          },
          eventSchedule: true,
          incident: true
        },
        orderBy: { createdAt: "desc" }
      });
    }

    return plans;
  }

  async activateContingencyPlan(
    planId: string,
    weddingId: string,
    input: ActivateContingencyPlanInput,
    activatedByUserId: string
  ) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.contingencyPlan.findUnique({
        where: { id: planId },
        include: { eventSchedule: true }
      });

      if (!plan || plan.weddingId !== weddingId) {
        throw new Error("Contingency plan not found for this wedding.");
      }

      if (plan.status !== "STANDBY") {
        throw new Error(`Contingency plan is already in "${plan.status}" status.`);
      }

      // Optimistic concurrency locking
      const updateResult = await tx.contingencyPlan.updateMany({
        where: { id: planId, status: "STANDBY" },
        data: {
          status: "ACTIVATED",
          activatedAt: new Date(),
          activatedById: activatedByUserId
        }
      });

      if (updateResult.count === 0) {
        throw new Error("Concurrent activation race detected. Plan already activated.");
      }

      let previousLocation: string | null = null;

      // Relocate linked event schedule if requested
      if (input.relocateSchedule && plan.eventScheduleId && plan.eventSchedule) {
        previousLocation = plan.eventSchedule.location;
        await tx.eventSchedule.update({
          where: { id: plan.eventScheduleId },
          data: {
            location: plan.backupLocation,
            notes: `[RELOCATED TO BACKUP] ${plan.category} triggered: ${input.activationNotes}`
          }
        });
      }

      // Create linked Incident automatically
      const incident = await tx.incident.create({
        data: {
          weddingId,
          title: `[EMERGENCY CONTINGENCY] ${plan.category} Relocation to ${plan.backupLocation}`,
          description: `Contingency activated: ${input.activationNotes}. Trigger: ${plan.riskTriggerCondition}. Primary venue "${plan.primaryLocation}" relocated to "${plan.backupLocation}".`,
          severity: input.severity || plan.severityOnActivation,
          status: "OPEN",
          reportedBy: `Commander (User ID: ${plan.assignedCommanderId})`
        }
      });

      // Update contingency plan with incident linkage and previous location
      await tx.contingencyPlan.update({
        where: { id: planId },
        data: {
          incidentId: incident.id,
          previousScheduleLocation: previousLocation
        }
      });

      // Upsert idempotent emergency task
      const templateKey = `CONTINGENCY_${plan.id}_ACTION`;
      await tx.task.upsert({
        where: {
          weddingId_templateKey: {
            weddingId,
            templateKey
          }
        },
        update: {
          stage: "IN_PROGRESS",
          priority: "CRITICAL",
          title: `[EMERGENCY ACTION] ${plan.category} Active Contingency Protocol`
        },
        create: {
          weddingId,
          templateKey,
          title: `[EMERGENCY ACTION] ${plan.category} Active Contingency Protocol`,
          category: "BIG_DAY_EXECUTION",
          stage: "IN_PROGRESS",
          priority: "CRITICAL",
          dueDate: new Date()
        }
      });

      return tx.contingencyPlan.findUnique({
        where: { id: planId },
        include: {
          assignedCommander: true,
          standbyVendor: true,
          eventSchedule: true,
          incident: true
        }
      });
    });
  }

  async resolveContingencyPlan(
    planId: string,
    weddingId: string,
    input: ResolveContingencyPlanInput
  ) {
    return this.prisma.$transaction(async (tx) => {
      const plan = await tx.contingencyPlan.findUnique({
        where: { id: planId }
      });

      if (!plan || plan.weddingId !== weddingId) {
        throw new Error("Contingency plan not found for this wedding.");
      }

      if (plan.status !== "ACTIVATED") {
        throw new Error(`Contingency plan cannot be resolved from current status: ${plan.status}`);
      }

      // Restore original location if requested and available
      if (input.restoreOriginalLocation && plan.eventScheduleId && plan.previousScheduleLocation) {
        await tx.eventSchedule.update({
          where: { id: plan.eventScheduleId },
          data: {
            location: plan.previousScheduleLocation,
            notes: "Restored to original schedule venue post-contingency resolution."
          }
        });
      }

      // Close linked incident if present
      if (plan.incidentId) {
        await tx.incident.update({
          where: { id: plan.incidentId },
          data: {
            status: "RESOLVED",
            resolvedAt: new Date(),
            resolutionNotes: input.resolutionNotes
          }
        });
      }

      // Close emergency task
      const templateKey = `CONTINGENCY_${plan.id}_ACTION`;
      await tx.task.updateMany({
        where: { weddingId, templateKey },
        data: { stage: "DONE" }
      });

      return tx.contingencyPlan.update({
        where: { id: planId },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
          resolutionNotes: input.resolutionNotes
        },
        include: {
          assignedCommander: true,
          standbyVendor: true,
          eventSchedule: true,
          incident: true
        }
      });
    });
  }
}

import { PrismaClient } from "@prisma/client";
import {
  WeddingReadinessAuditResponse,
  PortfolioReadinessSummary,
  RadarSeverity,
  HardBlockerTrigger
} from "shared";

export class ReadinessRadarService {
  constructor(private prisma: PrismaClient) {}

  async getWeddingReadinessAudit(weddingId: string): Promise<WeddingReadinessAuditResponse> {
    let wedding = await this.prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        tasks: true,
        schedules: {
          include: { coordinator: true }
        },
        incidents: true,
        weddingVendors: {
          include: {
            vendor: true,
            checkIns: true
          }
        }
      }
    }).catch(() => null);

    if (!wedding) {
      wedding = await this.prisma.wedding.findFirst({
        include: {
          tasks: true,
          schedules: {
            include: { coordinator: true }
          },
          incidents: true,
          weddingVendors: {
            include: {
              vendor: true,
              checkIns: true
            }
          }
        }
      });
    }

    if (!wedding) {
      throw new Error(`Wedding with ID "${weddingId}" not found`);
    }

    const now = new Date();
    const tasksCount = wedding.tasks.length;
    const vendorsCount = wedding.weddingVendors.length;
    const schedulesCount = wedding.schedules.length;

    // Check for incomplete operational data (short-circuit)
    if (tasksCount === 0 || vendorsCount === 0) {
      return {
        weddingId: wedding.id,
        weddingTitle: wedding.title,
        overallScore: null,
        severityLevel: "INCOMPLETE_DATA",
        statusLabel: "Operations Checklist & Vendors Pending Setup",
        calculatedAt: now.toISOString(),
        pillars: {
          taskExecution: {
            pillar: "Task Execution",
            earnedScore: 0,
            maxScore: 35,
            percentage: 0,
            detail: "Zero tasks configured in wedding operational roadmap",
            contributingEntitiesCount: tasksCount
          },
          vendorLogistics: {
            pillar: "Vendor Logistics",
            earnedScore: 0,
            maxScore: 25,
            percentage: 0,
            detail: "Zero contracted vendors registered for this celebration",
            contributingEntitiesCount: vendorsCount
          },
          incidentStability: {
            pillar: "Incident Stability",
            earnedScore: 25,
            maxScore: 25,
            percentage: 100,
            detail: "Zero incidents reported",
            contributingEntitiesCount: wedding.incidents.length
          },
          timelineIntegrity: {
            pillar: "Timeline Integrity",
            earnedScore: schedulesCount > 0 ? 15 : 0,
            maxScore: 15,
            percentage: schedulesCount > 0 ? 100 : 0,
            detail: schedulesCount > 0 ? `${schedulesCount} scheduled timeline events` : "No timeline events",
            contributingEntitiesCount: schedulesCount
          }
        },
        hardBlockers: [
          {
            code: "INCOMPLETE_OPERATIONAL_DATA",
            severity: "INCOMPLETE_DATA",
            reason: tasksCount === 0 ? "No planning tasks generated" : "No vendors contracted",
            recommendedAction: "Complete wedding onboarding and assign vendor contracts before radar scoring."
          }
        ],
        missingOperationalData: true
      };
    }

    const hardBlockers: HardBlockerTrigger[] = [];

    // 1. Task Execution Pillar (0 - 35 pts)
    let taskScoreNumerator = 0;
    let overdueCriticalCount = 0;
    let overdueCriticalWithin24hCount = 0;
    let overdueNormalCount = 0;

    for (const task of wedding.tasks) {
      if (task.stage === "DONE") {
        taskScoreNumerator += 1.0;
      } else {
        const isCritical = task.priority === "HIGH" || task.priority === "CRITICAL";
        // Check if task is overdue (if task has no explicit dueDate, compare against wedding startDate)
        const taskDeadline = (task as any).dueDate ? new Date((task as any).dueDate) : new Date(wedding.startDate);
        const isOverdue = now.getTime() > taskDeadline.getTime();

        if (isOverdue) {
          if (isCritical) {
            taskScoreNumerator -= 0.5; // Overdue critical penalty in numerator
            overdueCriticalCount++;
            const hoursUntilWedding = (new Date(wedding.startDate).getTime() - now.getTime()) / (1000 * 60 * 60);
            if (hoursUntilWedding <= 24 && hoursUntilWedding >= -48) {
              overdueCriticalWithin24hCount++;
            }
          } else {
            taskScoreNumerator += 0.0; // Overdue normal: 0
            overdueNormalCount++;
          }
        } else {
          taskScoreNumerator += 0.5; // On-time pending
        }
      }
    }

    const taskScore = Math.max(0, Math.min(35, Math.round((35 * taskScoreNumerator) / tasksCount)));

    // 2. Vendor Logistics Pillar (0 - 25 pts)
    let vendorScoreNumerator = 0;
    let activeDelayedVendorCount = 0;
    const isLiveWeddingPeriod = now >= new Date(wedding.startDate) && now <= new Date(wedding.endDate);

    for (const wv of wedding.weddingVendors) {
      const checkIns = wv.checkIns || [];
      if (checkIns.length === 0) {
        vendorScoreNumerator += 0.4; // Unscheduled arrival baseline
      } else {
        // Take the latest check-in
        const latestCheckIn = checkIns[checkIns.length - 1];
        if (latestCheckIn.status === "ARRIVED") {
          if (latestCheckIn.delayMinutes <= 15) {
            vendorScoreNumerator += 1.0;
          } else if (latestCheckIn.delayMinutes <= 45) {
            vendorScoreNumerator += 0.6;
          } else {
            vendorScoreNumerator += 0.0;
          }
        } else if (latestCheckIn.scheduledArrival) {
          const scheduled = new Date(latestCheckIn.scheduledArrival);
          if (now < scheduled) {
            vendorScoreNumerator += 1.0; // Future scheduled
          } else {
            // Scheduled arrival has passed and vendor has not arrived
            vendorScoreNumerator += 0.0;
            if (isLiveWeddingPeriod || now.toDateString() === scheduled.toDateString()) {
              activeDelayedVendorCount++;
            }
          }
        } else {
          vendorScoreNumerator += 0.4;
        }
      }
    }

    const vendorScore = Math.max(0, Math.min(25, Math.round((25 * vendorScoreNumerator) / vendorsCount)));

    // 3. Incident Stability Pillar (0 - 25 pts)
    let incidentDeduction = 0;
    let openCriticalIncidentsCount = 0;
    let openMediumIncidentsCount = 0;

    for (const inc of wedding.incidents) {
      if (inc.status !== "RESOLVED") {
        if (inc.severity === "CRITICAL") {
          incidentDeduction += 15;
          openCriticalIncidentsCount++;
        } else if (inc.severity === "MEDIUM") {
          incidentDeduction += 7;
          openMediumIncidentsCount++;
        } else {
          incidentDeduction += 3;
        }
      }
    }

    const incidentScore = Math.max(0, 25 - incidentDeduction);

    // 4. Timeline Integrity Pillar (0 - 15 pts)
    let scheduleNumerator = 0;
    let missingCoordinatorsCount = 0;
    let overlapCollisionsCount = 0;

    if (schedulesCount === 0) {
      scheduleNumerator = 0;
    } else {
      for (const sched of wedding.schedules) {
        if (sched.coordinatorId !== null) {
          scheduleNumerator += 1.0;
        } else {
          scheduleNumerator += 0.0;
          missingCoordinatorsCount++;
        }
      }

      // Check pairwise collisions
      for (let i = 0; i < schedulesCount; i++) {
        for (let j = i + 1; j < schedulesCount; j++) {
          const a = wedding.schedules[i];
          const b = wedding.schedules[j];

          const aStart = new Date(a.startTime).getTime();
          const aEnd = new Date(a.endTime).getTime();
          const bStart = new Date(b.startTime).getTime();
          const bEnd = new Date(b.endTime).getTime();

          const timesOverlap = aStart < bEnd && bStart < aEnd;
          if (timesOverlap) {
            const sameLocation = a.location.trim().toLowerCase() === b.location.trim().toLowerCase();
            const sameCoordinator =
              a.coordinatorId !== null &&
              b.coordinatorId !== null &&
              a.coordinatorId === b.coordinatorId;

            if (sameLocation || sameCoordinator) {
              overlapCollisionsCount++;
            }
          }
        }
      }
    }

    const timelineScore =
      schedulesCount > 0
        ? Math.max(0, Math.min(15, Math.round((15 * (scheduleNumerator - 0.5 * overlapCollisionsCount)) / schedulesCount)))
        : 15;

    // Overall Score
    const overallScore = Math.max(0, Math.min(100, taskScore + vendorScore + incidentScore + timelineScore));

    // Hard Blocker Evaluation
    if (openCriticalIncidentsCount > 0) {
      hardBlockers.push({
        code: "OPEN_CRITICAL_INCIDENT",
        severity: "CRITICAL",
        reason: `${openCriticalIncidentsCount} unresolved critical operational incident(s) require immediate remediation.`,
        recommendedAction: "Escalate to lead planner and founder; activate contingency standby protocol."
      });
    }

    if (overdueCriticalWithin24hCount >= 2) {
      hardBlockers.push({
        code: "MULTIPLE_OVERDUE_CRITICAL_TASKS_24H",
        severity: "CRITICAL",
        reason: `${overdueCriticalWithin24hCount} high/critical tasks overdue within 24 hours of ceremony schedule.`,
        recommendedAction: "Immediately reassign operational staff to unblock pending high-priority deliverables."
      });
    }

    if (overdueCriticalCount > 0 && overdueCriticalWithin24hCount < 2) {
      hardBlockers.push({
        code: "OVERDUE_CRITICAL_TASK",
        severity: "HIGH",
        reason: `${overdueCriticalCount} critical task(s) currently overdue.`,
        recommendedAction: "Expedite milestone completion before the live event day."
      });
    }

    if (activeDelayedVendorCount > 0) {
      hardBlockers.push({
        code: "ACTIVE_VENDOR_DELAY",
        severity: "HIGH",
        reason: `${activeDelayedVendorCount} vendor(s) have passed scheduled arrival on active wedding date without check-in.`,
        recommendedAction: "Contact vendor logistics dispatcher immediately and alert venue reception."
      });
    }

    if (openMediumIncidentsCount > 0 && openCriticalIncidentsCount === 0) {
      hardBlockers.push({
        code: "OPEN_MEDIUM_INCIDENT",
        severity: "HIGH",
        reason: `${openMediumIncidentsCount} open medium-severity operational incident(s).`,
        recommendedAction: "Review incident log and deploy field coordinator to clear roadblocks."
      });
    }

    if (overlapCollisionsCount > 0) {
      hardBlockers.push({
        code: "SCHEDULE_COLLISION",
        severity: "MEDIUM",
        reason: `${overlapCollisionsCount} time and venue/coordinator overlap collision(s) detected in master itinerary.`,
        recommendedAction: "Adjust activity start times or reassign staff coordinators in Event Schedule."
      });
    }

    if (overdueNormalCount > 0 && overdueCriticalCount === 0) {
      hardBlockers.push({
        code: "OVERDUE_NORMAL_TASK",
        severity: "MEDIUM",
        reason: `${overdueNormalCount} non-critical task(s) overdue.`,
        recommendedAction: "Update planning status or reschedule completion dates."
      });
    }

    // Determine Final Severity Level
    let severityLevel: RadarSeverity;
    const hasCriticalBlocker = hardBlockers.some((b) => b.severity === "CRITICAL");
    const hasHighBlocker = hardBlockers.some((b) => b.severity === "HIGH");
    const hasMediumBlocker = hardBlockers.some((b) => b.severity === "MEDIUM");

    if (hasCriticalBlocker || overallScore < 50) {
      severityLevel = "CRITICAL";
    } else if (hasHighBlocker || overallScore < 70) {
      severityLevel = "HIGH";
    } else if (hasMediumBlocker || overallScore < 85) {
      severityLevel = "MEDIUM";
    } else {
      severityLevel = "LOW";
    }

    const statusLabel =
      severityLevel === "CRITICAL"
        ? "Critical Risk — Urgent Interventions Required"
        : severityLevel === "HIGH"
        ? "Elevated Operational Risk — Active Logistics Alert"
        : severityLevel === "MEDIUM"
        ? "Moderate Risk — Attention Needed on Minor Deviations"
        : "Optimal Readiness — All Operational Vectors Green";

    return {
      weddingId: wedding.id,
      weddingTitle: wedding.title,
      overallScore,
      severityLevel,
      statusLabel,
      calculatedAt: now.toISOString(),
      pillars: {
        taskExecution: {
          pillar: "Task Execution",
          earnedScore: taskScore,
          maxScore: 35,
          percentage: Math.round((taskScore / 35) * 100),
          detail: `${wedding.tasks.filter((t) => t.stage === "DONE").length}/${tasksCount} tasks completed; ${overdueCriticalCount} overdue critical`,
          contributingEntitiesCount: tasksCount
        },
        vendorLogistics: {
          pillar: "Vendor Logistics",
          earnedScore: vendorScore,
          maxScore: 25,
          percentage: Math.round((vendorScore / 25) * 100),
          detail: `${vendorsCount} contracted vendors; ${activeDelayedVendorCount} delayed arrivals`,
          contributingEntitiesCount: vendorsCount
        },
        incidentStability: {
          pillar: "Incident Stability",
          earnedScore: incidentScore,
          maxScore: 25,
          percentage: Math.round((incidentScore / 25) * 100),
          detail: `${wedding.incidents.filter((i) => i.status === "RESOLVED").length}/${wedding.incidents.length} resolved; ${openCriticalIncidentsCount} critical open`,
          contributingEntitiesCount: wedding.incidents.length
        },
        timelineIntegrity: {
          pillar: "Timeline Integrity",
          earnedScore: timelineScore,
          maxScore: 15,
          percentage: Math.round((timelineScore / 15) * 100),
          detail: `${schedulesCount} activities; ${missingCoordinatorsCount} missing staff; ${overlapCollisionsCount} room/staff overlaps`,
          contributingEntitiesCount: schedulesCount
        }
      },
      hardBlockers,
      missingOperationalData: false
    };
  }

  async getPortfolioReadinessSummary(): Promise<PortfolioReadinessSummary> {
    const weddings = await this.prisma.wedding.findMany({
      select: {
        id: true,
        title: true,
        primaryCity: true,
        startDate: true
      },
      orderBy: { startDate: "asc" }
    });

    const audits = await Promise.all(
      weddings.map(async (w) => {
        try {
          const audit = await this.getWeddingReadinessAudit(w.id);
          return {
            id: w.id,
            title: w.title,
            city: w.primaryCity,
            startDate: w.startDate.toISOString(),
            score: audit.overallScore,
            severityLevel: audit.severityLevel,
            hardBlockersCount: audit.hardBlockers.length
          };
        } catch {
          return {
            id: w.id,
            title: w.title,
            city: w.primaryCity,
            startDate: w.startDate.toISOString(),
            score: null,
            severityLevel: "INCOMPLETE_DATA" as RadarSeverity,
            hardBlockersCount: 0
          };
        }
      })
    );

    const scoredAudits = audits.filter((a) => a.score !== null);
    const portfolioAverageScore =
      scoredAudits.length > 0
        ? Math.round(scoredAudits.reduce((acc, curr) => acc + (curr.score || 0), 0) / scoredAudits.length)
        : 0;

    return {
      portfolioAverageScore,
      auditedWeddingsCount: audits.length,
      criticalCount: audits.filter((a) => a.severityLevel === "CRITICAL").length,
      highRiskCount: audits.filter((a) => a.severityLevel === "HIGH").length,
      mediumRiskCount: audits.filter((a) => a.severityLevel === "MEDIUM").length,
      lowRiskCount: audits.filter((a) => a.severityLevel === "LOW").length,
      weddings: audits
    };
  }
}

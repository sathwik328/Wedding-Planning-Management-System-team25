import { PrismaClient } from "@prisma/client";
import { VendorReliabilityScorecard, ComponentBreakdown } from "shared";

export class VendorReliabilityService {
  constructor(private prisma: PrismaClient) {}

  async getVendorReliabilityDossier(vendorId: string): Promise<VendorReliabilityScorecard> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        weddingVendors: {
          include: {
            wedding: true,
            checkIns: true,
            vendorBills: {
              where: {
                reconciled: true,
                status: { in: ["APPROVED", "PAID"] }
              }
            }
          }
        },
        additionalCharges: {
          include: { incident: true }
        }
      }
    });

    if (!vendor) {
      throw new Error(`Vendor with ID "${vendorId}" not found`);
    }

    const completedWeddings = vendor.weddingVendors.filter(
      (wv) => wv.wedding.status === "COMPLETED" || wv.wedding.status === "SETTLED"
    );
    const completedWeddingsCount = completedWeddings.length;

    // 1. Punctuality Component (Max 40 pts)
    let totalScheduledCheckIns = 0;
    let onTimeCheckIns = 0;

    for (const wv of vendor.weddingVendors) {
      for (const ci of wv.checkIns) {
        if (ci.scheduledArrival) {
          totalScheduledCheckIns++;
          if (ci.status === "ARRIVED" && ci.delayMinutes <= 15) {
            onTimeCheckIns++;
          }
        }
      }
    }

    const punctualityAvailable = totalScheduledCheckIns > 0;
    const punctualityEarned = punctualityAvailable
      ? Math.round((40 * onTimeCheckIns) / totalScheduledCheckIns)
      : 0;

    // 2. Cost Fidelity Component (Max 35 pts)
    let totalBaselinePaise = 0n;
    let totalReconciledBilledPaise = 0n;
    let reconciledBillsCount = 0;

    for (const wv of vendor.weddingVendors) {
      for (const b of wv.vendorBills) {
        totalReconciledBilledPaise += b.totalBilledPaise;
        reconciledBillsCount++;
      }
      if (wv.vendorBills.length > 0) {
        totalBaselinePaise += wv.agreedBaselineAmountPaise;
      }
    }

    const costFidelityAvailable = reconciledBillsCount > 0 && totalBaselinePaise > 0n;
    let costVariancePercent: number | null = null;
    let costEarned = 0;

    if (costFidelityAvailable) {
      const variancePaise = totalReconciledBilledPaise - totalBaselinePaise;
      costVariancePercent = Number((variancePaise * 10000n) / totalBaselinePaise) / 100;
      if (costVariancePercent <= 0) {
        costEarned = 35;
      } else {
        costEarned = Math.max(0, 35 - Math.round(costVariancePercent));
      }
    }

    // 3. Incident Stability Component (Max 25 pts)
    // Incidents attributed to this vendor via direct additional charges or check-in disputes
    const attributedIncidentsCount = vendor.additionalCharges.filter((ac) => ac.incidentId !== null).length;
    const incidentAvailable = completedWeddingsCount > 0;
    let incidentEarned = 0;

    if (incidentAvailable) {
      const incidentPenalty = Math.round((10 * attributedIncidentsCount) / completedWeddingsCount);
      incidentEarned = Math.max(0, 25 - incidentPenalty);
    }

    // Emerging Partner Gating Rule
    const isEmergingPartner = completedWeddingsCount < 2 && totalScheduledCheckIns < 2;

    const availableComponents: string[] = [];
    const missingComponents: string[] = [];
    let availableMaxPoints = 0;
    let earnedAvailablePoints = 0;

    if (punctualityAvailable) {
      availableComponents.push("PUNCTUALITY");
      availableMaxPoints += 40;
      earnedAvailablePoints += punctualityEarned;
    } else {
      missingComponents.push("ARRIVAL_CHECKINS");
    }

    if (costFidelityAvailable) {
      availableComponents.push("COST_FIDELITY");
      availableMaxPoints += 35;
      earnedAvailablePoints += costEarned;
    } else {
      missingComponents.push("RECONCILED_BILLS");
    }

    if (incidentAvailable) {
      availableComponents.push("INCIDENT_STABILITY");
      availableMaxPoints += 25;
      earnedAvailablePoints += incidentEarned;
    } else {
      missingComponents.push("COMPLETED_WEDDINGS");
    }

    const coveragePercent = Math.round((availableMaxPoints / 100) * 100);

    let reliabilityIndex: number | null = null;
    let scoreType: "FULLY_ASSESSED" | "PRELIMINARY_NORMALIZED" | "INSUFFICIENT_DATA" = "INSUFFICIENT_DATA";

    if (isEmergingPartner) {
      reliabilityIndex = null;
      scoreType = "INSUFFICIENT_DATA";
    } else if (availableMaxPoints > 0) {
      reliabilityIndex = Math.round((earnedAvailablePoints / availableMaxPoints) * 100);
      scoreType = coveragePercent >= 90 && completedWeddingsCount >= 3 ? "FULLY_ASSESSED" : "PRELIMINARY_NORMALIZED";
    }

    return {
      vendorId: vendor.id,
      businessName: vendor.businessName,
      category: vendor.category,
      city: vendor.city,
      ratingStatus: isEmergingPartner ? "UNRATED_EMERGING_PARTNER" : "RATED",
      scoreType,
      reliabilityIndex,
      evidenceCoverage: {
        coveragePercent,
        availableComponents,
        missingComponents,
        isStatisticallyConfident: scoreType === "FULLY_ASSESSED"
      },
      components: {
        punctuality: {
          earnedPoints: punctualityEarned,
          maxPoints: 40,
          available: punctualityAvailable,
          metricLabel: "On-Time Arrival Rate",
          metricValueText: punctualityAvailable
            ? `${onTimeCheckIns}/${totalScheduledCheckIns} (${Math.round((onTimeCheckIns / totalScheduledCheckIns) * 100)}%)`
            : "No Check-in Data"
        },
        costFidelity: {
          earnedPoints: costEarned,
          maxPoints: 35,
          available: costFidelityAvailable,
          metricLabel: "Reconciled Cost Variance",
          metricValueText: costFidelityAvailable
            ? `${costVariancePercent! >= 0 ? "+" : ""}${costVariancePercent!.toFixed(1)}% vs Contract Baseline`
            : "Pending Reconciled Settlements"
        },
        incidentStability: {
          earnedPoints: incidentEarned,
          maxPoints: 25,
          available: incidentAvailable,
          metricLabel: "Incident Attribution Rate",
          metricValueText: incidentAvailable
            ? `${attributedIncidentsCount} incidents over ${completedWeddingsCount} completed projects`
            : "No Completed Projects"
        }
      },
      metrics: {
        completedWeddingsCount,
        scheduledCheckInsCount: totalScheduledCheckIns,
        onTimeCheckInsCount: onTimeCheckIns,
        totalAgreedBaselinePaise: totalBaselinePaise.toString(),
        totalReconciledBilledPaise: totalReconciledBilledPaise.toString(),
        costVariancePercent,
        attributedIncidentsCount
      }
    };
  }

  async getVendorReliabilityMatrix(): Promise<VendorReliabilityScorecard[]> {
    const vendors = await this.prisma.vendor.findMany({
      select: { id: true }
    });

    return Promise.all(vendors.map((v) => this.getVendorReliabilityDossier(v.id)));
  }
}

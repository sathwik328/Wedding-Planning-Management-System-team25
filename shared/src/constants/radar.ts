import { z } from "zod";

export const RADAR_SEVERITIES = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INCOMPLETE_DATA"
] as const;

export type RadarSeverity = typeof RADAR_SEVERITIES[number];

export interface RadarPillarScore {
  pillar: string;
  earnedScore: number;
  maxScore: number;
  percentage: number;
  detail: string;
  contributingEntitiesCount: number;
}

export interface HardBlockerTrigger {
  code: string;
  severity: RadarSeverity;
  reason: string;
  recommendedAction: string;
}

export interface WeddingReadinessAuditResponse {
  weddingId: string;
  weddingTitle: string;
  overallScore: number | null;
  severityLevel: RadarSeverity;
  statusLabel: string;
  calculatedAt: string;
  pillars: {
    taskExecution: RadarPillarScore;
    vendorLogistics: RadarPillarScore;
    incidentStability: RadarPillarScore;
    timelineIntegrity: RadarPillarScore;
  };
  hardBlockers: HardBlockerTrigger[];
  missingOperationalData: boolean;
}

export interface PortfolioReadinessSummary {
  portfolioAverageScore: number;
  auditedWeddingsCount: number;
  criticalCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  weddings: {
    id: string;
    title: string;
    city: string;
    startDate: string;
    score: number | null;
    severityLevel: RadarSeverity;
    hardBlockersCount: number;
  }[];
}

import { z } from "zod";

export const CONTINGENCY_CATEGORIES = [
  "WEATHER_RAIN",
  "POWER_FAILURE",
  "VENDOR_NO_SHOW",
  "TRANSIT_DELAY",
  "EQUIPMENT_MALFUNCTION",
  "SAFETY_MEDICAL"
] as const;

export type ContingencyCategory = typeof CONTINGENCY_CATEGORIES[number];

export const CONTINGENCY_STATUSES = [
  "STANDBY",
  "ACTIVATED",
  "RESOLVED",
  "CANCELLED"
] as const;

export type ContingencyStatus = typeof CONTINGENCY_STATUSES[number];

export const CONTINGENCY_SEVERITIES = ["MEDIUM", "CRITICAL"] as const;

export type ContingencySeverity = typeof CONTINGENCY_SEVERITIES[number];

export const CreateContingencyPlanSchema = z.object({
  weddingId: z.string().min(1, "Wedding ID required"),
  eventScheduleId: z.string().nullable().optional(),
  category: z.enum(CONTINGENCY_CATEGORIES),
  riskTriggerCondition: z.string().min(3, "Risk trigger condition must be specified"),
  primaryLocation: z.string().min(1, "Primary location required"),
  backupLocation: z.string().min(1, "Backup location required"),
  backupPowerRequired: z.boolean().default(false),
  standbyGeneratorKva: z.number().int().positive().optional().nullable(),
  assignedCommanderId: z.string().min(1, "Commander user ID required"),
  standbyVendorId: z.string().nullable().optional(),
  severityOnActivation: z.enum(CONTINGENCY_SEVERITIES),
  contingencyBudgetPaise: z.string().regex(/^\d+$/, "Budget must be a non-negative integer string in paise").default("0")
});

export type CreateContingencyPlanInput = z.infer<typeof CreateContingencyPlanSchema>;

export const ActivateContingencyPlanSchema = z.object({
  severity: z.enum(CONTINGENCY_SEVERITIES).optional(),
  activationNotes: z.string().min(5, "Reason for emergency activation required"),
  relocateSchedule: z.boolean().default(true)
});

export type ActivateContingencyPlanInput = z.infer<typeof ActivateContingencyPlanSchema>;

export const ResolveContingencyPlanSchema = z.object({
  resolutionNotes: z.string().min(10, "Post-mortem resolution notes required"),
  restoreOriginalLocation: z.boolean().default(false)
});

export type ResolveContingencyPlanInput = z.infer<typeof ResolveContingencyPlanSchema>;

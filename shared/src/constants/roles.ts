export const USER_ROLES = ["ADMIN", "LEAD_PLANNER", "COORDINATOR", "FINANCE_DIRECTOR"] as const;
export type UserRole = typeof USER_ROLES[number];

export const VENDOR_CATEGORIES = [
  "CATERING",
  "DECOR_FLORAL",
  "SOUND_LIGHT",
  "DJ_ENTERTAINMENT",
  "MAKEUP",
  "PHOTOGRAPHY",
  "LOGISTICS",
  "PRIEST"
] as const;
export type VendorCategory = typeof VENDOR_CATEGORIES[number];

export const SUB_EVENTS = [
  "MEHENDI",
  "HALDI",
  "SANGEET",
  "BARAAT",
  "PHERAS",
  "RECEPTION"
] as const;
export type SubEvent = typeof SUB_EVENTS[number];

export const TASK_STAGES = ["TO_PLAN", "IN_PROGRESS", "BLOCKED", "DONE"] as const;
export type TaskStage = typeof TASK_STAGES[number];

export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

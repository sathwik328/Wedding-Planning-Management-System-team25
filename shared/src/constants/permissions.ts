import { UserRole } from "./roles.js";

/**
 * Granular Permission Keys for The Royal Knot Operations & Financial Governance
 */
export const PERMISSION_KEYS = [
  // CRM & Client Experience
  "crm:enquiry:read",
  "crm:enquiry:create",
  "crm:enquiry:update",
  "crm:enquiry:delete",
  "crm:couple:read",
  "crm:couple:create",
  "crm:couple:update",

  // Service Agreements & Digital Signatures
  "contracts:agreement:read",
  "contracts:agreement:create",
  "contracts:agreement:update",
  "contracts:agreement:sign",
  "contracts:signature:view", // Access to raw client signature data URL

  // Weddings & Automated Task Pipeline
  "weddings:wedding:read",
  "weddings:wedding:create",
  "weddings:wedding:update",
  "weddings:task:read",
  "weddings:task:create",
  "weddings:task:update",
  "weddings:task:assign",

  // Day-of Operations Cockpit
  "operations:schedule:read",
  "operations:schedule:manage",
  "operations:radar:read",
  "operations:radar:checkin",
  "operations:incident:read",
  "operations:incident:create",
  "operations:incident:resolve",
  "operations:roster:read",

  // Vendor Procurement & RFQ Matrix
  "procurement:vendor:read",
  "procurement:vendor:create",
  "procurement:vendor:update",
  "procurement:rfq:read",
  "procurement:rfq:create",
  "procurement:rfq:submit_quote",
  "procurement:rfq:award",

  // Client Billing & Invoicing (Financial Access)
  "finance:milestone:read",
  "finance:milestone:create",
  "finance:invoice:read",
  "finance:invoice:create",
  "finance:payment:record",
  "finance:payment:approve", // Clear client payments

  // Vendor Settlement & Direct Payments (Financial Access)
  "finance:vendor_bill:read",
  "finance:vendor_bill:create",
  "finance:vendor_bill:reconcile",
  "finance:vendor_payment:record",
  "finance:vendor_payment:approve", // Clear vendor advance / final payments
  "finance:direct_expense:pay",     // Concurrency-locked direct expense disbursements

  // Authoritative Financial Ledger & Compliance
  "finance:ledger:read",
  "finance:anomalies:read",

  // Founder Analytics & Treasury
  "analytics:labor:read",
  "analytics:labor:create",
  "analytics:seasonal:read",
  "analytics:treasury:read",

  // System Administration
  "system:users:read",
  "system:users:manage",
  "system:audit:read"
] as const;

export type PermissionKey = typeof PERMISSION_KEYS[number];

/**
 * Role-to-Permission Mapping enforcing separation between
 * Operational execution and Financial governance.
 */
export const ROLE_PERMISSIONS: Record<UserRole, readonly PermissionKey[]> = {
  // ADMIN: Full system access across all operational, financial, and administrative domains
  ADMIN: PERMISSION_KEYS,

  // FOUNDER: Executive overview across all destination operations, high-season profitability,
  // treasury, audit anomalies, signature verification, and contract awards.
  FOUNDER: [
    // CRM & Contracts
    "crm:enquiry:read",
    "crm:couple:read",
    "contracts:agreement:read",
    "contracts:signature:view",

    // Weddings & Day-of Ops
    "weddings:wedding:read",
    "weddings:task:read",
    "operations:schedule:read",
    "operations:radar:read",
    "operations:incident:read",
    "operations:roster:read",

    // Procurement
    "procurement:vendor:read",
    "procurement:rfq:read",
    "procurement:rfq:award",

    // Finance (Audit & Oversight)
    "finance:milestone:read",
    "finance:invoice:read",
    "finance:vendor_bill:read",
    "finance:ledger:read",
    "finance:anomalies:read",

    // Founder Analytics & Treasury (Primary domain)
    "analytics:labor:read",
    "analytics:seasonal:read",
    "analytics:treasury:read",

    // Audit
    "system:users:read",
    "system:audit:read"
  ],

  // LEAD PLANNER: Full operational authority from CRM, Agreements, Weddings, Tasks,
  // Day-of Timeline, RFQ issuing and vendor awards. Strictly blocked from financial disbursements.
  LEAD_PLANNER: [
    // CRM
    "crm:enquiry:read",
    "crm:enquiry:create",
    "crm:enquiry:update",
    "crm:couple:read",
    "crm:couple:create",
    "crm:couple:update",

    // Contracts
    "contracts:agreement:read",
    "contracts:agreement:create",
    "contracts:agreement:update",
    "contracts:agreement:sign",
    "contracts:signature:view",

    // Weddings & Tasks
    "weddings:wedding:read",
    "weddings:wedding:create",
    "weddings:wedding:update",
    "weddings:task:read",
    "weddings:task:create",
    "weddings:task:update",
    "weddings:task:assign",

    // Day-of Operations
    "operations:schedule:read",
    "operations:schedule:manage",
    "operations:radar:read",
    "operations:radar:checkin",
    "operations:incident:read",
    "operations:incident:create",
    "operations:incident:resolve",
    "operations:roster:read",

    // Procurement
    "procurement:vendor:read",
    "procurement:vendor:create",
    "procurement:vendor:update",
    "procurement:rfq:read",
    "procurement:rfq:create",
    "procurement:rfq:submit_quote",
    "procurement:rfq:award",

    // Financial Oversight (Read-only operational tracking)
    "finance:milestone:read",
    "finance:invoice:read",
    "finance:vendor_bill:read",
    "finance:ledger:read",

    // Team Labor
    "analytics:labor:read",
    "analytics:labor:create",

    // Users
    "system:users:read"
  ],

  // COORDINATOR: Dedicated day-of execution, vendor arrival radar, and on-site incidents.
  // Isolated from financial ledgers, contract signatures, and vendor awards.
  COORDINATOR: [
    // CRM (Consultation assist)
    "crm:enquiry:read",

    // Weddings & Tasks (Status updates)
    "weddings:wedding:read",
    "weddings:task:read",
    "weddings:task:update",

    // Day-of Operations (Core domain)
    "operations:schedule:read",
    "operations:schedule:manage",
    "operations:radar:read",
    "operations:radar:checkin",
    "operations:incident:read",
    "operations:incident:create",
    "operations:incident:resolve",
    "operations:roster:read",

    // Procurement (Contacts for check-in)
    "procurement:vendor:read",

    // Labor logging
    "analytics:labor:create",

    // Users
    "system:users:read"
  ],

  // FINANCE DIRECTOR: Total financial governance, client billing, payment approvals,
  // vendor bill settlements, direct expenses, authoritative ledgers, and anomaly auditing.
  FINANCE_DIRECTOR: [
    // Read-only operational context
    "crm:couple:read",
    "contracts:agreement:read",
    "weddings:wedding:read",
    "procurement:vendor:read",
    "procurement:rfq:read",

    // Financial Operations (Core domain)
    "finance:milestone:read",
    "finance:milestone:create",
    "finance:invoice:read",
    "finance:invoice:create",
    "finance:payment:record",
    "finance:payment:approve",
    "finance:vendor_bill:read",
    "finance:vendor_bill:create",
    "finance:vendor_bill:reconcile",
    "finance:vendor_payment:record",
    "finance:vendor_payment:approve",
    "finance:direct_expense:pay",

    // Authoritative Ledger & Audit
    "finance:ledger:read",
    "finance:anomalies:read",

    // Treasury & Analytics
    "analytics:labor:read",
    "analytics:treasury:read",

    // Audit
    "system:audit:read",
    "system:users:read"
  ]
};

/**
 * Check if a role possesses a specific permission
 */
export function hasPermission(role: UserRole, permission: PermissionKey): boolean {
  if (role === "ADMIN") return true;
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

/**
 * Retrieve the full list of permissions granted to a role
 */
export function getPermissionsForRole(role: UserRole): readonly PermissionKey[] {
  return ROLE_PERMISSIONS[role] || [];
}

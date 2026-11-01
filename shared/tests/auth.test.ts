import { describe, it, expect } from "vitest";
import {
  USER_ROLES,
  PERMISSION_KEYS,
  ROLE_PERMISSIONS,
  hasPermission,
  getPermissionsForRole,
  LoginSchema,
  AuthenticatedUserSchema,
  AuthTokenResponseSchema
} from "../src/index.js";

describe("Phase 4A: Shared Auth Contracts & RBAC Permissions", () => {
  it("includes FOUNDER in USER_ROLES", () => {
    expect(USER_ROLES).toContain("FOUNDER");
    expect(USER_ROLES).toContain("ADMIN");
    expect(USER_ROLES).toContain("LEAD_PLANNER");
    expect(USER_ROLES).toContain("COORDINATOR");
    expect(USER_ROLES).toContain("FINANCE_DIRECTOR");
  });

  it("validates LoginSchema correctly", () => {
    const valid = LoginSchema.safeParse({
      email: "finance@royalknot.in",
      password: "SecurePassword123"
    });
    expect(valid.success).toBe(true);

    const invalidEmail = LoginSchema.safeParse({
      email: "not-an-email",
      password: "SecurePassword123"
    });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = LoginSchema.safeParse({
      email: "finance@royalknot.in",
      password: "123"
    });
    expect(shortPassword.success).toBe(false);
  });

  it("validates AuthenticatedUserSchema without exposing password hashes", () => {
    const userPayload = {
      id: "a0000000-0000-0000-0000-000000000001",
      email: "founder@royalknot.in",
      name: "Devika Rajyashree",
      role: "FOUNDER",
      phone: "+919829000000",
      hourlyRatePaise: "500000"
    };

    const parsed = AuthenticatedUserSchema.safeParse(userPayload);
    expect(parsed.success).toBe(true);

    const tokenResponse = AuthTokenResponseSchema.safeParse({
      success: true,
      token: "mock-jwt-header.payload.signature",
      user: userPayload,
      permissions: ["analytics:seasonal:read", "contracts:signature:view"]
    });
    expect(tokenResponse.success).toBe(true);
  });

  it("enforces strict separation between Operational and Financial permissions", () => {
    // 1. Admin has access to everything
    expect(hasPermission("ADMIN", "finance:payment:approve")).toBe(true);
    expect(hasPermission("ADMIN", "contracts:signature:view")).toBe(true);
    expect(hasPermission("ADMIN", "operations:schedule:manage")).toBe(true);

    // 2. Coordinator has day-of operations, but is strictly blocked from finance and client signatures
    expect(hasPermission("COORDINATOR", "operations:radar:checkin")).toBe(true);
    expect(hasPermission("COORDINATOR", "operations:incident:create")).toBe(true);
    expect(hasPermission("COORDINATOR", "finance:invoice:create")).toBe(false);
    expect(hasPermission("COORDINATOR", "finance:payment:approve")).toBe(false);
    expect(hasPermission("COORDINATOR", "finance:direct_expense:pay")).toBe(false);
    expect(hasPermission("COORDINATOR", "contracts:signature:view")).toBe(false);

    // 3. Finance Director has full financial governance, but cannot modify day-of schedules
    expect(hasPermission("FINANCE_DIRECTOR", "finance:invoice:create")).toBe(true);
    expect(hasPermission("FINANCE_DIRECTOR", "finance:payment:approve")).toBe(true);
    expect(hasPermission("FINANCE_DIRECTOR", "finance:vendor_payment:approve")).toBe(true);
    expect(hasPermission("FINANCE_DIRECTOR", "finance:direct_expense:pay")).toBe(true);
    expect(hasPermission("FINANCE_DIRECTOR", "finance:anomalies:read")).toBe(true);
    expect(hasPermission("FINANCE_DIRECTOR", "operations:schedule:manage")).toBe(false);

    // 4. Lead Planner has full operational & contract authority, but cannot approve/disburse payments
    expect(hasPermission("LEAD_PLANNER", "weddings:wedding:create")).toBe(true);
    expect(hasPermission("LEAD_PLANNER", "contracts:signature:view")).toBe(true);
    expect(hasPermission("LEAD_PLANNER", "procurement:rfq:award")).toBe(true);
    expect(hasPermission("LEAD_PLANNER", "finance:payment:approve")).toBe(false);
    expect(hasPermission("LEAD_PLANNER", "finance:direct_expense:pay")).toBe(false);

    // 5. Founder has executive analytics, treasury, signature audit, and RFQ award oversight
    expect(hasPermission("FOUNDER", "analytics:seasonal:read")).toBe(true);
    expect(hasPermission("FOUNDER", "analytics:treasury:read")).toBe(true);
    expect(hasPermission("FOUNDER", "contracts:signature:view")).toBe(true);
    expect(hasPermission("FOUNDER", "finance:ledger:read")).toBe(true);
    expect(hasPermission("FOUNDER", "finance:direct_expense:pay")).toBe(false); // Founder reviews, does not disburse
  });

  it("retrieves complete permission list for each role", () => {
    const coordinatorPerms = getPermissionsForRole("COORDINATOR");
    expect(coordinatorPerms.length).toBeGreaterThan(5);
    expect(coordinatorPerms).toContain("operations:radar:checkin");
    expect(coordinatorPerms).not.toContain("finance:payment:approve");

    const founderPerms = getPermissionsForRole("FOUNDER");
    expect(founderPerms).toContain("analytics:seasonal:read");
    expect(founderPerms).toContain("finance:anomalies:read");
  });
});

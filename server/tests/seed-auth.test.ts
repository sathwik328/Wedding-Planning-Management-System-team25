import { describe, it, expect } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashPassword, verifyPassword } from "../src/utils/password.js";
import { validateSeedEnvironment } from "../prisma/seed.js";

const prisma = new PrismaClient();
const activeDemoPassword = process.env.DEMO_USER_PASSWORD || "RoyalKnot#2026";

describe("Phase 4A: Seed Environment Validation & Security Guards", () => {
  it("strictly prohibits seeding when NODE_ENV is production", () => {
    expect(() =>
      validateSeedEnvironment({
        NODE_ENV: "production",
        DEMO_USER_PASSWORD: "IsolatedTestPassword#123",
      })
    ).toThrow("Seeding demo accounts is strictly prohibited in production environments (NODE_ENV=production).");
  });

  it("fails immediately when DEMO_USER_PASSWORD is missing or undefined", () => {
    expect(() =>
      validateSeedEnvironment({
        NODE_ENV: "development",
      })
    ).toThrow("Missing required environment variable DEMO_USER_PASSWORD.");
  });

  it("fails immediately when DEMO_USER_PASSWORD is blank or only whitespace", () => {
    expect(() =>
      validateSeedEnvironment({
        NODE_ENV: "development",
        DEMO_USER_PASSWORD: "   ",
      })
    ).toThrow("Missing required environment variable DEMO_USER_PASSWORD.");
  });

  it("allows valid development seeding when DEMO_USER_PASSWORD is provided", () => {
    const isolatedPassword = "IsolatedPassword#9876";
    const resolved = validateSeedEnvironment({
      NODE_ENV: "development",
      DEMO_USER_PASSWORD: isolatedPassword,
    });
    expect(resolved).toBe(isolatedPassword);

    // Verify hashing and verification with isolated password works end-to-end
    const hash = hashPassword(resolved);
    expect(hash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword(isolatedPassword, hash)).toBe(true);
    expect(verifyPassword("WrongPassword", hash)).toBe(false);
  });
});

describe("Phase 4A: Existing Seeded Demo User & Password Hash Verification", () => {
  it("verifies founder account has role FOUNDER and valid password hash", async () => {
    const founder = await prisma.user.findUnique({
      where: { email: "founder@royalknot.in" },
    });

    expect(founder).not.toBeNull();
    expect(founder?.role).toBe("FOUNDER");
    expect(founder?.passwordHash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword(activeDemoPassword, founder!.passwordHash)).toBe(true);
    expect(verifyPassword("WrongPassword", founder!.passwordHash)).toBe(false);
  });

  it("verifies lead planner account has role LEAD_PLANNER and valid password hash", async () => {
    const leadPlanner = await prisma.user.findUnique({
      where: { email: "lead.planner@royalknot.in" },
    });

    expect(leadPlanner).not.toBeNull();
    expect(leadPlanner?.role).toBe("LEAD_PLANNER");
    expect(leadPlanner?.passwordHash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword(activeDemoPassword, leadPlanner!.passwordHash)).toBe(true);
  });

  it("verifies operations coordinator account has role COORDINATOR and valid password hash", async () => {
    const coordinator = await prisma.user.findUnique({
      where: { email: "operations@royalknot.in" },
    });

    expect(coordinator).not.toBeNull();
    expect(coordinator?.role).toBe("COORDINATOR");
    expect(coordinator?.passwordHash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword(activeDemoPassword, coordinator!.passwordHash)).toBe(true);
  });

  it("verifies finance director account has role FINANCE_DIRECTOR and valid password hash", async () => {
    const finance = await prisma.user.findUnique({
      where: { email: "finance@royalknot.in" },
    });

    expect(finance).not.toBeNull();
    expect(finance?.role).toBe("FINANCE_DIRECTOR");
    expect(finance?.passwordHash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(verifyPassword(activeDemoPassword, finance!.passwordHash)).toBe(true);
  });

  it("ensures all seeded demo users have non-empty scrypt password hashes", async () => {
    const demoEmails = [
      "founder@royalknot.in",
      "lead.planner@royalknot.in",
      "operations@royalknot.in",
      "finance@royalknot.in"
    ];

    for (const email of demoEmails) {
      const user = await prisma.user.findUnique({ where: { email } });
      expect(user).not.toBeNull();
      expect(user?.passwordHash).toBeTruthy();
      expect(user?.passwordHash).toMatch(/^scrypt:[a-f0-9]{32}:[a-f0-9]{128}$/);
      expect(user?.passwordHash).not.toContain("RoyalKnot#2026");
    }
  });
});


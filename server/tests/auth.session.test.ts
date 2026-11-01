import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AuthService, hashToken } from "../src/services/auth.service.js";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

describe("Phase 4: Server-Side Session Lifecycle & Security", () => {
  const testEmail = "session.test@royalknot.in";
  let testUserId: string;

  beforeEach(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: testEmail } }
    });
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });

    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Session Test User",
        role: "COORDINATOR",
        passwordHash: hashPassword("TestPassword#123")
      }
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.session.deleteMany({
      where: { user: { email: testEmail } }
    });
    await prisma.user.deleteMany({
      where: { email: testEmail }
    });
    await prisma.$disconnect();
  });

  it("creates a session with 32-byte entropy and stores only SHA-256 token hashes in DB", async () => {
    const { rawSessionToken, rawCsrfToken, session } = await authService.createSession(testUserId, {
      userAgent: "Vitest/1.0",
      ipAddress: "127.0.0.1"
    });

    expect(rawSessionToken).toHaveLength(64); // 32 bytes in hex = 64 hex characters
    expect(rawCsrfToken).toHaveLength(64);

    // Verify database record has SHA-256 hashes, NOT the raw tokens
    const dbSession = await prisma.session.findUnique({
      where: { id: session.id }
    });

    expect(dbSession).not.toBeNull();
    expect(dbSession?.sessionTokenHash).toBe(hashToken(rawSessionToken));
    expect(dbSession?.csrfTokenHash).toBe(hashToken(rawCsrfToken));
    expect(dbSession?.sessionTokenHash).not.toBe(rawSessionToken);
    expect(dbSession?.csrfTokenHash).not.toBe(rawCsrfToken);
    expect(dbSession?.isRevoked).toBe(false);
  });

  it("validates an active session and returns user context", async () => {
    const { rawSessionToken } = await authService.createSession(testUserId);
    const active = await authService.validateSession(rawSessionToken);

    expect(active).not.toBeNull();
    expect(active?.userId).toBe(testUserId);
    expect(active?.user.email).toBe(testEmail);
  });

  it("rejects an expired session", async () => {
    const { rawSessionToken, session } = await authService.createSession(testUserId);

    // Manually backdate the session expiry
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) }
    });

    const active = await authService.validateSession(rawSessionToken);
    expect(active).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const { rawSessionToken, session } = await authService.createSession(testUserId);

    await authService.revokeSessionById(session.id);

    const active = await authService.validateSession(rawSessionToken);
    expect(active).toBeNull();
  });

  it("immediately invalidates a session on revokeSession(rawSessionToken)", async () => {
    const { rawSessionToken } = await authService.createSession(testUserId);

    const revoked = await authService.revokeSession(rawSessionToken);
    expect(revoked).toBe(true);

    const active = await authService.validateSession(rawSessionToken);
    expect(active).toBeNull();
  });

  it("cascades deletion of all sessions when the associated user is deleted", async () => {
    const { rawSessionToken, session } = await authService.createSession(testUserId);

    // Delete the user
    await prisma.user.delete({
      where: { id: testUserId }
    });

    const dbSession = await prisma.session.findUnique({
      where: { id: session.id }
    });
    expect(dbSession).toBeNull();

    const active = await authService.validateSession(rawSessionToken);
    expect(active).toBeNull();
  });
});

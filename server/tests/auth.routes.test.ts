import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { PrismaClient } from "@prisma/client";
import { createApp } from "../src/app.js";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

describe("Phase 4: Authentication Routes & Session Cookie Tests", () => {
  let server: http.Server;
  let baseUrl: string;

  const demoEmail = "lead.planner@royalknot.in";
  const demoPassword = process.env.DEMO_USER_PASSWORD || "RoyalKnot#2026";

  beforeAll(async () => {
    // Ensure the lead planner user exists with valid hashed password
    await prisma.user.upsert({
      where: { email: demoEmail },
      update: { passwordHash: hashPassword(demoPassword), role: "LEAD_PLANNER" },
      create: {
        name: "Ananya Singhal",
        email: demoEmail,
        role: "LEAD_PLANNER",
        passwordHash: hashPassword(demoPassword)
      }
    });

    const app = createApp(prisma);
    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  it("POST /api/auth/login succeeds with valid credentials, sets HTTP-only cookie and returns CSRF token", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword
      })
    });

    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(demoEmail);
    expect(data.user.role).toBe("LEAD_PLANNER");
    expect(data.user.passwordHash).toBeUndefined();
    expect(data.permissions).toBeInstanceOf(Array);
    expect(data.permissions).toContain("weddings:wedding:create");
    expect(data.csrfToken).toHaveLength(64);

    // Verify cookie attributes
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).not.toBeNull();
    expect(setCookie).toContain("royal_knot_session=");
    expect(setCookie?.toLowerCase()).toContain("httponly");
    expect(setCookie?.toLowerCase()).toContain("samesite=lax");
    expect(setCookie?.toLowerCase()).toContain("path=/");
  });

  it("POST /api/auth/login fails with invalid password", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: demoEmail,
        password: "IncorrectPassword#999"
      })
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid corporate email or password/i);
  });

  it("POST /api/auth/login fails with unknown email address", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "unknown.account@royalknot.in",
        password: "SomePassword#123"
      })
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toMatch(/Invalid corporate email or password/i);
  });

  it("POST /api/auth/login fails with malformed request body", async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "not-an-email",
        password: "123"
      })
    });

    expect(res.status).toBe(400);
  });

  it("GET /api/auth/me returns 401 when no session cookie is provided", async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    expect(res.status).toBe(401);
  });

  it("Full session workflow: login -> check me -> logout with CSRF -> session revoked", async () => {
    // 1. Login
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword
      })
    });
    expect(loginRes.status).toBe(200);
    const loginData = await loginRes.json();
    const cookieHeader = loginRes.headers.get("set-cookie")!.split(";")[0];
    const initialCsrf = loginData.csrfToken;

    // 2. Check /api/auth/me
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader }
    });
    expect(meRes.status).toBe(200);
    const meData = await meRes.json();
    expect(meData.user.email).toBe(demoEmail);
    expect(meData.csrfToken).toBeDefined();
    const activeCsrf = meData.csrfToken;

    // 3. Logout without CSRF header should be rejected with 403
    const logoutNoCsrf = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: cookieHeader }
    });
    expect(logoutNoCsrf.status).toBe(403);

    // 4. Logout with wrong CSRF header should be rejected with 403
    const logoutBadCsrf = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "X-CSRF-Token": "bad-csrf-token-1234567890123456"
      }
    });
    expect(logoutBadCsrf.status).toBe(403);

    // 5. Logout with valid active CSRF header succeeds
    const logoutValid = await fetch(`${baseUrl}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "X-CSRF-Token": activeCsrf
      }
    });
    expect(logoutValid.status).toBe(200);
    const logoutData = await logoutValid.json();
    expect(logoutData.success).toBe(true);

    // Verify session cookie was cleared
    const clearCookie = logoutValid.headers.get("set-cookie")?.toLowerCase();
    expect(clearCookie).toContain("royal_knot_session=;");

    // 6. Accessing /api/auth/me after logout returns 401
    const meAfterLogout = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Cookie: cookieHeader }
    });
    expect(meAfterLogout.status).toBe(401);
  });

  it("enforces login rate limiting: blocks requests after 5 consecutive failed attempts with HTTP 429", async () => {
    // 5 consecutive failures
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: demoEmail,
          password: "WrongPasswordAttempt"
        })
      });
      expect(res.status).toBe(401);
    }

    // 6th attempt must be rejected with 429 Too Many Requests
    const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: demoEmail,
        password: demoPassword
      })
    });

    expect(blockedRes.status).toBe(429);
    const blockedData = await blockedRes.json();
    expect(blockedData.error).toContain("Too many failed login attempts");
    expect(blockedRes.headers.get("retry-after")).toBeDefined();
  });

  it("POST /api/auth/register creates a new user, sets HTTP-only session cookie, and returns safe profile", async () => {
    const regEmail = `test.planner.${Date.now()}@royalknot.in`;
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.50" },
      body: JSON.stringify({
        name: "Test Royal Coordinator",
        email: regEmail,
        password: "SecretSecurePass2026",
        role: "COORDINATOR",
        phone: "+919829099999"
      })
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(regEmail);
    expect(data.user.role).toBe("COORDINATOR");
    expect(data.user.name).toBe("Test Royal Coordinator");
    expect(data.csrfToken).toBeDefined();

    // Verify session cookie was set
    const setCookie = res.headers.get("set-cookie");
    expect(setCookie).toBeDefined();
    expect(setCookie).toContain("royal_knot_session=");
    expect(setCookie).toContain("HttpOnly");

    // Attempting to register again with same email returns 409 Conflict
    const dupRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "10.0.0.50" },
      body: JSON.stringify({
        name: "Duplicate User",
        email: regEmail,
        password: "SecretSecurePass2026",
        role: "COORDINATOR"
      })
    });

    expect(dupRes.status).toBe(409);
    const dupData = await dupRes.json();
    expect(dupData.error).toContain("already registered");

    // Cleanup created test user
    await prisma.session.deleteMany({ where: { userId: data.user.id } });
    await prisma.user.delete({ where: { id: data.user.id } });
  });
});

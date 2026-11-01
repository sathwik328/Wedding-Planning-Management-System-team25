import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { PrismaClient, User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/services/auth.service.js";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

describe("Phase 4: RBAC & Developer A Endpoint Protection Tests", () => {
  let server: http.Server;
  let baseUrl: string;

  const users: Record<string, { user: User; cookie: string; csrf: string }> = {};

  const roles = [
    { role: "ADMIN", email: "admin.rbac@royalknot.in" },
    { role: "FOUNDER", email: "founder.rbac@royalknot.in" },
    { role: "LEAD_PLANNER", email: "planner.rbac@royalknot.in" },
    { role: "COORDINATOR", email: "coordinator.rbac@royalknot.in" },
    { role: "FINANCE_DIRECTOR", email: "finance.rbac@royalknot.in" }
  ];

  let testCoupleId: string;
  let testWeddingId: string;

  beforeAll(async () => {
    const app = createApp(prisma);
    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    // Create a user and active session for each role
    for (const item of roles) {
      const u = await prisma.user.upsert({
        where: { email: item.email },
        update: { role: item.role, passwordHash: hashPassword("RbacTest#2026") },
        create: {
          name: `Test ${item.role}`,
          email: item.email,
          role: item.role,
          passwordHash: hashPassword("RbacTest#2026")
        }
      });

      const { rawSessionToken, rawCsrfToken } = await authService.createSession(u.id);
      users[item.role] = {
        user: u,
        cookie: `royal_knot_session=${rawSessionToken}`,
        csrf: rawCsrfToken
      };
    }

    // Create a test couple and agreement with signature for raw signature tests
    const enquiry = await prisma.enquiry.create({
      data: {
        id: "rbac-test-enquiry-uuid",
        coupleNames: "Kavya & Rohan",
        primaryEmail: "kavya.rohan.rbac@test.in",
        primaryPhone: "+919829900011",
        source: "INSTAGRAM",
        roughDate: new Date("2026-12-20"),
        budgetCeilingPaise: 3000000000n,
        status: "AGREEMENT_SENT"
      }
    });

    const couple = await prisma.couple.create({
      data: {
        id: "rbac-test-couple-uuid",
        enquiryId: enquiry.id,
        partnerOneName: "Kavya Singhania",
        partnerTwoName: "Rohan Lodha",
        email: "kavya.rohan.rbac@test.in",
        phone: "+919829900011"
      }
    });
    testCoupleId = couple.id;

    await prisma.serviceAgreement.create({
      data: {
        id: "rbac-test-agreement-uuid",
        coupleId: couple.id,
        packageType: "FULL_SERVICE",
        agreedFeePaise: 450000000n,
        paymentTerms: "Standard 25/50/25",
        isExecuted: true,
        signatureDataUrl: "data:image/png;base64,RAW_CLIENT_SIGNATURE_PAYLOAD_TEST",
        signedByName: "Kavya Singhania",
        signedAt: new Date()
      }
    });

    // Create a test wedding
    const wedding = await prisma.wedding.create({
      data: {
        id: "rbac-test-wedding-uuid",
        coupleId: couple.id,
        title: "The Royal Wedding of Kavya & Rohan",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-12-20"),
        endDate: new Date("2026-12-23"),
        primaryCity: "Udaipur",
        venueName: "The Oberoi Udaivilas",
        targetGuestCount: 400,
        totalBudgetPaise: 3000000000n,
        status: "PLANNING"
      }
    });
    testWeddingId = wedding.id;
  });

  afterAll(async () => {
    await prisma.serviceAgreement.deleteMany({ where: { coupleId: testCoupleId } });
    await prisma.wedding.deleteMany({ where: { id: testWeddingId } });
    await prisma.couple.deleteMany({ where: { id: testCoupleId } });
    await prisma.enquiry.deleteMany({ where: { id: "rbac-test-enquiry-uuid" } });

    for (const item of roles) {
      await prisma.session.deleteMany({ where: { user: { email: item.email } } });
      await prisma.user.deleteMany({ where: { email: item.email } });
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  // 1. Unauthenticated Requests
  it("rejects unauthenticated requests to protected CRM and Wedding endpoints with 401", async () => {
    const resCrm = await fetch(`${baseUrl}/api/crm/enquiries`);
    expect(resCrm.status).toBe(401);

    const resWeddings = await fetch(`${baseUrl}/api/weddings`);
    expect(resWeddings.status).toBe(401);

    const resAgreements = await fetch(`${baseUrl}/api/agreements/by-couple/${testCoupleId}`);
    expect(resAgreements.status).toBe(401);
  });

  // 2. CRM Endpoint Authorization
  it("enforces role permissions on CRM endpoints", async () => {
    // COORDINATOR has crm:enquiry:read -> should succeed
    const coordRes = await fetch(`${baseUrl}/api/crm/enquiries`, {
      headers: { Cookie: users.COORDINATOR.cookie }
    });
    expect(coordRes.status).toBe(200);

    // FINANCE_DIRECTOR lacks crm:enquiry:read -> should be rejected with 403
    const financeRes = await fetch(`${baseUrl}/api/crm/enquiries`, {
      headers: { Cookie: users.FINANCE_DIRECTOR.cookie }
    });
    expect(financeRes.status).toBe(403);

    // LEAD_PLANNER has crm:enquiry:read -> should succeed
    const plannerRes = await fetch(`${baseUrl}/api/crm/enquiries`, {
      headers: { Cookie: users.LEAD_PLANNER.cookie }
    });
    expect(plannerRes.status).toBe(200);

    // COORDINATOR lacks crm:enquiry:create -> should be rejected with 403
    const coordCreateRes = await fetch(`${baseUrl}/api/crm/enquiries`, {
      method: "POST",
      headers: {
        Cookie: users.COORDINATOR.cookie,
        "X-CSRF-Token": users.COORDINATOR.csrf,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coupleNames: "Test Unauthorized",
        primaryEmail: "test@example.com",
        primaryPhone: "+919829000000",
        source: "INSTAGRAM",
        roughDate: "2026-12-01T00:00:00Z",
        budgetCeilingPaise: "100000000"
      })
    });
    expect(coordCreateRes.status).toBe(403);
  });

  // 3. Agreement Reading and Raw Signature Access Separation
  it("protects raw client signatureDataUrl based on contracts:signature:view", async () => {
    // FINANCE_DIRECTOR has contracts:agreement:read but NOT contracts:signature:view
    const financeRes = await fetch(`${baseUrl}/api/agreements/by-couple/${testCoupleId}`, {
      headers: { Cookie: users.FINANCE_DIRECTOR.cookie }
    });
    expect(financeRes.status).toBe(200);
    const financeData = await financeRes.json();
    expect(financeData.data.packageType).toBe("FULL_SERVICE");
    // Signature MUST be redacted / null
    expect(financeData.data.signatureDataUrl).toBeNull();

    // LEAD_PLANNER has contracts:signature:view -> signature is accessible
    const plannerRes = await fetch(`${baseUrl}/api/agreements/by-couple/${testCoupleId}`, {
      headers: { Cookie: users.LEAD_PLANNER.cookie }
    });
    expect(plannerRes.status).toBe(200);
    const plannerData = await plannerRes.json();
    expect(plannerData.data.signatureDataUrl).toBe("data:image/png;base64,RAW_CLIENT_SIGNATURE_PAYLOAD_TEST");

    // FOUNDER has contracts:signature:view -> signature is accessible
    const founderRes = await fetch(`${baseUrl}/api/agreements/by-couple/${testCoupleId}`, {
      headers: { Cookie: users.FOUNDER.cookie }
    });
    expect(founderRes.status).toBe(200);
    const founderData = await founderRes.json();
    expect(founderData.data.signatureDataUrl).toBe("data:image/png;base64,RAW_CLIENT_SIGNATURE_PAYLOAD_TEST");
  });

  // 4. Wedding Operations & Task Assignment
  it("protects wedding task assignment and creation", async () => {
    // COORDINATOR lacks weddings:wedding:create
    const coordCreateRes = await fetch(`${baseUrl}/api/weddings`, {
      method: "POST",
      headers: {
        Cookie: users.COORDINATOR.cookie,
        "X-CSRF-Token": users.COORDINATOR.csrf,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        coupleId: testCoupleId,
        title: "Unauthorized Wedding",
        packageType: "FULL_SERVICE",
        startDate: "2026-12-20T00:00:00Z",
        endDate: "2026-12-23T00:00:00Z",
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        targetGuestCount: 300,
        totalBudgetPaise: "2000000000"
      })
    });
    expect(coordCreateRes.status).toBe(403);
  });

  // 5. Day-of Operations Cockpit
  it("permits coordinator to access radar and schedule while rejecting finance director", async () => {
    // COORDINATOR has operations:schedule:read
    const coordRes = await fetch(`${baseUrl}/api/operations/${testWeddingId}/schedules`, {
      headers: { Cookie: users.COORDINATOR.cookie }
    });
    expect(coordRes.status).toBe(200);

    // FINANCE_DIRECTOR lacks operations:schedule:read
    const financeRes = await fetch(`${baseUrl}/api/operations/${testWeddingId}/schedules`, {
      headers: { Cookie: users.FINANCE_DIRECTOR.cookie }
    });
    expect(financeRes.status).toBe(403);
  });
});

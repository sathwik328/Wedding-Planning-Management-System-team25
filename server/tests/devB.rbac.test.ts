import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "http";
import { AddressInfo } from "net";
import { PrismaClient, User } from "@prisma/client";
import { createApp } from "../src/app.js";
import { AuthService } from "../src/services/auth.service.js";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

describe("Phase 4: Developer B Procurement & Finance Authorization Tests", () => {
  let server: http.Server;
  let baseUrl: string;

  const users: Record<string, { user: User; cookie: string; csrf: string }> = {};

  const roles = [
    { role: "ADMIN", email: "admin.devb@royalknot.in" },
    { role: "FOUNDER", email: "founder.devb@royalknot.in" },
    { role: "LEAD_PLANNER", email: "planner.devb@royalknot.in" },
    { role: "COORDINATOR", email: "coordinator.devb@royalknot.in" },
    { role: "FINANCE_DIRECTOR", email: "finance.devb@royalknot.in" }
  ];

  let testCoupleId: string;
  let testWeddingId: string;
  let testVendorId: string;
  let testInvoiceId: string;
  let testBillId: string;
  let testRfqGroupId: string;
  let testQuotationId: string;

  async function cleanDb() {
    await prisma.auditLog.deleteMany({
      where: { performedBy: { in: Object.values(users).map((u) => u.user.id) } }
    }).catch(() => {});
    await prisma.clientPayment.deleteMany({ where: { clientInvoiceId: testInvoiceId } }).catch(() => {});
    await prisma.clientInvoice.deleteMany({ where: { id: testInvoiceId } }).catch(() => {});
    await prisma.vendorPayment.deleteMany({ where: { vendorBillId: testBillId } }).catch(() => {});
    await prisma.vendorBill.deleteMany({ where: { id: testBillId } }).catch(() => {});
    await prisma.weddingVendor.deleteMany({ where: { weddingId: testWeddingId } }).catch(() => {});
    await prisma.vendorQuotation.deleteMany({ where: { id: testQuotationId } }).catch(() => {});
    await prisma.vendorRequest.deleteMany({ where: { quotationRequestGroupId: testRfqGroupId } }).catch(() => {});
    await prisma.quotationRequestGroup.deleteMany({ where: { id: testRfqGroupId } }).catch(() => {});
    await prisma.vendor.deleteMany({ where: { id: { in: [testVendorId, "devb-rbac-vendor-decor"] } } }).catch(() => {});
    await prisma.wedding.deleteMany({ where: { id: testWeddingId } }).catch(() => {});
    await prisma.couple.deleteMany({ where: { id: testCoupleId } }).catch(() => {});
  }

  beforeAll(async () => {
    const app = createApp(prisma);
    server = app.listen(0);
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://127.0.0.1:${port}`;

    testCoupleId = "devb-rbac-couple-uuid";
    testWeddingId = "devb-rbac-wedding-uuid";
    testVendorId = "devb-rbac-vendor-catering";
    testInvoiceId = "devb-rbac-invoice-uuid";
    testBillId = "devb-rbac-bill-uuid";
    testRfqGroupId = "devb-rbac-rfq-group-uuid";
    testQuotationId = "devb-rbac-quote-1";

    // Clean previous runs
    await cleanDb();

    // Create a user and active session for each role
    for (const item of roles) {
      const u = await prisma.user.upsert({
        where: { email: item.email },
        update: { role: item.role, passwordHash: hashPassword("DevbTest#2026") },
        create: {
          name: `Test ${item.role}`,
          email: item.email,
          role: item.role,
          passwordHash: hashPassword("DevbTest#2026")
        }
      });

      const { rawSessionToken, rawCsrfToken } = await authService.createSession(u.id);
      users[item.role] = {
        user: u,
        cookie: `royal_knot_session=${rawSessionToken}`,
        csrf: rawCsrfToken
      };
    }

    // Create test couple and wedding
    const couple = await prisma.couple.create({
      data: {
        id: "devb-rbac-couple-uuid",
        partnerOneName: "Vikramaditya Rathore",
        partnerTwoName: "Gayatri Devi",
        email: "vikram.gayatri.rbac@test.in",
        phone: "+919829988011"
      }
    });
    testCoupleId = couple.id;

    const wedding = await prisma.wedding.create({
      data: {
        id: "devb-rbac-wedding-uuid",
        coupleId: couple.id,
        title: "The Royal Wedding of Vikram & Gayatri",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-11-20T10:00:00Z"),
        endDate: new Date("2026-11-23T18:00:00Z"),
        primaryCity: "Jaipur",
        venueName: "Rambagh Palace",
        targetGuestCount: 500,
        totalBudgetPaise: 5000000000n, // ₹5 Crores
        status: "ACTIVE_EXECUTION"
      }
    });
    testWeddingId = wedding.id;

    // Create test vendor
    const vendor = await prisma.vendor.create({
      data: {
        id: "devb-rbac-vendor-catering",
        businessName: "Mewar Royal Catering",
        category: "CATERING",
        contactPerson: "Chef Mahendra Singh",
        phone: "+919829001122",
        email: "chef@mewarcatering.in",
        city: "Jaipur"
      }
    });
    testVendorId = vendor.id;

    // Create an RFQ group with 2 competing requests
    const rfqGroup = await prisma.quotationRequestGroup.create({
      data: {
        id: "devb-rbac-rfq-group-uuid",
        weddingId: wedding.id,
        title: "Royal Gala Dinner Catering",
        category: "CATERING",
        targetGuestCount: 500,
        status: "OPEN"
      }
    });
    testRfqGroupId = rfqGroup.id;

    const vReq1 = await prisma.vendorRequest.create({
      data: {
        id: "devb-rbac-vreq-1",
        quotationRequestGroupId: rfqGroup.id,
        vendorId: vendor.id,
        requirement: "Royal Rajputana Dinner",
        status: "QUOTE_RECEIVED"
      }
    });

    const quotation1 = await prisma.vendorQuotation.create({
      data: {
        id: "devb-rbac-quote-1",
        vendorRequestId: vReq1.id,
        vendorId: vendor.id,
        quoteReference: "Q-MEWAR-2026-01",
        baseAmountPaise: 250000000n,
        pricePerPlatePaise: 450000n,
        extraHourRatePaise: 5000000n,
        isSelectedWinner: false
      }
    });
    testQuotationId = quotation1.id;

    // Create decor vendor for pre-existing contracted bill tests
    const decorVendor = await prisma.vendor.create({
      data: {
        id: "devb-rbac-vendor-decor",
        businessName: "Mewar Royal Florals",
        category: "DECOR_FLORAL",
        contactPerson: "Anita Rathore",
        phone: "+919829009933",
        email: "anita@mewarflorals.in",
        city: "Jaipur"
      }
    });

    // Link pre-contracted wedding vendor
    const weddingVendor = await prisma.weddingVendor.create({
      data: {
        id: "devb-rbac-wedding-vendor-uuid",
        weddingId: wedding.id,
        vendorId: decorVendor.id,
        quotationRequestGroupId: rfqGroup.id,
        serviceCategory: "DECOR_FLORAL",
        status: "CONTRACTED",
        agreedBaselineAmountPaise: 250000000n // ₹25 Lakhs
      }
    });

    // Create a client invoice
    const invoice = await prisma.clientInvoice.create({
      data: {
        id: "devb-rbac-invoice-uuid",
        weddingId: wedding.id,
        invoiceNumber: "INV-RBAC-2026-01",
        invoiceType: "CONTRACT_MILESTONE",
        dueDate: new Date("2026-11-25T00:00:00Z"),
        subtotalPaise: 100000000n, // ₹10 Lakhs
        taxPaise: 0n,
        totalAmountPaise: 100000000n,
        status: "ISSUED"
      }
    });
    testInvoiceId = invoice.id;

    // Create a vendor bill
    const bill = await prisma.vendorBill.create({
      data: {
        id: "devb-rbac-bill-uuid",
        weddingVendorId: weddingVendor.id,
        billNumber: "BILL-RBAC-2026-01",
        baseAmountPaise: 250000000n,
        totalBilledPaise: 250000000n,
        status: "SUBMITTED",
        reconciled: false
      }
    });
    testBillId = bill.id;
  });

  afterAll(async () => {
    await cleanDb();

    for (const item of roles) {
      await prisma.session.deleteMany({ where: { user: { email: item.email } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: item.email } }).catch(() => {});
    }

    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------
  // 1. UNAUTHENTICATED ACCESS
  // -------------------------------------------------------------
  it("rejects unauthenticated requests to Developer B endpoints with 401", async () => {
    const resVendors = await fetch(`${baseUrl}/api/vendors`);
    expect(resVendors.status).toBe(401);

    const resRfq = await fetch(`${baseUrl}/api/rfq/groups/wedding/${testWeddingId}`);
    expect(resRfq.status).toBe(401);

    const resLedger = await fetch(`${baseUrl}/api/finance/ledger/${testWeddingId}`);
    expect(resLedger.status).toBe(401);

    const resSeasonal = await fetch(`${baseUrl}/api/analytics/seasonal`);
    expect(resSeasonal.status).toBe(401);
  });

  // -------------------------------------------------------------
  // 2. CSRF VALIDATION ON STATE-CHANGING ENDPOINTS
  // -------------------------------------------------------------
  it("rejects mutating requests lacking valid CSRF token with 403", async () => {
    // Missing CSRF token header
    const resNoCsrf = await fetch(`${baseUrl}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.ADMIN.cookie
      },
      body: JSON.stringify({
        businessName: "No Csrf Vendor",
        category: "LOGISTICS",
        contactPerson: "Rajesh",
        phone: "+919829009988",
        email: "nocsrf@test.in",
        city: "Jaipur"
      })
    });
    expect(resNoCsrf.status).toBe(403);

    // Invalid CSRF token
    const resInvalidCsrf = await fetch(`${baseUrl}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.ADMIN.cookie,
        "X-CSRF-Token": "invalid-csrf-token-too-short"
      },
      body: JSON.stringify({
        businessName: "Invalid Csrf Vendor",
        category: "LOGISTICS",
        contactPerson: "Rajesh",
        phone: "+919829009988",
        email: "invalidcsrf@test.in",
        city: "Jaipur"
      })
    });
    expect(resInvalidCsrf.status).toBe(403);
  });

  // -------------------------------------------------------------
  // 3. VENDOR DIRECTORY AUTHORIZATION
  // -------------------------------------------------------------
  it("enforces procurement:vendor:read and procurement:vendor:create across roles", async () => {
    // Reading vendors: all operational & executive roles have procurement:vendor:read
    for (const r of ["ADMIN", "FOUNDER", "LEAD_PLANNER", "COORDINATOR", "FINANCE_DIRECTOR"]) {
      const res = await fetch(`${baseUrl}/api/vendors`, {
        headers: { Cookie: users[r].cookie }
      });
      expect(res.status).toBe(200);
    }

    // Creating vendor: COORDINATOR lacks procurement:vendor:create -> 403
    const coordCreate = await fetch(`${baseUrl}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.COORDINATOR.cookie,
        "X-CSRF-Token": users.COORDINATOR.csrf
      },
      body: JSON.stringify({
        businessName: "Blocked Vendor",
        category: "MAKEUP",
        contactPerson: "Pooja",
        phone: "+919829112233",
        email: "pooja@test.in",
        city: "Jaipur"
      })
    });
    expect(coordCreate.status).toBe(403);

    // FINANCE_DIRECTOR lacks procurement:vendor:create -> 403
    const finCreate = await fetch(`${baseUrl}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.FINANCE_DIRECTOR.cookie,
        "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
      },
      body: JSON.stringify({
        businessName: "Blocked Vendor Fin",
        category: "MAKEUP",
        contactPerson: "Pooja",
        phone: "+919829112233",
        email: "poojafin@test.in",
        city: "Jaipur"
      })
    });
    expect(finCreate.status).toBe(403);

    // LEAD_PLANNER has procurement:vendor:create -> 201
    const plannerCreate = await fetch(`${baseUrl}/api/vendors`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.LEAD_PLANNER.cookie,
        "X-CSRF-Token": users.LEAD_PLANNER.csrf
      },
      body: JSON.stringify({
        businessName: "Royal Jaipur Floral Decor",
        category: "DECOR_FLORAL",
        contactPerson: "Anita Rathore",
        phone: "+919829112244",
        email: "anita@floral.in",
        city: "Jaipur"
      })
    });
    expect(plannerCreate.status).toBe(201);
  });

  // -------------------------------------------------------------
  // 4. RFQ GROUPS & QUOTATION AWARD AUTHORIZATION
  // -------------------------------------------------------------
  it("enforces procurement:rfq:award and prevents unauthorized RFQ closure", async () => {
    // COORDINATOR lacks procurement:rfq:award -> 403
    const coordAward = await fetch(`${baseUrl}/api/rfq/groups/${testRfqGroupId}/award`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.COORDINATOR.cookie,
        "X-CSRF-Token": users.COORDINATOR.csrf
      },
      body: JSON.stringify({ quotationId: testQuotationId })
    });
    expect(coordAward.status).toBe(403);

    // FINANCE_DIRECTOR lacks procurement:rfq:award -> 403
    const finAward = await fetch(`${baseUrl}/api/rfq/groups/${testRfqGroupId}/award`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.FINANCE_DIRECTOR.cookie,
        "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
      },
      body: JSON.stringify({ quotationId: testQuotationId })
    });
    expect(finAward.status).toBe(403);

    // LEAD_PLANNER has procurement:rfq:award -> 200
    const plannerAward = await fetch(`${baseUrl}/api/rfq/groups/${testRfqGroupId}/award`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: users.LEAD_PLANNER.cookie,
        "X-CSRF-Token": users.LEAD_PLANNER.csrf
      },
      body: JSON.stringify({ quotationId: testQuotationId })
    });
    expect(plannerAward.status).toBe(200);

    const awardedData = await plannerAward.json();
    expect(awardedData.awardedQuotationId).toBe(testQuotationId);
    expect(awardedData.weddingVendorId).toBeDefined();
  });

  // -------------------------------------------------------------
  // 5. CLIENT PAYMENT LIFECYCLE, SEPARATION OF DUTIES & FAIL-CLOSED APPROVAL
  // -------------------------------------------------------------
  describe("Client Payment Security: Separation of Duties & Transaction Safety", () => {
    let recordedPaymentId: string;

    // 1. Normal creation produces PENDING status
    it("1. Normal creation forces PENDING status even if CLEARED is injected", async () => {
      // LEAD_PLANNER lacks finance:payment:record -> 403
      const plannerPay = await fetch(`${baseUrl}/api/finance/client-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: users.LEAD_PLANNER.cookie,
          "X-CSRF-Token": users.LEAD_PLANNER.csrf
        },
        body: JSON.stringify({
          clientInvoiceId: testInvoiceId,
          amountPaise: 50000000,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-CLIENT-TEST-001"
        })
      });
      expect(plannerPay.status).toBe(403);

      // FINANCE_DIRECTOR records payment attempting bypass with status: "CLEARED"
      const finRecord = await fetch(`${baseUrl}/api/finance/client-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: users.FINANCE_DIRECTOR.cookie,
          "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
        },
        body: JSON.stringify({
          clientInvoiceId: testInvoiceId,
          amountPaise: 50000000,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-CLIENT-TEST-001",
          status: "CLEARED"
        })
      });
      expect(finRecord.status).toBe(201);
      const recordedPayment = await finRecord.json();
      expect(recordedPayment.status).toBe("PENDING");
      expect(recordedPayment.clearedAt).toBeNull();
      recordedPaymentId = recordedPayment.id;

      // Creation audit record must exist and attribute FINANCE_DIRECTOR
      const creationLog = await prisma.auditLog.findFirst({
        where: {
          entityName: "ClientPayment",
          entityId: recordedPaymentId,
          action: "RECORD_PAYMENT"
        }
      });
      expect(creationLog).toBeDefined();
      expect(creationLog?.performedBy).toBe(users.FINANCE_DIRECTOR.user.id);
    });

    // 2. Creator cannot approve their own payment
    it("2. Creator cannot approve their own client payment (403 Separation of Duties)", async () => {
      const selfApprove = await fetch(`${baseUrl}/api/finance/client-payments/${recordedPaymentId}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.FINANCE_DIRECTOR.cookie,
          "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
        }
      });
      expect(selfApprove.status).toBe(403);
      const selfApproveBody = await selfApprove.json();
      expect(selfApproveBody.error).toContain("Separation of duties violation");

      // Verify payment remains PENDING
      const p = await prisma.clientPayment.findUnique({ where: { id: recordedPaymentId } });
      expect(p?.status).toBe("PENDING");
    });

    // 3. A different authorized user can approve
    it("3. A different authorized user (ADMIN) can approve the client payment", async () => {
      const adminApprove = await fetch(`${baseUrl}/api/finance/client-payments/${recordedPaymentId}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(adminApprove.status).toBe(200);
      const clearedPayment = await adminApprove.json();
      expect(clearedPayment.status).toBe("CLEARED");
      expect(clearedPayment.clearedAt).toBeDefined();

      // Approval audit log must identify approving user
      const approveLog = await prisma.auditLog.findFirst({
        where: {
          entityName: "ClientPayment",
          entityId: recordedPaymentId,
          action: "APPROVE_PAYMENT"
        }
      });
      expect(approveLog).toBeDefined();
      expect(approveLog?.performedBy).toBe(users.ADMIN.user.id);
    });

    // 4. Missing creation audit record is rejected
    it("4. Rejects approval when creation audit record is missing (Fail-Closed)", async () => {
      // Create a pending client payment directly without an audit log
      const unverifiedPayment = await prisma.clientPayment.create({
        data: {
          clientInvoiceId: testInvoiceId,
          amountPaise: 25000000n,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-CLIENT-UNVERIFIED",
          status: "PENDING"
        }
      });

      const approveRes = await fetch(`${baseUrl}/api/finance/client-payments/${unverifiedPayment.id}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(approveRes.status).toBe(403);
      const body = await approveRes.json();
      expect(body.error).toContain("Missing or unverifiable creation audit record");

      // Verify payment remains PENDING
      const p = await prisma.clientPayment.findUnique({ where: { id: unverifiedPayment.id } });
      expect(p?.status).toBe("PENDING");
    });

    // 5. Invalid payment status is rejected
    it("5. Rejects approval when payment status is not PENDING", async () => {
      // Create a payment with non-PENDING status (PROCESSING) and a valid audit log
      const processingPayment = await prisma.clientPayment.create({
        data: {
          clientInvoiceId: testInvoiceId,
          amountPaise: 15000000n,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-CLIENT-PROCESSING",
          status: "PROCESSING"
        }
      });
      await prisma.auditLog.create({
        data: {
          entityName: "ClientPayment",
          entityId: processingPayment.id,
          action: "RECORD_PAYMENT",
          performedBy: users.FINANCE_DIRECTOR.user.id,
          detailsJson: "{}"
        }
      });

      const approveRes = await fetch(`${baseUrl}/api/finance/client-payments/${processingPayment.id}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(approveRes.status).toBe(400);
      const body = await approveRes.json();
      expect(body.error).toContain("must be PENDING");
    });

    // 6. Repeated approval is rejected
    it("6. Rejects repeated approval of an already cleared client payment", async () => {
      const doubleClear = await fetch(`${baseUrl}/api/finance/client-payments/${recordedPaymentId}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(doubleClear.status).toBe(400);
      const body = await doubleClear.json();
      expect(body.error).toContain("must be PENDING");
    });

    // 7. Concurrent approval attempts cannot produce duplicate clearance
    it("7. Concurrent approval attempts cannot produce duplicate clearance or dual audit logs", async () => {
      // Record a fresh pending payment by FINANCE_DIRECTOR via API
      const createRes = await fetch(`${baseUrl}/api/finance/client-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: users.FINANCE_DIRECTOR.cookie,
          "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
        },
        body: JSON.stringify({
          clientInvoiceId: testInvoiceId,
          amountPaise: 30000000,
          paymentMethod: "BANK_TRANSFER",
          transactionReference: "TX-CLIENT-CONCURRENT-001"
        })
      });
      expect(createRes.status).toBe(201);
      const concurrentPayment = await createRes.json();

      // Launch 2 simultaneous approval attempts by ADMIN
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/finance/client-payments/${concurrentPayment.id}/clear`, {
          method: "PUT",
          headers: {
            Cookie: users.ADMIN.cookie,
            "X-CSRF-Token": users.ADMIN.csrf
          }
        }),
        fetch(`${baseUrl}/api/finance/client-payments/${concurrentPayment.id}/clear`, {
          method: "PUT",
          headers: {
            Cookie: users.ADMIN.cookie,
            "X-CSRF-Token": users.ADMIN.csrf
          }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request must succeed (200), and the competing concurrent request must fail (400)
      expect(statuses).toEqual([200, 400]);

      // Exactly ONE approval audit log must exist
      const approveLogs = await prisma.auditLog.findMany({
        where: {
          entityName: "ClientPayment",
          entityId: concurrentPayment.id,
          action: "APPROVE_PAYMENT"
        }
      });
      expect(approveLogs.length).toBe(1);

      // Final payment status is CLEARED
      const finalPayment = await prisma.clientPayment.findUnique({
        where: { id: concurrentPayment.id }
      });
      expect(finalPayment?.status).toBe("CLEARED");
    });
  });

  // -------------------------------------------------------------
  // 6. VENDOR PAYMENT LIFECYCLE, SEPARATION OF DUTIES & FAIL-CLOSED APPROVAL
  // -------------------------------------------------------------
  describe("Vendor Payment Security: Separation of Duties & Transaction Safety", () => {
    let recordedVendorPaymentId: string;

    // 1. Normal creation produces PENDING status
    it("1. Normal creation forces PENDING status even if CLEARED is injected", async () => {
      const recordRes = await fetch(`${baseUrl}/api/finance/vendor-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: users.FINANCE_DIRECTOR.cookie,
          "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
        },
        body: JSON.stringify({
          vendorBillId: testBillId,
          paymentType: "ADVANCE",
          amountPaise: 100000000,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-VENDOR-TEST-001",
          status: "CLEARED" // Attempt bypass
        })
      });
      expect(recordRes.status).toBe(201);
      const recordedVendorPayment = await recordRes.json();
      expect(recordedVendorPayment.status).toBe("PENDING");
      expect(recordedVendorPayment.clearedAt).toBeNull();
      recordedVendorPaymentId = recordedVendorPayment.id;

      // Creation audit record must exist and attribute FINANCE_DIRECTOR
      const creationLog = await prisma.auditLog.findFirst({
        where: {
          entityName: "VendorPayment",
          entityId: recordedVendorPaymentId,
          action: "RECORD_PAYMENT"
        }
      });
      expect(creationLog).toBeDefined();
      expect(creationLog?.performedBy).toBe(users.FINANCE_DIRECTOR.user.id);
    });

    // 2. Creator cannot approve their own payment
    it("2. Creator cannot approve their own vendor payment (403 Separation of Duties)", async () => {
      const selfApprove = await fetch(`${baseUrl}/api/finance/vendor-payments/${recordedVendorPaymentId}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.FINANCE_DIRECTOR.cookie,
          "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
        }
      });
      expect(selfApprove.status).toBe(403);
      expect((await selfApprove.json()).error).toContain("Separation of duties violation");

      // Verify payment remains PENDING
      const p = await prisma.vendorPayment.findUnique({ where: { id: recordedVendorPaymentId } });
      expect(p?.status).toBe("PENDING");
    });

    // 3. A different authorized user can approve
    it("3. A different authorized user (ADMIN) can approve the vendor payment", async () => {
      const adminApprove = await fetch(`${baseUrl}/api/finance/vendor-payments/${recordedVendorPaymentId}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(adminApprove.status).toBe(200);
      const cleared = await adminApprove.json();
      expect(cleared.status).toBe("CLEARED");
      expect(cleared.clearedAt).toBeDefined();

      // Approval audit log must identify approving user
      const approveLog = await prisma.auditLog.findFirst({
        where: {
          entityName: "VendorPayment",
          entityId: recordedVendorPaymentId,
          action: "APPROVE_PAYMENT"
        }
      });
      expect(approveLog).toBeDefined();
      expect(approveLog?.performedBy).toBe(users.ADMIN.user.id);
    });

    // 4. Missing creation audit record is rejected
    it("4. Rejects approval when creation audit record is missing (Fail-Closed)", async () => {
      // Create a pending vendor payment directly without an audit log
      const unverifiedPayment = await prisma.vendorPayment.create({
        data: {
          vendorBillId: testBillId,
          paymentType: "ADVANCE",
          amountPaise: 40000000n,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-VENDOR-UNVERIFIED",
          status: "PENDING"
        }
      });

      const approveRes = await fetch(`${baseUrl}/api/finance/vendor-payments/${unverifiedPayment.id}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(approveRes.status).toBe(403);
      const body = await approveRes.json();
      expect(body.error).toContain("Missing or unverifiable creation audit record");

      // Verify payment remains PENDING
      const p = await prisma.vendorPayment.findUnique({ where: { id: unverifiedPayment.id } });
      expect(p?.status).toBe("PENDING");
    });

    // 5. Invalid payment status is rejected
    it("5. Rejects approval when vendor payment status is not PENDING", async () => {
      // Create a payment with non-PENDING status (PROCESSING) and a valid audit log
      const processingPayment = await prisma.vendorPayment.create({
        data: {
          vendorBillId: testBillId,
          paymentType: "ADVANCE",
          amountPaise: 20000000n,
          paymentMethod: "NEFT_RTGS",
          transactionReference: "TX-VENDOR-PROCESSING",
          status: "PROCESSING"
        }
      });
      await prisma.auditLog.create({
        data: {
          entityName: "VendorPayment",
          entityId: processingPayment.id,
          action: "RECORD_PAYMENT",
          performedBy: users.FINANCE_DIRECTOR.user.id,
          detailsJson: "{}"
        }
      });

      const approveRes = await fetch(`${baseUrl}/api/finance/vendor-payments/${processingPayment.id}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(approveRes.status).toBe(400);
      const body = await approveRes.json();
      expect(body.error).toContain("must be PENDING");
    });

    // 6. Repeated approval is rejected
    it("6. Rejects repeated approval of an already cleared vendor payment", async () => {
      const doubleClear = await fetch(`${baseUrl}/api/finance/vendor-payments/${recordedVendorPaymentId}/clear`, {
        method: "PUT",
        headers: {
          Cookie: users.ADMIN.cookie,
          "X-CSRF-Token": users.ADMIN.csrf
        }
      });
      expect(doubleClear.status).toBe(400);
      const body = await doubleClear.json();
      expect(body.error).toContain("must be PENDING");
    });

    // 7. Concurrent approval attempts cannot produce duplicate clearance
    it("7. Concurrent approval attempts cannot produce duplicate clearance or dual audit logs", async () => {
      // Record a fresh pending payment by FINANCE_DIRECTOR via API
      const createRes = await fetch(`${baseUrl}/api/finance/vendor-payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: users.FINANCE_DIRECTOR.cookie,
          "X-CSRF-Token": users.FINANCE_DIRECTOR.csrf
        },
        body: JSON.stringify({
          vendorBillId: testBillId,
          paymentType: "FINAL_SETTLEMENT",
          amountPaise: 50000000,
          paymentMethod: "BANK_TRANSFER",
          transactionReference: "TX-VENDOR-CONCURRENT-001"
        })
      });
      expect(createRes.status).toBe(201);
      const concurrentPayment = await createRes.json();

      // Launch 2 simultaneous approval attempts by ADMIN
      const [res1, res2] = await Promise.all([
        fetch(`${baseUrl}/api/finance/vendor-payments/${concurrentPayment.id}/clear`, {
          method: "PUT",
          headers: {
            Cookie: users.ADMIN.cookie,
            "X-CSRF-Token": users.ADMIN.csrf
          }
        }),
        fetch(`${baseUrl}/api/finance/vendor-payments/${concurrentPayment.id}/clear`, {
          method: "PUT",
          headers: {
            Cookie: users.ADMIN.cookie,
            "X-CSRF-Token": users.ADMIN.csrf
          }
        })
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one request must succeed (200), and the competing concurrent request must fail (400)
      expect(statuses).toEqual([200, 400]);

      // Exactly ONE approval audit log must exist
      const approveLogs = await prisma.auditLog.findMany({
        where: {
          entityName: "VendorPayment",
          entityId: concurrentPayment.id,
          action: "APPROVE_PAYMENT"
        }
      });
      expect(approveLogs.length).toBe(1);

      // Final payment status is CLEARED
      const finalPayment = await prisma.vendorPayment.findUnique({
        where: { id: concurrentPayment.id }
      });
      expect(finalPayment?.status).toBe("CLEARED");
    });
  });

  // -------------------------------------------------------------
  // 7. FINANCIAL LEDGER READ VS AUDIT ANOMALY REDACTION
  // -------------------------------------------------------------
  it("redacts auditAnomalies from ledger response for users lacking finance:anomalies:read", async () => {
    // COORDINATOR lacks finance:ledger:read -> 403
    const coordLedger = await fetch(`${baseUrl}/api/finance/ledger/${testWeddingId}`, {
      headers: { Cookie: users.COORDINATOR.cookie }
    });
    expect(coordLedger.status).toBe(403);

    // LEAD_PLANNER has finance:ledger:read but LACKS finance:anomalies:read -> 200 with redacted anomalies
    const plannerLedger = await fetch(`${baseUrl}/api/finance/ledger/${testWeddingId}`, {
      headers: { Cookie: users.LEAD_PLANNER.cookie }
    });
    expect(plannerLedger.status).toBe(200);
    const plannerData = await plannerLedger.json();
    expect(plannerData.accrual).toBeDefined();
    expect(plannerData.cashFlow).toBeDefined();
    expect(plannerData.auditAnomalies).toEqual([]); // Redacted!

    // FINANCE_DIRECTOR has finance:anomalies:read -> 200 with full anomalies array
    const finLedger = await fetch(`${baseUrl}/api/finance/ledger/${testWeddingId}`, {
      headers: { Cookie: users.FINANCE_DIRECTOR.cookie }
    });
    expect(finLedger.status).toBe(200);
    const finData = await finLedger.json();
    expect(Array.isArray(finData.auditAnomalies)).toBe(true);

    // FOUNDER has finance:anomalies:read -> 200 with anomalies access
    const founderLedger = await fetch(`${baseUrl}/api/finance/ledger/${testWeddingId}`, {
      headers: { Cookie: users.FOUNDER.cookie }
    });
    expect(founderLedger.status).toBe(200);
  });

  // -------------------------------------------------------------
  // 8. SEASONAL ANALYTICS & DEDICATED TREASURY RESTRICTIONS
  // -------------------------------------------------------------
  it("strictly gates seasonal strategic analytics and separates treasury permissions", async () => {
    // Non-executive roles (COORDINATOR, LEAD_PLANNER, FINANCE_DIRECTOR) lack analytics:seasonal:read -> 403
    for (const r of ["COORDINATOR", "LEAD_PLANNER", "FINANCE_DIRECTOR"]) {
      const res = await fetch(`${baseUrl}/api/analytics/seasonal`, {
        headers: { Cookie: users[r].cookie }
      });
      expect(res.status).toBe(403);
    }

    // FOUNDER has analytics:seasonal:read and analytics:treasury:read -> 200 with full seasonal & treasury data
    const founderRes = await fetch(`${baseUrl}/api/analytics/seasonal`, {
      headers: { Cookie: users.FOUNDER.cookie }
    });
    expect(founderRes.status).toBe(200);
    const founderData = await founderRes.json();
    expect(founderData.seasonOverview).toBeDefined();
    expect(founderData.portfolioLedger).toBeDefined();

    // Dedicated Treasury route: FINANCE_DIRECTOR has analytics:treasury:read -> 200
    const finTreasury = await fetch(`${baseUrl}/api/analytics/treasury`, {
      headers: { Cookie: users.FINANCE_DIRECTOR.cookie }
    });
    expect(finTreasury.status).toBe(200);
    const finTreasuryData = await finTreasury.json();
    expect(finTreasuryData.portfolioLedger).toBeDefined();

    // Dedicated Treasury route: LEAD_PLANNER lacks analytics:treasury:read -> 403
    const plannerTreasury = await fetch(`${baseUrl}/api/analytics/treasury`, {
      headers: { Cookie: users.LEAD_PLANNER.cookie }
    });
    expect(plannerTreasury.status).toBe(403);
  });
});

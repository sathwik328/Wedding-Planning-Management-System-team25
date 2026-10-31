import { describe, it, expect, beforeEach } from "vitest";
import { PrismaClient } from "@prisma/client";
import { ClientBillingService } from "../src/services/clientBilling.service.js";

const prisma = new PrismaClient();
const service = new ClientBillingService(prisma);

describe("Client Billing & Milestone Invoicing Integration Tests", () => {
  const weddingId = "int-test-billing-wedding-uuid";
  const coupleId = "int-test-billing-couple-uuid";

  beforeEach(async () => {
    // Teardown
    await prisma.clientInvoiceMilestone.deleteMany({
      where: { invoice: { weddingId } }
    });
    await prisma.clientPayment.deleteMany({
      where: { clientInvoice: { weddingId } }
    });
    await prisma.clientInvoice.deleteMany({ where: { weddingId } });
    await prisma.paymentMilestone.deleteMany({ where: { weddingId } });
    await prisma.wedding.deleteMany({ where: { id: weddingId } });
    await prisma.couple.deleteMany({ where: { id: coupleId } });

    await prisma.couple.create({
      data: {
        id: coupleId,
        partnerOneName: "Aditya Kasliwal",
        partnerTwoName: "Sanaya Darda",
        email: "aditya.sanaya@test.in",
        phone: "+919829999020"
      }
    });

    await prisma.wedding.create({
      data: {
        id: weddingId,
        coupleId,
        title: "The Royal Wedding of Aditya & Sanaya",
        packageType: "FULL_SERVICE",
        startDate: new Date("2026-12-10T10:00:00Z"),
        endDate: new Date("2026-12-13T18:00:00Z"),
        primaryCity: "Udaipur",
        venueName: "The Oberoi Udaivilas",
        targetGuestCount: 450,
        totalBudgetPaise: 4000000000n, // ₹4 Crores
        status: "PLANNING"
      }
    });
  });

  it("handles milestone creation, structured invoice generation, and cleared payment lifecycle transitions", async () => {
    // 1. Create 3 structured milestones: Booking deposit, Mid advance, Final balance
    const m1 = await service.createMilestone({
      weddingId,
      type: "BOOKING_DEPOSIT",
      title: "Booking Deposit (20%)",
      dueDate: new Date("2026-09-01T00:00:00Z"),
      targetAmountPaise: 800000000n // ₹80 Lakhs
    });

    const m2 = await service.createMilestone({
      weddingId,
      type: "ADVANCE_PAYMENT",
      title: "Advance Payment (60%)",
      dueDate: new Date("2026-11-01T00:00:00Z"),
      targetAmountPaise: 2400000000n // ₹2.4 Crores
    });

    expect(m1.status).toBe("PENDING");
    expect(m2.status).toBe("PENDING");

    // 2. Issue Client Invoice for Milestone 1
    const invoice = await service.createInvoice({
      weddingId,
      invoiceNumber: "INV-AS-2026-001",
      invoiceType: "CONTRACT_MILESTONE",
      dueDate: new Date("2026-09-05T00:00:00Z"),
      subtotalPaise: 800000000n,
      taxPaise: 0n,
      totalAmountPaise: 800000000n,
      milestoneIds: [m1.id]
    });

    expect(invoice).toBeDefined();
    expect(invoice?.status).toBe("ISSUED");
    expect(invoice?.milestones.length).toBe(1);

    // 3. Record Partial Cleared Payment: ₹30 Lakhs (300000000 paise)
    const partialPayment = await service.recordClientPayment({
      clientInvoiceId: invoice!.id,
      amountPaise: 300000000n,
      paymentMethod: "NEFT_RTGS",
      transactionReference: "TX-NEFT-PARTIAL-001",
      status: "CLEARED"
    });

    expect(partialPayment.status).toBe("CLEARED");

    // Verify invoice transitioned to PARTIALLY_PAID
    const partialInv = await service.getInvoiceById(invoice!.id);
    expect(partialInv?.status).toBe("PARTIALLY_PAID");

    // 4. Record Remaining Payment as PENDING first: ₹50 Lakhs (500000000 paise)
    const pendingPayment = await service.recordClientPayment({
      clientInvoiceId: invoice!.id,
      amountPaise: 500000000n,
      paymentMethod: "BANK_TRANSFER",
      transactionReference: "TX-BANK-PENDING-002",
      status: "PENDING"
    });

    expect(pendingPayment.status).toBe("PENDING");
    // PENDING payment should not alter cleared cash status
    const stillPartialInv = await service.getInvoiceById(invoice!.id);
    expect(stillPartialInv?.status).toBe("PARTIALLY_PAID");

    // 5. Mark Pending Payment as CLEARED
    const clearedPayment = await service.markPaymentCleared(pendingPayment.id);
    expect(clearedPayment.status).toBe("CLEARED");
    expect(clearedPayment.clearedAt).toBeDefined();

    // Verify invoice transitioned to PAID and linked milestone transitioned to PAID
    const paidInv = await service.getInvoiceById(invoice!.id);
    expect(paidInv?.status).toBe("PAID");

    const paidMilestone = await prisma.paymentMilestone.findUnique({
      where: { id: m1.id }
    });
    expect(paidMilestone?.status).toBe("PAID");
  });
});

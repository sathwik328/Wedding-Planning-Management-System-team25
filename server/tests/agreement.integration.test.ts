import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { AgreementService } from "../src/services/agreement.service.js";

const prisma = new PrismaClient();
const agreementService = new AgreementService(prisma);

describe("Service Agreement & Digital Signature Capture Integration Tests (Developer A)", () => {
  let testCoupleId: string;

  beforeAll(async () => {
    // Create dedicated test couple
    const couple = await prisma.couple.create({
      data: {
        partnerOneName: "Test Maharaja Vikram",
        partnerTwoName: "Test Maharani Gayatri",
        email: "test.agreement.vikram@royalknot-test.in",
        phone: "+919829988000",
        address: "City Palace Grounds, Udaipur"
      }
    });
    testCoupleId = couple.id;
  });

  afterAll(async () => {
    if (testCoupleId) {
      await prisma.serviceAgreement.deleteMany({
        where: { coupleId: testCoupleId }
      });
      await prisma.auditLog.deleteMany({
        where: { performedBy: "Test Maharaja Vikram" }
      });
      await prisma.couple.deleteMany({
        where: { id: testCoupleId }
      });
    }
    await prisma.$disconnect();
  });

  it("Drafts a new luxury service agreement with BigInt fee and SHA-256 hash", async () => {
    const agreement = await agreementService.createOrUpdateAgreement({
      coupleId: testCoupleId,
      packageType: "FULL_SERVICE",
      agreedFeePaise: "450000000", // ₹45 Lakhs planning fee
      paymentTerms: "25% Advance on signing, 50% 60 days before, 25% on Day-1 of Wedding"
    });

    expect(agreement.id).toBeDefined();
    expect(agreement.coupleId).toBe(testCoupleId);
    expect(agreement.packageType).toBe("FULL_SERVICE");
    expect(agreement.agreedFeePaise).toBe(450000000n);
    expect(agreement.version).toBe(1);
    expect(agreement.agreementHash).toHaveLength(64);
    expect(agreement.isExecuted).toBe(false);
  });

  it("Updates draft agreement, increments version, and updates agreement hash", async () => {
    const updated = await agreementService.createOrUpdateAgreement({
      coupleId: testCoupleId,
      packageType: "FULL_SERVICE",
      agreedFeePaise: "500000000", // Adjusted to ₹50 Lakhs
      paymentTerms: "30% Advance on signing, 40% 60 days before, 30% on Day-1"
    });

    expect(updated.version).toBe(2);
    expect(updated.agreedFeePaise).toBe(500000000n);
    expect(updated.agreementHash).toHaveLength(64);
    expect(updated.isExecuted).toBe(false);
  });

  it("Executes digital signature capture, recording signer IP hash and audit log", async () => {
    const existing = await agreementService.getAgreementByCoupleId(testCoupleId);
    expect(existing).toBeDefined();

    const mockSignatureDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

    const signed = await agreementService.signAgreement(existing!.id, {
      signatureDataUrl: mockSignatureDataUrl,
      signedByName: "Test Maharaja Vikram",
      clientIp: "103.21.244.1"
    });

    expect(signed.isExecuted).toBe(true);
    expect(signed.signedByName).toBe("Test Maharaja Vikram");
    expect(signed.signedAt).toBeInstanceOf(Date);
    expect(signed.signatureDataUrl).toBe(mockSignatureDataUrl);
    expect(signed.signerIpAddressHash).toHaveLength(64);

    // Verify AuditLog creation
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityName: "ServiceAgreement",
        entityId: signed.id
      }
    });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toBe("DIGITAL_SIGNATURE_EXECUTED");
  });

  it("Rejects signature attempt on an already executed agreement", async () => {
    const existing = await agreementService.getAgreementByCoupleId(testCoupleId);
    expect(existing?.isExecuted).toBe(true);

    await expect(
      agreementService.signAgreement(existing!.id, {
        signatureDataUrl: "data:image/png;base64,1234567890",
        signedByName: "Test Maharaja Vikram"
      })
    ).rejects.toThrow("already been executed");
  });

  it("Rejects term modifications on an already executed agreement", async () => {
    await expect(
      agreementService.createOrUpdateAgreement({
        coupleId: testCoupleId,
        packageType: "PARTIAL_DAY_OF",
        agreedFeePaise: "200000000",
        paymentTerms: "100% upfront"
      })
    ).rejects.toThrow("Cannot alter an already executed Service Agreement");
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { CrmService } from "../src/services/crm.service.js";

const prisma = new PrismaClient();
const crmService = new CrmService(prisma);

describe("CRM & Enquiry Management Integration Tests (Developer A)", () => {
  beforeAll(async () => {
    // Clean up test enquiries created during this test
    await prisma.couple.deleteMany({
      where: { email: { contains: "test.couple." } }
    });
    await prisma.enquiry.deleteMany({
      where: { primaryEmail: { contains: "test.couple." } }
    });
  });

  afterAll(async () => {
    await prisma.couple.deleteMany({
      where: { email: { contains: "test.couple." } }
    });
    await prisma.enquiry.deleteMany({
      where: { primaryEmail: { contains: "test.couple." } }
    });
    await prisma.$disconnect();
  });

  it("Creates a new luxury wedding enquiry with BigInt budget ceiling in paise", async () => {
    const enquiry = await crmService.createEnquiry({
      coupleNames: "Rajveer Singh & Meenakshi Rathore",
      primaryEmail: "test.couple.rajveer@royalknot-test.in",
      primaryPhone: "+919829988771",
      source: "INSTAGRAM",
      roughDate: "2026-12-18T00:00:00.000Z",
      estimatedGuests: 450,
      themePreference: "Royal Rajputana Palace Gala",
      budgetCeilingPaise: "45000000000", // ₹45 Crore
      notes: "Interested in City Palace Udaipur"
    });

    expect(enquiry.id).toBeDefined();
    expect(enquiry.coupleNames).toBe("Rajveer Singh & Meenakshi Rathore");
    expect(enquiry.status).toBe("NEW");
    expect(enquiry.budgetCeilingPaise).toBe(45000000000n);
    expect(enquiry.estimatedGuests).toBe(450);
  });

  it("Lists enquiries and filters by status and search keyword", async () => {
    const listAll = await crmService.listEnquiries();
    expect(listAll.length).toBeGreaterThan(0);

    const searchResult = await crmService.listEnquiries({ search: "Rajveer" });
    expect(searchResult.length).toBe(1);
    expect(searchResult[0].primaryEmail).toBe("test.couple.rajveer@royalknot-test.in");

    const statusResult = await crmService.listEnquiries({ status: "NEW" });
    expect(statusResult.some((e) => e.primaryEmail === "test.couple.rajveer@royalknot-test.in")).toBe(true);
  });

  it("Schedules a consultation and updates pipeline status to CONSULTATION_SCHEDULED", async () => {
    const list = await crmService.listEnquiries({ search: "Rajveer" });
    const target = list[0];

    const scheduled = await crmService.scheduleConsultation(target.id, {
      consultationDate: "2026-11-05T15:30:00.000Z",
      notes: "Discussed mandate for Udaipur royal wedding."
    });

    expect(scheduled.status).toBe("CONSULTATION_SCHEDULED");
    expect(scheduled.consultationDate).toEqual(new Date("2026-11-05T15:30:00.000Z"));
    expect(scheduled.notes).toContain("[Consultation Note]: Discussed mandate for Udaipur royal wedding.");
  });

  it("Updates enquiry status through valid lifecycle transitions", async () => {
    const list = await crmService.listEnquiries({ search: "Rajveer" });
    const target = list[0];

    const updated = await crmService.updateEnquiryStatus(target.id, "AGREEMENT_SENT");
    expect(updated.status).toBe("AGREEMENT_SENT");

    await expect(crmService.updateEnquiryStatus(target.id, "INVALID_STATE")).rejects.toThrow(
      "Invalid enquiry status"
    );
  });

  it("Converts an enquiry into a formal Couple profile with dual partners", async () => {
    const list = await crmService.listEnquiries({ search: "Rajveer" });
    const target = list[0];

    const couple = await crmService.convertToCouple(target.id, {
      partnerOneName: "Rajveer Singh",
      partnerTwoName: "Meenakshi Rathore",
      address: "Mewar Palace Enclave, Udaipur"
    });

    expect(couple.id).toBeDefined();
    expect(couple.enquiryId).toBe(target.id);
    expect(couple.partnerOneName).toBe("Rajveer Singh");
    expect(couple.partnerTwoName).toBe("Meenakshi Rathore");
    expect(couple.email).toBe("test.couple.rajveer@royalknot-test.in");

    // Check that enquiry status is now CONVERTED
    const refetchedEnquiry = await crmService.getEnquiryById(target.id);
    expect(refetchedEnquiry?.status).toBe("CONVERTED");

    // Idempotent check: calling convert again returns the same profile
    const coupleAgain = await crmService.convertToCouple(target.id);
    expect(coupleAgain.id).toBe(couple.id);
  });
});

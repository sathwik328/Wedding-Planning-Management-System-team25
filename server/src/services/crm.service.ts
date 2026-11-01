import { PrismaClient, Enquiry, Couple } from "@prisma/client";

export interface CreateEnquiryInput {
  coupleNames: string;
  primaryEmail: string;
  primaryPhone: string;
  source: string;
  roughDate: string | Date;
  estimatedGuests?: number;
  themePreference?: string;
  budgetCeilingPaise: string | bigint;
  notes?: string;
}

export interface ScheduleConsultationInput {
  consultationDate: string | Date;
  notes?: string;
}

export interface ConvertCoupleInput {
  partnerOneName?: string;
  partnerTwoName?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export class CrmService {
  constructor(private prisma: PrismaClient) {}

  /**
   * List enquiries with optional status filter and search query
   */
  async listEnquiries(filter?: { status?: string; search?: string }): Promise<Enquiry[]> {
    const where: any = {};

    if (filter?.status && filter.status !== "ALL") {
      where.status = filter.status;
    }

    if (filter?.search) {
      const term = filter.search.trim();
      where.OR = [
        { coupleNames: { contains: term } },
        { primaryEmail: { contains: term } },
        { primaryPhone: { contains: term } },
        { themePreference: { contains: term } }
      ];
    }

    return this.prisma.enquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        couple: {
          select: {
            id: true,
            partnerOneName: true,
            partnerTwoName: true,
            email: true,
            phone: true
          }
        }
      }
    });
  }

  /**
   * Retrieve single enquiry with related couple profile
   */
  async getEnquiryById(id: string): Promise<Enquiry | null> {
    return this.prisma.enquiry.findUnique({
      where: { id },
      include: {
        couple: {
          include: {
            serviceAgreement: true,
            wedding: true
          }
        }
      }
    });
  }

  /**
   * Create a new VIP wedding enquiry
   */
  async createEnquiry(input: CreateEnquiryInput): Promise<Enquiry> {
    const budgetBigInt = typeof input.budgetCeilingPaise === "bigint"
      ? input.budgetCeilingPaise
      : BigInt(input.budgetCeilingPaise);

    return this.prisma.enquiry.create({
      data: {
        coupleNames: input.coupleNames.trim(),
        primaryEmail: input.primaryEmail.trim().toLowerCase(),
        primaryPhone: input.primaryPhone.trim(),
        source: input.source,
        roughDate: new Date(input.roughDate),
        estimatedGuests: input.estimatedGuests ?? 400,
        themePreference: input.themePreference?.trim(),
        budgetCeilingPaise: budgetBigInt,
        status: "NEW",
        notes: input.notes?.trim()
      }
    });
  }

  /**
   * Schedule consultation and update enquiry status
   */
  async scheduleConsultation(id: string, input: ScheduleConsultationInput): Promise<Enquiry> {
    const existing = await this.prisma.enquiry.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Enquiry with ID "${id}" not found.`);
    }

    const updatedNotes = input.notes
      ? existing.notes
        ? `${existing.notes}\n[Consultation Note]: ${input.notes}`
        : input.notes
      : existing.notes;

    return this.prisma.enquiry.update({
      where: { id },
      data: {
        consultationDate: new Date(input.consultationDate),
        status: "CONSULTATION_SCHEDULED",
        notes: updatedNotes
      }
    });
  }

  /**
   * Update enquiry pipeline status directly
   */
  async updateEnquiryStatus(id: string, status: string): Promise<Enquiry> {
    const validStatuses = ["NEW", "CONSULTATION_SCHEDULED", "AGREEMENT_SENT", "CONVERTED", "LOST"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid enquiry status: ${status}. Expected one of: ${validStatuses.join(", ")}`);
    }

    return this.prisma.enquiry.update({
      where: { id },
      data: { status }
    });
  }

  /**
   * Convert an Enquiry into a formal Couple profile with dual partners
   */
  async convertToCouple(enquiryId: string, input?: ConvertCoupleInput): Promise<Couple> {
    const enquiry = await this.prisma.enquiry.findUnique({
      where: { id: enquiryId },
      include: { couple: true }
    });

    if (!enquiry) {
      throw new Error(`Enquiry with ID "${enquiryId}" not found.`);
    }

    if (enquiry.couple) {
      return enquiry.couple;
    }

    // Split coupleNames if individual partner names were not explicitly provided
    let pOne = input?.partnerOneName?.trim();
    let pTwo = input?.partnerTwoName?.trim();

    if (!pOne || !pTwo) {
      const parts = enquiry.coupleNames.split(/&|and|\+/i);
      pOne = pOne || (parts[0]?.trim() || enquiry.coupleNames);
      pTwo = pTwo || (parts[1]?.trim() || "Partner");
    }

    return this.prisma.$transaction(async (tx) => {
      const couple = await tx.couple.create({
        data: {
          enquiryId: enquiry.id,
          partnerOneName: pOne!,
          partnerTwoName: pTwo!,
          email: input?.email?.trim().toLowerCase() || enquiry.primaryEmail,
          phone: input?.phone?.trim() || enquiry.primaryPhone,
          address: input?.address?.trim()
        }
      });

      await tx.enquiry.update({
        where: { id: enquiryId },
        data: { status: "CONVERTED" }
      });

      return couple;
    });
  }

  /**
   * List all couple dossiers
   */
  async listCouples(): Promise<Couple[]> {
    return this.prisma.couple.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        enquiry: true,
        serviceAgreement: true,
        wedding: {
          select: {
            id: true,
            title: true,
            venueName: true,
            startDate: true,
            endDate: true,
            status: true
          }
        }
      }
    });
  }

  /**
   * Retrieve single couple dossier by ID
   */
  async getCoupleById(id: string): Promise<Couple | null> {
    return this.prisma.couple.findUnique({
      where: { id },
      include: {
        enquiry: true,
        serviceAgreement: true,
        wedding: {
          include: {
            days: {
              include: { schedules: true }
            },
            tasks: true
          }
        }
      }
    });
  }
}

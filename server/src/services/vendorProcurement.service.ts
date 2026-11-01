import { PrismaClient } from "@prisma/client";

export interface CreateVendorInput {
  businessName: string;
  category: string;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  notes?: string;
}

export interface UpdateVendorInput {
  businessName?: string;
  category?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  city?: string;
  notes?: string;
}

export interface CreateRfqGroupInput {
  weddingId: string;
  title: string;
  category: string;
  targetGuestCount: number;
  vendorIds: string[];
  requirement: string;
}

export interface QuotationLineItemInput {
  description: string;
  quantityScaledUnits: bigint; // Scale 1000: 1 unit = 1000n, 2.5 hours = 2500n
  unitPricePaise: bigint;
  totalPricePaise: bigint;
}

export interface SubmitQuotationInput {
  vendorRequestId: string;
  vendorId: string;
  quoteReference: string;
  menuDescription?: string;
  pricePerPlatePaise?: bigint;
  baseAmountPaise: bigint;
  extraHourRatePaise?: bigint;
  documentUrl?: string;
  lineItems: QuotationLineItemInput[];
}

export interface AwardQuotationResult {
  rfqGroupId: string;
  awardedQuotationId: string;
  weddingVendorId: string;
  rejectedRequestCount: number;
}

export interface QuotationComparisonMatrix {
  rfqGroup: {
    id: string;
    weddingId: string;
    weddingTitle: string;
    title: string;
    category: string;
    targetGuestCount: number;
    status: string;
    awardedQuotationId: string | null;
  };
  quotations: Array<{
    quotationId: string;
    vendorId: string;
    vendorName: string;
    quoteReference: string;
    baseAmountPaise: string;
    pricePerPlatePaise: string | null;
    extraHourRatePaise: string;
    menuDescription: string | null;
    isSelectedWinner: boolean;
    lineItems: Array<{
      id: string;
      description: string;
      quantityScaledUnits: string;
      unitPricePaise: string;
      totalPricePaise: string;
    }>;
    estimated400PaxTotalPaise: string;
  }>;
  lowestBaseAmountPaise: string;
  highestBaseAmountPaise: string;
  spreadPaise: string;
}

/**
 * Service handling luxury vendor directories, RFQ groups,
 * quotation submissions, multi-vendor line-by-line comparison,
 * and atomic winning vendor selection & contract linking.
 */
export class VendorProcurementService {
  constructor(private readonly prisma: PrismaClient) {}

  // -------------------------------------------------------------
  // VENDOR DIRECTORY & PROFILES
  // -------------------------------------------------------------

  async listVendors(filters?: { category?: string; city?: string; search?: string }) {
    const where: any = {};
    if (filters?.category) {
      where.category = filters.category;
    }
    if (filters?.city) {
      where.city = filters.city;
    }
    if (filters?.search) {
      where.OR = [
        { businessName: { contains: filters.search } },
        { contactPerson: { contains: filters.search } },
        { email: { contains: filters.search } }
      ];
    }

    return this.prisma.vendor.findMany({
      where,
      orderBy: { businessName: "asc" },
      include: {
        _count: {
          select: {
            quotations: true,
            weddingVendors: true
          }
        }
      }
    });
  }

  async getVendorById(id: string) {
    return this.prisma.vendor.findUnique({
      where: { id },
      include: {
        quotations: {
          include: {
            lineItems: true,
            vendorRequest: {
              include: {
                group: {
                  include: {
                    wedding: true
                  }
                }
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        weddingVendors: {
          include: {
            wedding: true,
            vendorBills: {
              include: {
                payments: true
              }
            }
          }
        }
      }
    });
  }

  async createVendor(data: CreateVendorInput) {
    return this.prisma.vendor.create({
      data: {
        businessName: data.businessName,
        category: data.category,
        contactPerson: data.contactPerson,
        phone: data.phone,
        email: data.email,
        city: data.city,
        notes: data.notes
      }
    });
  }

  async updateVendor(id: string, data: UpdateVendorInput) {
    return this.prisma.vendor.update({
      where: { id },
      data
    });
  }

  // -------------------------------------------------------------
  // RFQ GROUPS & QUOTATION REQUESTS
  // -------------------------------------------------------------

  async createRfqGroup(data: CreateRfqGroupInput) {
    if (!data.vendorIds || data.vendorIds.length === 0) {
      throw new Error("At least one vendor must be invited to the RFQ group");
    }

    // Verify wedding exists
    const wedding = await this.prisma.wedding.findUnique({
      where: { id: data.weddingId }
    });
    if (!wedding) {
      throw new Error(`Wedding with ID "${data.weddingId}" not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.quotationRequestGroup.create({
        data: {
          weddingId: data.weddingId,
          title: data.title,
          category: data.category,
          targetGuestCount: data.targetGuestCount || wedding.targetGuestCount,
          status: "OPEN"
        }
      });

      // Create vendor requests for all invited vendors
      for (const vendorId of data.vendorIds) {
        await tx.vendorRequest.create({
          data: {
            quotationRequestGroupId: group.id,
            vendorId,
            requirement: data.requirement,
            status: "PENDING"
          }
        });
      }

      return tx.quotationRequestGroup.findUnique({
        where: { id: group.id },
        include: {
          requests: {
            include: {
              vendor: true
            }
          }
        }
      });
    });
  }

  async listRfqGroupsForWedding(weddingId: string) {
    return this.prisma.quotationRequestGroup.findMany({
      where: { weddingId },
      include: {
        requests: {
          include: {
            vendor: true,
            quotation: {
              include: {
                lineItems: true
              }
            }
          }
        },
        awardedQuotation: {
          include: {
            vendor: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getRfqGroupDetails(groupId: string) {
    return this.prisma.quotationRequestGroup.findUnique({
      where: { id: groupId },
      include: {
        wedding: {
          include: {
            couple: true
          }
        },
        requests: {
          include: {
            vendor: true,
            quotation: {
              include: {
                lineItems: true
              }
            }
          }
        },
        awardedQuotation: {
          include: {
            vendor: true,
            lineItems: true
          }
        }
      }
    });
  }

  // -------------------------------------------------------------
  // QUOTATION SUBMISSION WITH LINE ITEMS
  // -------------------------------------------------------------

  async submitQuotation(data: SubmitQuotationInput) {
    return this.prisma.$transaction(async (tx) => {
      const vendorRequest = await tx.vendorRequest.findUnique({
        where: { id: data.vendorRequestId },
        include: { group: true }
      });

      if (!vendorRequest) {
        throw new Error(`Vendor request with ID "${data.vendorRequestId}" not found`);
      }

      if (vendorRequest.group.status === "AWARDED") {
        throw new Error("Cannot submit quotation to an already awarded RFQ group");
      }

      // Check if quotation already exists for this request
      const existingQuote = await tx.vendorQuotation.findUnique({
        where: { vendorRequestId: data.vendorRequestId }
      });
      if (existingQuote) {
        throw new Error("A quotation has already been submitted for this vendor request");
      }

      const quotation = await tx.vendorQuotation.create({
        data: {
          vendorRequestId: data.vendorRequestId,
          vendorId: data.vendorId,
          quoteReference: data.quoteReference,
          menuDescription: data.menuDescription,
          pricePerPlatePaise: data.pricePerPlatePaise,
          baseAmountPaise: data.baseAmountPaise,
          extraHourRatePaise: data.extraHourRatePaise || 0n,
          documentUrl: data.documentUrl,
          isSelectedWinner: false,
          lineItems: {
            create: data.lineItems.map((item) => ({
              description: item.description,
              quantityScaledUnits: item.quantityScaledUnits,
              unitPricePaise: item.unitPricePaise,
              totalPricePaise: item.totalPricePaise
            }))
          }
        },
        include: {
          lineItems: true
        }
      });

      // Update vendor request status to QUOTE_RECEIVED
      await tx.vendorRequest.update({
        where: { id: data.vendorRequestId },
        data: { status: "QUOTE_RECEIVED" }
      });

      return quotation;
    });
  }

  // -------------------------------------------------------------
  // THREE-VENDOR & LINE-BY-LINE COMPARISON MATRIX
  // -------------------------------------------------------------

  async getQuotationComparisonMatrix(groupId: string): Promise<QuotationComparisonMatrix> {
    const group = await this.prisma.quotationRequestGroup.findUnique({
      where: { id: groupId },
      include: {
        wedding: true,
        requests: {
          include: {
            vendor: true,
            quotation: {
              include: {
                lineItems: true
              }
            }
          }
        }
      }
    });

    if (!group) {
      throw new Error(`Quotation request group "${groupId}" not found`);
    }

    const quotesWithDetails = group.requests
      .filter((r) => r.quotation !== null)
      .map((r) => {
        const q = r.quotation!;
        // Estimate total for target guests if catering (pricePerPlate * targetGuests)
        let estimated400PaxBig = q.baseAmountPaise;
        if (q.pricePerPlatePaise && group.targetGuestCount) {
          const plateEst = q.pricePerPlatePaise * BigInt(group.targetGuestCount);
          if (plateEst > estimated400PaxBig) {
            estimated400PaxBig = plateEst;
          }
        }

        return {
          quotationId: q.id,
          vendorId: r.vendor.id,
          vendorName: r.vendor.businessName,
          quoteReference: q.quoteReference,
          baseAmountPaise: q.baseAmountPaise.toString(),
          pricePerPlatePaise: q.pricePerPlatePaise ? q.pricePerPlatePaise.toString() : null,
          extraHourRatePaise: q.extraHourRatePaise.toString(),
          menuDescription: q.menuDescription,
          isSelectedWinner: q.isSelectedWinner,
          lineItems: q.lineItems.map((li) => ({
            id: li.id,
            description: li.description,
            quantityScaledUnits: li.quantityScaledUnits.toString(),
            unitPricePaise: li.unitPricePaise.toString(),
            totalPricePaise: li.totalPricePaise.toString()
          })),
          estimated400PaxTotalPaise: estimated400PaxBig.toString()
        };
      });

    let lowestBig = 0n;
    let highestBig = 0n;

    if (quotesWithDetails.length > 0) {
      const bases = quotesWithDetails.map((q) => BigInt(q.baseAmountPaise));
      lowestBig = bases.reduce((min, b) => (b < min ? b : min), bases[0]);
      highestBig = bases.reduce((max, b) => (b > max ? b : max), bases[0]);
    }

    const spreadBig = highestBig >= lowestBig ? highestBig - lowestBig : 0n;

    return {
      rfqGroup: {
        id: group.id,
        weddingId: group.weddingId,
        weddingTitle: group.wedding.title,
        title: group.title,
        category: group.category,
        targetGuestCount: group.targetGuestCount,
        status: group.status,
        awardedQuotationId: group.awardedQuotationId
      },
      quotations: quotesWithDetails,
      lowestBaseAmountPaise: lowestBig.toString(),
      highestBaseAmountPaise: highestBig.toString(),
      spreadPaise: spreadBig.toString()
    };
  }

  // -------------------------------------------------------------
  // WINNING VENDOR SELECTION & AUTOMATIC CLOSURE
  // -------------------------------------------------------------

  async awardWinningQuotation(groupId: string, quotationId: string): Promise<AwardQuotationResult> {
    return this.prisma.$transaction(async (tx) => {
      const group = await tx.quotationRequestGroup.findUnique({
        where: { id: groupId },
        include: {
          requests: {
            include: {
              quotation: true
            }
          }
        }
      });

      if (!group) {
        throw new Error(`Quotation request group "${groupId}" not found`);
      }

      if (group.status === "AWARDED") {
        throw new Error(`Group "${group.title}" is already awarded`);
      }

      const targetQuote = await tx.vendorQuotation.findUnique({
        where: { id: quotationId },
        include: {
          vendorRequest: true
        }
      });

      if (!targetQuote) {
        throw new Error(`Quotation with ID "${quotationId}" not found`);
      }

      if (targetQuote.vendorRequest.quotationRequestGroupId !== groupId) {
        throw new Error("Quotation does not belong to the specified RFQ group");
      }

      // 1. Mark selected quotation as winner
      await tx.vendorQuotation.update({
        where: { id: quotationId },
        data: { isSelectedWinner: true }
      });

      // 2. Mark winning vendor request as AWARDED
      await tx.vendorRequest.update({
        where: { id: targetQuote.vendorRequestId },
        data: { status: "AWARDED" }
      });

      // 3. Mark all competing requests in this group as REJECTED_COMPETING_AWARDED
      const competingRequests = group.requests.filter(
        (r) => r.id !== targetQuote.vendorRequestId
      );

      for (const comp of competingRequests) {
        await tx.vendorRequest.update({
          where: { id: comp.id },
          data: { status: "REJECTED_COMPETING_AWARDED" }
        });
      }

      // 4. Update group status to AWARDED and set awardedQuotationId
      await tx.quotationRequestGroup.update({
        where: { id: groupId },
        data: {
          status: "AWARDED",
          awardedQuotationId: quotationId
        }
      });

      // 5. Link winning vendor to Wedding as WeddingVendor with agreedBaselineAmountPaise
      const weddingVendor = await tx.weddingVendor.create({
        data: {
          weddingId: group.weddingId,
          vendorId: targetQuote.vendorId,
          quotationRequestGroupId: groupId,
          serviceCategory: group.category,
          quotationId: quotationId,
          agreedBaselineAmountPaise: targetQuote.baseAmountPaise,
          status: "CONTRACTED"
        }
      });

      return {
        rfqGroupId: groupId,
        awardedQuotationId: quotationId,
        weddingVendorId: weddingVendor.id,
        rejectedRequestCount: competingRequests.length
      };
    });
  }
}

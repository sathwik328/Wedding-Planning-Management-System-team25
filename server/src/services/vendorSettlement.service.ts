import { PrismaClient } from "@prisma/client";

export interface CreateVendorBillInput {
  weddingVendorId: string;
  billNumber: string;
  baseAmountPaise: bigint;
  extraAmountPaise?: bigint;
  totalBilledPaise?: bigint;
  additionalChargeIds?: string[];
}

export interface ReconcileBillInput {
  billId: string;
  varianceReason: string;
  reconciliationNotes: string;
}

export interface RecordVendorPaymentInput {
  vendorBillId: string;
  paymentType: "ADVANCE" | "FINAL_SETTLEMENT";
  amountPaise: bigint;
  paymentMethod: "NEFT_RTGS" | "CHEQUE" | "BANK_TRANSFER";
  transactionReference: string;
  status?: "PENDING" | "PROCESSING" | "CLEARED";
  clearedAt?: Date;
  notes?: string;
}

export interface CreateAdditionalChargeInput {
  weddingId: string;
  description: string;
  reasonType: "EXTRA_GUESTS" | "EXTENDED_HOURS" | "EMERGENCY_EQUIPMENT" | "INCIDENT_RESOLUTION" | "MISC";
  quantityScaledUnits?: bigint; // Scale 1000: 1 = 1000n, 2.5 = 2500n
  unitCostPaise: bigint;
  totalCostPaise: bigint;
  vendorId?: string;
  weddingVendorId?: string;
  incidentId?: string;
  billedToClient?: boolean;
}

export interface BillReconciliationSummary {
  billId: string;
  billNumber: string;
  vendorName: string;
  serviceCategory: string;
  baselineAgreedPaise: string;
  totalBilledPaise: string;
  variancePaise: string;
  isOverBudget: boolean;
  reconciled: boolean;
  varianceReason: string | null;
  reconciliationNotes: string | null;
  clearedPaidPaise: string;
  remainingPayablePaise: string;
}

/**
 * Service managing vendor bills, advance payments, final settlements,
 * quotation baseline reconciliation, and additional charges.
 */
export class VendorSettlementService {
  constructor(private readonly prisma: PrismaClient) {}

  // -------------------------------------------------------------
  // VENDOR BILLS
  // -------------------------------------------------------------

  async listBillsForWedding(weddingId: string) {
    return this.prisma.vendorBill.findMany({
      where: {
        weddingVendor: {
          weddingId
        }
      },
      include: {
        weddingVendor: {
          include: {
            vendor: true,
            quotation: true
          }
        },
        additionalCharges: true,
        payments: {
          orderBy: { paymentDate: "desc" }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async getBillById(id: string) {
    return this.prisma.vendorBill.findUnique({
      where: { id },
      include: {
        weddingVendor: {
          include: {
            wedding: true,
            vendor: true,
            quotation: {
              include: {
                lineItems: true
              }
            }
          }
        },
        additionalCharges: true,
        payments: true
      }
    });
  }

  async createVendorBill(data: CreateVendorBillInput) {
    return this.prisma.$transaction(async (tx) => {
      const weddingVendor = await tx.weddingVendor.findUnique({
        where: { id: data.weddingVendorId },
        include: { vendor: true }
      });

      if (!weddingVendor) {
        throw new Error(`Wedding vendor "${data.weddingVendorId}" not found`);
      }

      const total =
        data.totalBilledPaise ?? data.baseAmountPaise + (data.extraAmountPaise || 0n);

      const bill = await tx.vendorBill.create({
        data: {
          weddingVendorId: data.weddingVendorId,
          billNumber: data.billNumber,
          baseAmountPaise: data.baseAmountPaise,
          extraAmountPaise: data.extraAmountPaise || 0n,
          totalBilledPaise: total,
          status: "SUBMITTED",
          reconciled: false
        }
      });

      // Link any additional charges to this bill (anti-double-counting guard)
      if (data.additionalChargeIds && data.additionalChargeIds.length > 0) {
        for (const chargeId of data.additionalChargeIds) {
          await tx.additionalCharge.update({
            where: { id: chargeId },
            data: {
              vendorBillId: bill.id,
              weddingVendorId: data.weddingVendorId
            }
          });
        }
      }

      return tx.vendorBill.findUnique({
        where: { id: bill.id },
        include: {
          weddingVendor: {
            include: {
              vendor: true
            }
          },
          additionalCharges: true
        }
      });
    });
  }

  // -------------------------------------------------------------
  // BILL RECONCILIATION AGAINST AGREED QUOTATION
  // -------------------------------------------------------------

  async reconcileBill(data: ReconcileBillInput): Promise<BillReconciliationSummary> {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.findUnique({
        where: { id: data.billId },
        include: {
          weddingVendor: {
            include: {
              vendor: true
            }
          },
          payments: true
        }
      });

      if (!bill) {
        throw new Error(`Vendor bill "${data.billId}" not found`);
      }

      const baselineBig = bill.weddingVendor.agreedBaselineAmountPaise;
      const billedBig = bill.totalBilledPaise;
      const varianceBig = billedBig - baselineBig;

      await tx.vendorBill.update({
        where: { id: data.billId },
        data: {
          reconciled: true,
          varianceReason: data.varianceReason,
          reconciliationNotes: data.reconciliationNotes,
          status: bill.status === "DRAFT" ? "APPROVED" : bill.status
        }
      });

      let clearedPaidBig = 0n;
      for (const p of bill.payments) {
        if (p.status === "CLEARED") {
          clearedPaidBig += p.amountPaise;
        }
      }

      const remainingBig = billedBig > clearedPaidBig ? billedBig - clearedPaidBig : 0n;

      return {
        billId: bill.id,
        billNumber: bill.billNumber,
        vendorName: bill.weddingVendor.vendor.businessName,
        serviceCategory: bill.weddingVendor.serviceCategory,
        baselineAgreedPaise: baselineBig.toString(),
        totalBilledPaise: billedBig.toString(),
        variancePaise: varianceBig.toString(),
        isOverBudget: varianceBig > 0n,
        reconciled: true,
        varianceReason: data.varianceReason,
        reconciliationNotes: data.reconciliationNotes,
        clearedPaidPaise: clearedPaidBig.toString(),
        remainingPayablePaise: remainingBig.toString()
      };
    });
  }

  // -------------------------------------------------------------
  // VENDOR ADVANCES & FINAL SETTLEMENT PAYMENTS
  // -------------------------------------------------------------

  async recordVendorPayment(data: RecordVendorPaymentInput) {
    return this.prisma.$transaction(async (tx) => {
      const bill = await tx.vendorBill.findUnique({
        where: { id: data.vendorBillId },
        include: { payments: true }
      });

      if (!bill) {
        throw new Error(`Vendor bill "${data.vendorBillId}" not found`);
      }

      const status = data.status || "PENDING";
      const clearedAt = status === "CLEARED" ? data.clearedAt || new Date() : null;

      const payment = await tx.vendorPayment.create({
        data: {
          vendorBillId: data.vendorBillId,
          paymentType: data.paymentType,
          amountPaise: data.amountPaise,
          paymentMethod: data.paymentMethod,
          transactionReference: data.transactionReference,
          status,
          clearedAt,
          notes: data.notes
        }
      });

      // Recalculate cleared total on bill
      let clearedSumBig = 0n;
      for (const p of bill.payments) {
        if (p.status === "CLEARED") {
          clearedSumBig += p.amountPaise;
        }
      }
      if (status === "CLEARED") {
        clearedSumBig += data.amountPaise;
      }

      // If fully cleared, mark bill as PAID
      if (clearedSumBig >= bill.totalBilledPaise && bill.status !== "PAID") {
        await tx.vendorBill.update({
          where: { id: bill.id },
          data: { status: "PAID" }
        });
      }

      return payment;
    });
  }

  async markVendorPaymentCleared(paymentId: string, clearedAt?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.vendorPayment.findUnique({
        where: { id: paymentId },
        include: {
          vendorBill: {
            include: {
              payments: true
            }
          }
        }
      });

      if (!payment) {
        throw new Error(`Vendor payment "${paymentId}" not found`);
      }

      if (payment.status === "CLEARED") {
        return payment;
      }

      const updatedPayment = await tx.vendorPayment.update({
        where: { id: paymentId },
        data: {
          status: "CLEARED",
          clearedAt: clearedAt || new Date()
        }
      });

      const bill = payment.vendorBill;
      let clearedSumBig = 0n;
      for (const p of bill.payments) {
        if (p.id === paymentId) {
          clearedSumBig += payment.amountPaise;
        } else if (p.status === "CLEARED") {
          clearedSumBig += p.amountPaise;
        }
      }

      if (clearedSumBig >= bill.totalBilledPaise && bill.status !== "PAID") {
        await tx.vendorBill.update({
          where: { id: bill.id },
          data: { status: "PAID" }
        });
      }

      return updatedPayment;
    });
  }

  // -------------------------------------------------------------
  // ADDITIONAL CHARGES (EXTRAS & INCIDENTS)
  // -------------------------------------------------------------

  async listAdditionalChargesForWedding(weddingId: string) {
    return this.prisma.additionalCharge.findMany({
      where: { weddingId },
      include: {
        vendor: true,
        weddingVendor: true,
        incident: true,
        vendorBill: true,
        clientInvoice: true,
        directPayments: true
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async createAdditionalCharge(data: CreateAdditionalChargeInput) {
    return this.prisma.additionalCharge.create({
      data: {
        weddingId: data.weddingId,
        description: data.description,
        reasonType: data.reasonType,
        quantityScaledUnits: data.quantityScaledUnits || 1000n,
        unitCostPaise: data.unitCostPaise,
        totalCostPaise: data.totalCostPaise,
        vendorId: data.vendorId,
        weddingVendorId: data.weddingVendorId,
        incidentId: data.incidentId,
        billedToClient: data.billedToClient ?? true,
        status: "PENDING"
      },
      include: {
        vendor: true,
        incident: true
      }
    });
  }
}

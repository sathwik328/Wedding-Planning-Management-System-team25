import { PrismaClient } from "@prisma/client";

export interface CreatePaymentMilestoneInput {
  weddingId: string;
  type: "BOOKING_DEPOSIT" | "ADVANCE_PAYMENT" | "FINAL_SETTLEMENT";
  title: string;
  dueDate: Date;
  targetAmountPaise: bigint;
}

export interface CreateClientInvoiceInput {
  weddingId: string;
  invoiceNumber: string;
  invoiceType: "CONTRACT_MILESTONE" | "SUPPLEMENTARY_EXTRAS";
  dueDate: Date;
  subtotalPaise: bigint;
  taxPaise?: bigint;
  extraChargesPaise?: bigint;
  totalAmountPaise: bigint;
  milestoneIds?: string[];
  additionalChargeIds?: string[];
}

export interface RecordClientPaymentInput {
  clientInvoiceId: string;
  amountPaise: bigint;
  paymentMethod: "NEFT_RTGS" | "CHEQUE" | "BANK_TRANSFER";
  transactionReference: string;
  status?: "PENDING" | "PROCESSING" | "CLEARED";
  clearedAt?: Date;
  notes?: string;
  performedBy?: string;
}

/**
 * Service managing luxury client milestones, invoices, and structured
 * payments with integer Indian paise and strict cash-clearing rules.
 */
export class ClientBillingService {
  constructor(private readonly prisma: PrismaClient) {}

  // -------------------------------------------------------------
  // PAYMENT MILESTONES
  // -------------------------------------------------------------

  async listMilestonesForWedding(weddingId: string) {
    return this.prisma.paymentMilestone.findMany({
      where: { weddingId },
      include: {
        invoiceLinks: {
          include: {
            invoice: {
              include: {
                payments: true
              }
            }
          }
        }
      },
      orderBy: { dueDate: "asc" }
    });
  }

  async createMilestone(data: CreatePaymentMilestoneInput) {
    return this.prisma.paymentMilestone.create({
      data: {
        weddingId: data.weddingId,
        type: data.type,
        title: data.title,
        dueDate: data.dueDate,
        targetAmountPaise: data.targetAmountPaise,
        status: "PENDING"
      }
    });
  }

  // -------------------------------------------------------------
  // CLIENT INVOICES
  // -------------------------------------------------------------

  async listInvoicesForWedding(weddingId: string) {
    return this.prisma.clientInvoice.findMany({
      where: { weddingId },
      include: {
        milestones: {
          include: {
            milestone: true
          }
        },
        additionalCharges: true,
        payments: {
          orderBy: { paymentDate: "desc" }
        }
      },
      orderBy: { issueDate: "desc" }
    });
  }

  async getInvoiceById(id: string) {
    return this.prisma.clientInvoice.findUnique({
      where: { id },
      include: {
        wedding: {
          include: {
            couple: true
          }
        },
        milestones: {
          include: {
            milestone: true
          }
        },
        additionalCharges: true,
        payments: true
      }
    });
  }

  async createInvoice(data: CreateClientInvoiceInput) {
    return this.prisma.$transaction(async (tx) => {
      // Calculate total if not explicitly provided
      const total =
        data.totalAmountPaise ??
        data.subtotalPaise + (data.taxPaise || 0n) + (data.extraChargesPaise || 0n);

      const invoice = await tx.clientInvoice.create({
        data: {
          weddingId: data.weddingId,
          invoiceNumber: data.invoiceNumber,
          invoiceType: data.invoiceType,
          dueDate: data.dueDate,
          subtotalPaise: data.subtotalPaise,
          taxPaise: data.taxPaise || 0n,
          extraChargesPaise: data.extraChargesPaise || 0n,
          totalAmountPaise: total,
          status: "ISSUED"
        }
      });

      // Link milestones if provided
      if (data.milestoneIds && data.milestoneIds.length > 0) {
        for (const milestoneId of data.milestoneIds) {
          await tx.clientInvoiceMilestone.create({
            data: {
              invoiceId: invoice.id,
              milestoneId
            }
          });
        }
      }

      // Link additional charges if provided
      if (data.additionalChargeIds && data.additionalChargeIds.length > 0) {
        for (const chargeId of data.additionalChargeIds) {
          await tx.additionalCharge.update({
            where: { id: chargeId },
            data: { clientInvoiceId: invoice.id }
          });
        }
      }

      return tx.clientInvoice.findUnique({
        where: { id: invoice.id },
        include: {
          milestones: {
            include: {
              milestone: true
            }
          },
          additionalCharges: true
        }
      });
    });
  }

  // -------------------------------------------------------------
  // CLIENT PAYMENTS & LIFECYCLE
  // -------------------------------------------------------------

  async recordClientPayment(data: RecordClientPaymentInput) {
    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.clientInvoice.findUnique({
        where: { id: data.clientInvoiceId },
        include: {
          payments: true,
          milestones: {
            include: {
              milestone: true
            }
          }
        }
      });

      if (!invoice) {
        throw new Error(`Client invoice "${data.clientInvoiceId}" not found`);
      }

      const status = data.status || "PENDING";
      const clearedAt = status === "CLEARED" ? data.clearedAt || new Date() : null;

      const payment = await tx.clientPayment.create({
        data: {
          clientInvoiceId: data.clientInvoiceId,
          amountPaise: data.amountPaise,
          paymentMethod: data.paymentMethod,
          transactionReference: data.transactionReference,
          status,
          clearedAt,
          notes: data.notes
        }
      });

      // Atomic creation of audit log to prevent inconsistent commitment
      if (data.performedBy) {
        await tx.auditLog.create({
          data: {
            entityName: "ClientPayment",
            entityId: payment.id,
            action: "RECORD_PAYMENT",
            performedBy: data.performedBy,
            detailsJson: JSON.stringify({
              userId: data.performedBy,
              amountPaise: payment.amountPaise.toString(),
              clientInvoiceId: payment.clientInvoiceId,
              transactionReference: payment.transactionReference
            })
          }
        });
      }

      // Recalculate cleared total on invoice
      let clearedSumBig = 0n;
      for (const p of invoice.payments) {
        if (p.status === "CLEARED") {
          clearedSumBig += p.amountPaise;
        }
      }
      if (status === "CLEARED") {
        clearedSumBig += data.amountPaise;
      }

      // Determine updated invoice status
      let newInvoiceStatus = invoice.status;
      if (clearedSumBig >= invoice.totalAmountPaise) {
        newInvoiceStatus = "PAID";
      } else if (clearedSumBig > 0n) {
        newInvoiceStatus = "PARTIALLY_PAID";
      }

      if (newInvoiceStatus !== invoice.status) {
        await tx.clientInvoice.update({
          where: { id: invoice.id },
          data: { status: newInvoiceStatus }
        });

        // Also update linked milestones if invoice is PAID
        if (newInvoiceStatus === "PAID" && invoice.milestones.length > 0) {
          for (const m of invoice.milestones) {
            await tx.paymentMilestone.update({
              where: { id: m.milestoneId },
              data: { status: "PAID" }
            });
          }
        } else if (newInvoiceStatus === "PARTIALLY_PAID" && invoice.milestones.length > 0) {
          for (const m of invoice.milestones) {
            await tx.paymentMilestone.update({
              where: { id: m.milestoneId },
              data: { status: "PARTIALLY_PAID" }
            });
          }
        }
      }

      return payment;
    });
  }

  async markPaymentCleared(paymentId: string, clearedAt?: Date) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.clientPayment.findUnique({
        where: { id: paymentId },
        include: {
          clientInvoice: {
            include: {
              payments: true,
              milestones: true
            }
          }
        }
      });

      if (!payment) {
        throw new Error(`Client payment "${paymentId}" not found`);
      }

      if (payment.status === "CLEARED") {
        return payment;
      }

      const updatedPayment = await tx.clientPayment.update({
        where: { id: paymentId },
        data: {
          status: "CLEARED",
          clearedAt: clearedAt || new Date()
        }
      });

      // Recalculate invoice cleared sum
      const invoice = payment.clientInvoice;
      let clearedSumBig = 0n;
      for (const p of invoice.payments) {
        if (p.id === paymentId) {
          clearedSumBig += payment.amountPaise;
        } else if (p.status === "CLEARED") {
          clearedSumBig += p.amountPaise;
        }
      }

      let newInvoiceStatus = invoice.status;
      if (clearedSumBig >= invoice.totalAmountPaise) {
        newInvoiceStatus = "PAID";
      } else if (clearedSumBig > 0n) {
        newInvoiceStatus = "PARTIALLY_PAID";
      }

      if (newInvoiceStatus !== invoice.status) {
        await tx.clientInvoice.update({
          where: { id: invoice.id },
          data: { status: newInvoiceStatus }
        });

        if (newInvoiceStatus === "PAID") {
          for (const m of invoice.milestones) {
            await tx.paymentMilestone.update({
              where: { id: m.milestoneId },
              data: { status: "PAID" }
            });
          }
        }
      }

      return updatedPayment;
    });
  }
}

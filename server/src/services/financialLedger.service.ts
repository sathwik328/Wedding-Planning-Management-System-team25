import { PrismaClient } from "@prisma/client";
import { PaiseString } from "shared";

export interface LedgerAuditAnomaly {
  code:
    | "BILL_PAID_STATUS_WITH_CLEARED_SHORTFALL"
    | "BILL_CLEARED_PAYMENTS_EXCEED_BILLED_TOTAL"
    | "INVOICE_PAID_STATUS_WITH_CLEARED_SHORTFALL"
    | "INVOICE_CLEARED_PAYMENTS_EXCEED_INVOICED_TOTAL"
    | "CHARGE_CLEARED_PAYMENTS_EXCEED_TOTAL_COST"
    | "CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST";
  severity: "WARNING" | "CRITICAL";
  entityId: string;
  referenceNumber: string;
  targetAmountPaise: string;
  clearedOrCommittedAmountPaise: string;
  discrepancyPaise: string;
  explanation: string;
}

export interface AuthoritativeLedgerReport {
  accrual: {
    invoicedClientRevenuePaise: PaiseString;
    recognizedVendorExpensesPaise: PaiseString;
    directAgencyExpensesPaise: PaiseString;
    internalLaborCostsPaise: PaiseString;
    operatingProfitPaise: PaiseString;
  };
  cashFlow: {
    clearedClientInflowsPaise: PaiseString;
    clearedVendorOutflowsPaise: PaiseString;
    clearedDirectExpensesPaise: PaiseString;
    netActualCashFlowPaise: PaiseString;
  };
  workingCapital: {
    outstandingClientReceivablesPaise: PaiseString;
    clientCreditBalancePaise: PaiseString;
    pendingClientPaymentsPaise: PaiseString;
    unpaidVendorLiabilitiesPaise: PaiseString;
    vendorAdvanceCreditPaise: PaiseString;
    pendingVendorPaymentsPaise: PaiseString;
    unpaidDirectExpensesPaise: PaiseString;
    pendingDirectPaymentsPaise: PaiseString;
  };
  auditAnomalies: LedgerAuditAnomaly[];
}

export async function computeAuthoritativeWeddingLedger(
  prisma: PrismaClient,
  weddingId: string
): Promise<AuthoritativeLedgerReport> {
  const auditAnomalies: LedgerAuditAnomaly[] = [];

  // =========================================================================
  // 1. CLIENT INVOICES & CLEARED CLIENT PAYMENTS
  // =========================================================================
  const clientInvoices = await prisma.clientInvoice.findMany({
    where: {
      weddingId,
      status: { not: "CANCELLED" }
    },
    include: { payments: true }
  });

  let invoicedRevenueBig = 0n;
  let clearedClientInflowsBig = 0n;
  let pendingClientPaymentsBig = 0n;

  for (const inv of clientInvoices) {
    invoicedRevenueBig += inv.totalAmountPaise;
    let invClearedBig = 0n;

    for (const payment of inv.payments) {
      if (payment.status === "CLEARED") {
        clearedClientInflowsBig += payment.amountPaise;
        invClearedBig += payment.amountPaise;
      } else if (payment.status === "PENDING" || payment.status === "PROCESSING") {
        pendingClientPaymentsBig += payment.amountPaise;
      }
      // FAILED and CANCELLED payments are ignored in cash calculations
    }

    // Anomaly Check 3: Invoice marked PAID with cleared shortfall
    if (inv.status === "PAID" && invClearedBig < inv.totalAmountPaise) {
      auditAnomalies.push({
        code: "INVOICE_PAID_STATUS_WITH_CLEARED_SHORTFALL",
        severity: "CRITICAL",
        entityId: inv.id,
        referenceNumber: inv.invoiceNumber,
        targetAmountPaise: inv.totalAmountPaise.toString(),
        clearedOrCommittedAmountPaise: invClearedBig.toString(),
        discrepancyPaise: (inv.totalAmountPaise - invClearedBig).toString(),
        explanation: `Client invoice "${inv.invoiceNumber}" is marked PAID, but cleared payments (₹${invClearedBig / 100n}) are less than invoiced total (₹${inv.totalAmountPaise / 100n})`
      });
    }

    // Anomaly Check 4: Invoice cleared payments exceed invoiced total
    if (invClearedBig > inv.totalAmountPaise) {
      auditAnomalies.push({
        code: "INVOICE_CLEARED_PAYMENTS_EXCEED_INVOICED_TOTAL",
        severity: "WARNING",
        entityId: inv.id,
        referenceNumber: inv.invoiceNumber,
        targetAmountPaise: inv.totalAmountPaise.toString(),
        clearedOrCommittedAmountPaise: invClearedBig.toString(),
        discrepancyPaise: (invClearedBig - inv.totalAmountPaise).toString(),
        explanation: `Cleared payments for client invoice "${inv.invoiceNumber}" exceed invoiced total by ₹${(invClearedBig - inv.totalAmountPaise) / 100n}`
      });
    }
  }

  // =========================================================================
  // 2. VENDOR BILLS & CLEARED VENDOR PAYMENTS
  // =========================================================================
  const weddingVendors = await prisma.weddingVendor.findMany({
    where: { weddingId },
    include: {
      vendorBills: {
        where: { status: { in: ["SUBMITTED", "APPROVED", "PAID"] } },
        include: { payments: true }
      }
    }
  });

  let recognizedVendorExpensesBig = 0n;
  let clearedVendorOutflowsBig = 0n;
  let pendingVendorPaymentsBig = 0n;

  for (const wv of weddingVendors) {
    for (const bill of wv.vendorBills) {
      recognizedVendorExpensesBig += bill.totalBilledPaise;
      let billClearedBig = 0n;

      for (const vp of bill.payments) {
        if (vp.status === "CLEARED") {
          clearedVendorOutflowsBig += vp.amountPaise;
          billClearedBig += vp.amountPaise;
        } else if (vp.status === "PENDING" || vp.status === "PROCESSING") {
          pendingVendorPaymentsBig += vp.amountPaise;
        }
      }

      // Anomaly Check 1: Vendor bill marked PAID with cleared shortfall
      if (bill.status === "PAID" && billClearedBig < bill.totalBilledPaise) {
        auditAnomalies.push({
          code: "BILL_PAID_STATUS_WITH_CLEARED_SHORTFALL",
          severity: "CRITICAL",
          entityId: bill.id,
          referenceNumber: bill.billNumber,
          targetAmountPaise: bill.totalBilledPaise.toString(),
          clearedOrCommittedAmountPaise: billClearedBig.toString(),
          discrepancyPaise: (bill.totalBilledPaise - billClearedBig).toString(),
          explanation: `Vendor bill "${bill.billNumber}" is marked PAID, but cleared payments (₹${billClearedBig / 100n}) are less than total billed (₹${bill.totalBilledPaise / 100n})`
        });
      }

      // Anomaly Check 2: Vendor bill cleared payments exceed billed total
      if (billClearedBig > bill.totalBilledPaise) {
        auditAnomalies.push({
          code: "BILL_CLEARED_PAYMENTS_EXCEED_BILLED_TOTAL",
          severity: "WARNING",
          entityId: bill.id,
          referenceNumber: bill.billNumber,
          targetAmountPaise: bill.totalBilledPaise.toString(),
          clearedOrCommittedAmountPaise: billClearedBig.toString(),
          discrepancyPaise: (billClearedBig - bill.totalBilledPaise).toString(),
          explanation: `Cleared payments for vendor bill "${bill.billNumber}" exceed total billed by ₹${(billClearedBig - bill.totalBilledPaise) / 100n}`
        });
      }
    }
  }

  // =========================================================================
  // 3. DIRECT AGENCY CHARGES & DIRECT EXPENSE PAYMENTS (vendorBillId === null)
  // =========================================================================
  const directCharges = await prisma.additionalCharge.findMany({
    where: {
      weddingId,
      vendorBillId: null // ANTI-DOUBLE-COUNTING: Exclude vendor-billed charges
    },
    include: { directPayments: true }
  });

  let accrualDirectExpensesBig = 0n;
  let clearedDirectExpensesBig = 0n;
  let pendingDirectPaymentsBig = 0n;

  for (const charge of directCharges) {
    // In Accrual P&L: Both pass-through and unbilled overheads are operating expenses
    accrualDirectExpensesBig += charge.totalCostPaise;

    let chargeClearedBig = 0n;
    let chargeCommittedBig = 0n;

    for (const dp of charge.directPayments) {
      if (dp.status === "CLEARED") {
        clearedDirectExpensesBig += dp.amountPaise;
        chargeClearedBig += dp.amountPaise;
        chargeCommittedBig += dp.amountPaise;
      } else if (dp.status === "PENDING" || dp.status === "PROCESSING") {
        pendingDirectPaymentsBig += dp.amountPaise;
        chargeCommittedBig += dp.amountPaise;
      }
    }

    // Anomaly Check 5: Direct charge cleared payments exceed total cost
    if (chargeClearedBig > charge.totalCostPaise) {
      auditAnomalies.push({
        code: "CHARGE_CLEARED_PAYMENTS_EXCEED_TOTAL_COST",
        severity: "CRITICAL",
        entityId: charge.id,
        referenceNumber: charge.description,
        targetAmountPaise: charge.totalCostPaise.toString(),
        clearedOrCommittedAmountPaise: chargeClearedBig.toString(),
        discrepancyPaise: (chargeClearedBig - charge.totalCostPaise).toString(),
        explanation: `Cleared payments for direct expense "${charge.description}" exceed total charge cost by ₹${(chargeClearedBig - charge.totalCostPaise) / 100n}`
      });
    }

    // Anomaly Check 6: Direct charge committed payments exceed total cost
    if (chargeCommittedBig > charge.totalCostPaise) {
      auditAnomalies.push({
        code: "CHARGE_COMMITTED_PAYMENTS_EXCEED_TOTAL_COST",
        severity: "WARNING",
        entityId: charge.id,
        referenceNumber: charge.description,
        targetAmountPaise: charge.totalCostPaise.toString(),
        clearedOrCommittedAmountPaise: chargeCommittedBig.toString(),
        discrepancyPaise: (chargeCommittedBig - charge.totalCostPaise).toString(),
        explanation: `Total committed payments (cleared + pending) for direct expense "${charge.description}" exceed total cost by ₹${(chargeCommittedBig - charge.totalCostPaise) / 100n}`
      });
    }
  }

  // Unpaid Direct Expenses: Accrued direct costs minus cleared cash disbursals
  const unpaidDirectDifference = accrualDirectExpensesBig - clearedDirectExpensesBig;
  const unpaidDirectExpensesBig = unpaidDirectDifference > 0n ? unpaidDirectDifference : 0n;

  // =========================================================================
  // 4. INTERNAL PLANNING LABOR
  // =========================================================================
  const workLogs = await prisma.teamWorkLog.findMany({ where: { weddingId } });
  let internalLaborBig = 0n;
  for (const log of workLogs) {
    internalLaborBig += log.totalLaborCostPaise;
  }

  // =========================================================================
  // 5. NET FINANCIAL EQUATIONS
  // =========================================================================
  const accrualProfitBig =
    invoicedRevenueBig - recognizedVendorExpensesBig - accrualDirectExpensesBig - internalLaborBig;

  const netCashFlowBig =
    clearedClientInflowsBig - clearedVendorOutflowsBig - clearedDirectExpensesBig;

  // Working Capital Decoupling (No negative receivables or liabilities)
  const netReceivableDifference = invoicedRevenueBig - clearedClientInflowsBig;
  const outstandingReceivablesBig = netReceivableDifference > 0n ? netReceivableDifference : 0n;
  const clientCreditBalanceBig = netReceivableDifference < 0n ? -netReceivableDifference : 0n;

  const netVendorDifference = recognizedVendorExpensesBig - clearedVendorOutflowsBig;
  const unpaidVendorLiabilitiesBig = netVendorDifference > 0n ? netVendorDifference : 0n;
  const vendorAdvanceCreditBig = netVendorDifference < 0n ? -netVendorDifference : 0n;

  return {
    accrual: {
      invoicedClientRevenuePaise: invoicedRevenueBig.toString() as PaiseString,
      recognizedVendorExpensesPaise: recognizedVendorExpensesBig.toString() as PaiseString,
      directAgencyExpensesPaise: accrualDirectExpensesBig.toString() as PaiseString,
      internalLaborCostsPaise: internalLaborBig.toString() as PaiseString,
      operatingProfitPaise: accrualProfitBig.toString() as PaiseString
    },
    cashFlow: {
      clearedClientInflowsPaise: clearedClientInflowsBig.toString() as PaiseString,
      clearedVendorOutflowsPaise: clearedVendorOutflowsBig.toString() as PaiseString,
      clearedDirectExpensesPaise: clearedDirectExpensesBig.toString() as PaiseString,
      netActualCashFlowPaise: netCashFlowBig.toString() as PaiseString
    },
    workingCapital: {
      outstandingClientReceivablesPaise: outstandingReceivablesBig.toString() as PaiseString,
      clientCreditBalancePaise: clientCreditBalanceBig.toString() as PaiseString,
      pendingClientPaymentsPaise: pendingClientPaymentsBig.toString() as PaiseString,
      unpaidVendorLiabilitiesPaise: unpaidVendorLiabilitiesBig.toString() as PaiseString,
      vendorAdvanceCreditPaise: vendorAdvanceCreditBig.toString() as PaiseString,
      pendingVendorPaymentsPaise: pendingVendorPaymentsBig.toString() as PaiseString,
      unpaidDirectExpensesPaise: unpaidDirectExpensesBig.toString() as PaiseString,
      pendingDirectPaymentsPaise: pendingDirectPaymentsBig.toString() as PaiseString
    },
    auditAnomalies
  };
}

import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { RecordPaymentModal } from './RecordPaymentModal';
import { BillReconciliationModal } from './BillReconciliationModal';
import {
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatPaiseToINR } from 'shared';

export interface FinanceWeddingSummaryItem {
  id: string;
  title: string;
  primaryCity: string;
}

export interface AuthoritativeLedgerReport {
  accrual: {
    invoicedClientRevenuePaise: string;
    recognizedVendorExpensesPaise: string;
    directAgencyExpensesPaise: string;
    internalLaborCostsPaise: string;
    operatingProfitPaise: string;
  };
  cashFlow: {
    clearedClientInflowsPaise: string;
    clearedVendorOutflowsPaise: string;
    clearedDirectExpensesPaise: string;
    netActualCashFlowPaise: string;
  };
  workingCapital: {
    outstandingClientReceivablesPaise: string;
    clientCreditBalancePaise: string;
    pendingClientPaymentsPaise: string;
    unpaidVendorLiabilitiesPaise: string;
    vendorAdvanceCreditPaise: string;
    pendingVendorPaymentsPaise: string;
    unpaidDirectExpensesPaise: string;
    pendingDirectPaymentsPaise: string;
  };
  auditAnomalies: Array<{
    code: string;
    severity: 'WARNING' | 'CRITICAL';
    entityId: string;
    referenceNumber: string;
    targetAmountPaise: string;
    clearedOrCommittedAmountPaise: string;
    discrepancyPaise: string;
    explanation: string;
  }>;
}

export const FinanceLedgerPage: React.FC = () => {
  const [weddings, setWeddings] = useState<FinanceWeddingSummaryItem[]>([]);
  const [selectedWeddingId, setSelectedWeddingId] = useState<string>('');

  const [ledger, setLedger] = useState<AuthoritativeLedgerReport | null>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modals state
  const [paymentModalProps, setPaymentModalProps] = useState<{
    isOpen: boolean;
    type: 'CLIENT' | 'VENDOR' | 'DIRECT';
    targetId: string;
    targetTitle: string;
    defaultAmountPaise?: string;
  }>({
    isOpen: false,
    type: 'CLIENT',
    targetId: '',
    targetTitle: ''
  });

  const [reconciliationModalProps, setReconciliationModalProps] = useState<{
    isOpen: boolean;
    bill: any | null;
  }>({
    isOpen: false,
    bill: null
  });

  const fetchWeddings = async () => {
    try {
      const res = await fetch('/api/analytics/seasonal');
      if (res.ok) {
        const data = await res.json();
        if (data.weddings) {
          const list: FinanceWeddingSummaryItem[] = data.weddings.map((w: any) => ({
            id: w.weddingId,
            title: w.weddingTitle,
            primaryCity: w.primaryCity
          }));
          setWeddings(list);
          if (list.length > 0 && !selectedWeddingId) {
            setSelectedWeddingId(list[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load weddings', err);
    }
  };

  const fetchWeddingFinancials = async (weddingId: string) => {
    if (!weddingId) return;
    setIsLoading(true);
    try {
      const [ledgerRes, invoicesRes, billsRes] = await Promise.all([
        fetch(`/api/finance/ledger/${weddingId}`),
        fetch(`/api/finance/invoices/${weddingId}`),
        fetch(`/api/finance/bills/${weddingId}`)
      ]);

      if (ledgerRes.ok) setLedger(await ledgerRes.json());
      if (invoicesRes.ok) setInvoices(await invoicesRes.json());
      if (billsRes.ok) setBills(await billsRes.json());
    } catch (err) {
      console.error('Failed to load financial records', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeddings();
  }, []);

  useEffect(() => {
    if (selectedWeddingId) {
      fetchWeddingFinancials(selectedWeddingId);
    }
  }, [selectedWeddingId]);

  return (
    <div className="space-y-6">
      {/* Page Header & Wedding Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#5B1424]">
            Audited Financial Ledger & Cash Flow
          </h2>
          <p className="text-xs text-[#718096] mt-0.5">
            Developer B Scope • Strict integer BigInt paise, 6-vector anomaly watchdog & baseline reconciliation
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#1E2229]">Select Wedding:</span>
          <select
            value={selectedWeddingId}
            onChange={(e) => setSelectedWeddingId(e.target.value)}
            className="text-xs px-3 py-1.5 border border-[#E7E2D8] rounded bg-white font-medium text-[#1E2229] focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          >
            {weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} ({w.primaryCity})
              </option>
            ))}
          </select>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedWeddingId && fetchWeddingFinancials(selectedWeddingId)}
            isLoading={isLoading}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Authoritative Ledger Trio: Cash Flow, Accrual, Working Capital */}
      {ledger && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Actual Cash Flow */}
          <Card
            title="Authoritative Cash Flow"
            subtitle="Strictly verified and cleared actual movements"
            action={<Badge variant="success" size="sm">Cleared Cash</Badge>}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                <span className="text-[#718096] flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                  Cleared Client Inflows:
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatPaiseToINR(ledger.cashFlow.clearedClientInflowsPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                <span className="text-[#718096] flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                  Cleared Vendor Outflows:
                </span>
                <span className="font-mono font-bold text-rose-700">
                  {formatPaiseToINR(ledger.cashFlow.clearedVendorOutflowsPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                <span className="text-[#718096] flex items-center gap-1.5">
                  <ArrowDownRight className="w-3.5 h-3.5 text-stone-600" />
                  Direct Cleared Expenses:
                </span>
                <span className="font-mono font-bold text-stone-700">
                  {formatPaiseToINR(ledger.cashFlow.clearedDirectExpensesPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="font-semibold text-[#1E2229]">Net Cash Position:</span>
                <span
                  className={`font-mono font-bold text-base ${
                    BigInt(ledger.cashFlow.netActualCashFlowPaise) >= 0n
                      ? 'text-[#5B1424]'
                      : 'text-rose-700'
                  }`}
                >
                  {formatPaiseToINR(ledger.cashFlow.netActualCashFlowPaise)}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 2: Accrual Profitability Engine */}
          <Card
            title="Accrual Operating Margin"
            subtitle="Invoiced client revenue vs recognized commitments"
            action={<Badge variant="gold" size="sm">Accrual Engine</Badge>}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                <span className="text-[#718096]">Invoiced Client Revenue:</span>
                <span className="font-mono font-bold text-[#1E2229]">
                  {formatPaiseToINR(ledger.accrual.invoicedClientRevenuePaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                <span className="text-[#718096]">Vendor Bill Commitments:</span>
                <span className="font-mono font-bold text-[#1E2229]">
                  {formatPaiseToINR(ledger.accrual.recognizedVendorExpensesPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                <span className="text-[#718096]">Direct Pass-Throughs:</span>
                <span className="font-mono text-[#718096]">
                  {formatPaiseToINR(ledger.accrual.directAgencyExpensesPaise)}
                </span>
              </div>

              <div className="flex justify-between items-center text-sm pt-1">
                <span className="font-semibold text-[#1E2229]">Accrual Net Profit:</span>
                <span className="font-mono font-bold text-emerald-800 text-base">
                  {formatPaiseToINR(ledger.accrual.operatingProfitPaise)}
                </span>
              </div>
            </div>
          </Card>

          {/* Card 3: Ledger Watchdog & Anomalies */}
          <Card
            title="Ledger Anomaly Watchdog"
            subtitle="Automated 6-vector audit checks"
            action={
              ledger.auditAnomalies.length === 0 ? (
                <Badge variant="success" size="sm" dot>Clean Audit</Badge>
              ) : (
                <Badge variant="danger" size="sm" dot>
                  {ledger.auditAnomalies.length} Flagged
                </Badge>
              )
            }
          >
            {ledger.auditAnomalies.length === 0 ? (
              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Pass-Through Margin Balance:
                  </span>
                  <span className="font-mono font-semibold">Exact 0.00%</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Vendor Bill Reconciliation:
                  </span>
                  <span className="font-mono font-semibold">100% Compliant</span>
                </div>
                <div className="p-2.5 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Payment Ceiling Guard:
                  </span>
                  <span className="font-mono font-semibold">Locked & Safe</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {ledger.auditAnomalies.map((anom, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-900"
                  >
                    <div className="flex items-center justify-between font-bold mb-1">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                        {anom.code}
                      </span>
                      <span className="text-[10px] font-mono">{anom.referenceNumber}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">{anom.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Client Invoices & Milestones */}
      <Card
        title="Client Payment Milestones & Issued Invoices"
        subtitle="Manage client contracts, invoice issuance, and cleared NEFT/RTGS collections."
      >
        {invoices.length === 0 ? (
          <p className="text-xs text-[#718096] italic py-4">
            No client invoices generated for this wedding yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Invoice No</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Due Date</th>
                  <th className="px-4 py-2.5 font-semibold">Total Amount</th>
                  <th className="px-4 py-2.5 font-semibold">Cleared Inflow</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]">
                {invoices.map((inv) => {
                  let clearedBig = 0n;
                  for (const p of inv.payments || []) {
                    if (p.status === 'CLEARED') clearedBig += BigInt(p.amountPaise);
                  }
                  const isPaid = inv.status === 'PAID';

                  return (
                    <tr key={inv.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#1E2229]">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral" size="sm">
                          {inv.invoiceType.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#718096]">
                        {new Date(inv.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#1E2229]">
                        {formatPaiseToINR(inv.totalAmountPaise)}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-emerald-800">
                        {formatPaiseToINR(clearedBig.toString())}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isPaid ? 'success' : 'warning'} size="sm" dot>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isPaid && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              setPaymentModalProps({
                                isOpen: true,
                                type: 'CLIENT',
                                targetId: inv.id,
                                targetTitle: `Invoice ${inv.invoiceNumber}`,
                                defaultAmountPaise: (
                                  BigInt(inv.totalAmountPaise) - clearedBig
                                ).toString()
                              })
                            }
                          >
                            Record Inflow
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Vendor Bills & Quotation Reconciliation */}
      <Card
        title="Vendor Bills, Agreed Baseline Reconciliations & Settlements"
        subtitle="Agreed baseline quotation variance auditing, advances, and final disbursements."
      >
        {bills.length === 0 ? (
          <p className="text-xs text-[#718096] italic py-4">
            No vendor bills submitted for contracted partners in this wedding yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Bill No</th>
                  <th className="px-4 py-2.5 font-semibold">Partner</th>
                  <th className="px-4 py-2.5 font-semibold">Agreed Baseline</th>
                  <th className="px-4 py-2.5 font-semibold">Billed Total</th>
                  <th className="px-4 py-2.5 font-semibold">Reconciliation</th>
                  <th className="px-4 py-2.5 font-semibold">Payment Status</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E2D8]">
                {bills.map((b) => {
                  const baselineBig = BigInt(
                    b.weddingVendor.agreedBaselineAmountPaise
                  );
                  const billedBig = BigInt(b.totalBilledPaise);
                  const varianceBig = billedBig - baselineBig;
                  const isPaid = b.status === 'PAID';

                  return (
                    <tr key={b.id} className="hover:bg-[#FDFBF7] transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-[#1E2229]">
                        {b.billNumber}
                      </td>
                      <td className="px-4 py-3 font-serif font-semibold text-[#1E2229]">
                        {b.weddingVendor?.vendor?.businessName}
                      </td>
                      <td className="px-4 py-3 font-mono text-[#718096]">
                        {formatPaiseToINR(baselineBig.toString())}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#1E2229]">
                        {formatPaiseToINR(b.totalBilledPaise)}
                      </td>
                      <td className="px-4 py-3">
                        {b.reconciled ? (
                          <Badge variant="success" size="sm" dot>
                            Reconciled ({varianceBig > 0n ? `+₹${varianceBig / 100n}` : 'Match'})
                          </Badge>
                        ) : (
                          <Badge variant="warning" size="sm" dot>
                            Pending Audit
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={isPaid ? 'success' : 'neutral'} size="sm">
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {!b.reconciled && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              setReconciliationModalProps({
                                isOpen: true,
                                bill: {
                                  id: b.id,
                                  billNumber: b.billNumber,
                                  vendorName: b.weddingVendor.vendor.businessName,
                                  baselineAgreedPaise: baselineBig.toString(),
                                  totalBilledPaise: billedBig.toString()
                                }
                              })
                            }
                          >
                            Reconcile
                          </Button>
                        )}

                        {!isPaid && (
                          <Button
                            variant="gold"
                            size="sm"
                            onClick={() =>
                              setPaymentModalProps({
                                isOpen: true,
                                type: 'VENDOR',
                                targetId: b.id,
                                targetTitle: `Bill ${b.billNumber} (${b.weddingVendor.vendor.businessName})`,
                                defaultAmountPaise: b.totalBilledPaise
                              })
                            }
                          >
                            Disburse
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <RecordPaymentModal
        isOpen={paymentModalProps.isOpen}
        onClose={() => setPaymentModalProps((prev) => ({ ...prev, isOpen: false }))}
        type={paymentModalProps.type}
        targetId={paymentModalProps.targetId}
        targetTitle={paymentModalProps.targetTitle}
        defaultAmountPaise={paymentModalProps.defaultAmountPaise}
        weddingId={selectedWeddingId}
        onPaymentRecorded={() => fetchWeddingFinancials(selectedWeddingId)}
      />

      <BillReconciliationModal
        isOpen={reconciliationModalProps.isOpen}
        onClose={() => setReconciliationModalProps({ isOpen: false, bill: null })}
        bill={reconciliationModalProps.bill}
        onReconciled={() => fetchWeddingFinancials(selectedWeddingId)}
      />
    </div>
  );
};

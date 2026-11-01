import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Crown,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Receipt,
  ArrowDownRight
} from 'lucide-react';
import { formatPaiseToINR, formatPaiseCompact } from 'shared';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';

export interface SeasonalFinancialAnalytics {
  seasonOverview: {
    totalWeddings: number;
    completedWeddings: number;
    activeWeddings: number;
    planningWeddings: number;
    totalTargetGuests: number;
    averageGuestCount: number;
    totalBudgetPaise: string;
    averageBudgetPaise: string;
  };
  portfolioLedger?: {
    accrual: {
      totalInvoicedRevenuePaise: string;
      totalVendorExpensesPaise: string;
      totalDirectExpensesPaise: string;
      totalLaborCostPaise: string;
      totalOperatingProfitPaise: string;
      operatingProfitMarginPercent: number;
    };
    cashFlow: {
      totalClearedInflowsPaise: string;
      totalClearedOutflowsPaise: string;
      totalClearedDirectExpensesPaise: string;
      netCashPositionPaise: string;
    };
    workingCapital: {
      totalOutstandingReceivablesPaise: string;
      totalUnpaidVendorLiabilitiesPaise: string;
      totalUnpaidDirectExpensesPaise: string;
    };
  };
  marginByPackageType: {
    fullService: {
      count: number;
      invoicedRevenuePaise: string;
      operatingProfitPaise: string;
      marginPercent: number;
    };
    partialService: {
      count: number;
      invoicedRevenuePaise: string;
      operatingProfitPaise: string;
      marginPercent: number;
    };
  };
  auditAnomaliesTotal: number;
  weddings: Array<{
    weddingId: string;
    weddingTitle: string;
    packageType: string;
    primaryCity: string;
    venueName: string;
    targetGuestCount: number;
    totalBudgetPaise: string;
    ledger: {
      accrual: {
        invoicedClientRevenuePaise: string;
        operatingProfitPaise: string;
      };
      cashFlow: {
        netActualCashFlowPaise: string;
      };
      auditAnomalies: any[];
    };
  }>;
}

export interface VendorPerformanceItem {
  id: string;
  businessName: string;
  category: string;
  city: string;
  contactPerson: string;
  _count: {
    quotations: number;
    weddingVendors: number;
  };
}

export const FounderAnalyticsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const canViewSeasonal = hasPermission('analytics:seasonal:read');
  const canViewTreasury = hasPermission('analytics:treasury:read');
  const canViewVendors = hasPermission('procurement:vendor:read');

  const [data, setData] = useState<SeasonalFinancialAnalytics | null>(null);
  const [vendors, setVendors] = useState<VendorPerformanceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    if (!canViewSeasonal) return;
    setIsLoading(true);
    try {
      const res = await apiFetch('/api/analytics/seasonal');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
      if (canViewVendors) {
        const vendorRes = await apiFetch('/api/vendors');
        if (vendorRes.ok) {
          const vJson = await vendorRes.json();
          setVendors(Array.isArray(vJson) ? vJson : []);
        }
      }
    } catch (err) {
      console.error('Failed to load seasonal analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [canViewSeasonal, canViewVendors]);

  if (!canViewSeasonal) {
    return (
      <div className="p-8 text-center bg-rose-50 border border-rose-200 rounded text-rose-900 max-w-lg mx-auto my-12">
        <ShieldCheck className="w-10 h-10 text-rose-700 mx-auto mb-2 opacity-80" />
        <h3 className="font-serif text-lg font-bold">Access Restricted</h3>
        <p className="text-xs text-rose-700 mt-1">
          Founder Strategic Analytics requires executive Founder or Admin authorization.
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-[#7A6E63]">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-[#B89358]" />
        Computing authoritative seasonal financial analytics...
      </div>
    );
  }

  const { seasonOverview, portfolioLedger, marginByPackageType } = data;

  // Derive total operating expenses from actual accrual ledger
  const totalExpensesPaise = portfolioLedger
    ? (
        BigInt(portfolioLedger.accrual.totalVendorExpensesPaise) +
        BigInt(portfolioLedger.accrual.totalDirectExpensesPaise) +
        BigInt(portfolioLedger.accrual.totalLaborCostPaise)
      ).toString()
    : '0';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#231E1B]">
            Founder Season Review & Strategic Analytics
          </h2>
          <p className="text-xs text-[#7A6E63] mt-0.5">
            Executive Overview • High-season Rajasthan luxury portfolio financials, cash flows & vendor performance
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={fetchAnalytics}
          isLoading={isLoading}
        >
          Refresh Season Data
        </Button>
      </div>

      {/* Row 1: Primary Executive KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Weddings & Pipeline Stages */}
        <div className="p-4 bg-white border border-[#EDE5DC] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7A6E63] mb-1">
            <span className="font-semibold uppercase tracking-wider">Weddings Portfolio</span>
            <Crown className="w-4 h-4 text-[#B89358]" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-light text-[#231E1B]">
            {seasonOverview.totalWeddings} Weddings
          </div>
          <div className="text-[11px] text-[#7A6E63] mt-1 flex flex-wrap gap-1.5">
            <span className="text-emerald-700 font-semibold">{seasonOverview.completedWeddings} Completed</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{seasonOverview.activeWeddings} Active</span>
            <span>•</span>
            <span className="text-blue-700 font-semibold">{seasonOverview.planningWeddings} Upcoming</span>
          </div>
        </div>

        {/* Total Revenue */}
        <div className="p-4 bg-white border border-[#EDE5DC] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7A6E63] mb-1">
            <span className="font-semibold uppercase tracking-wider">Invoiced Revenue</span>
            <Receipt className="w-4 h-4 text-[#B89358]" />
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-light text-[#231E1B]">
            {portfolioLedger ? formatPaiseCompact(portfolioLedger.accrual.totalInvoicedRevenuePaise) : 'Gated'}
          </div>
          <div className="text-[11px] text-[#7A6E63] mt-1">
            Total Season Budget: <span className="font-mono font-medium">{formatPaiseCompact(seasonOverview.totalBudgetPaise)}</span>
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-4 bg-white border border-[#EDE5DC] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7A6E63] mb-1">
            <span className="font-semibold uppercase tracking-wider">Recognized Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-rose-800">
            {portfolioLedger ? formatPaiseCompact(totalExpensesPaise) : 'Gated'}
          </div>
          <div className="text-[11px] text-[#7A6E63] mt-1">
            Vendor, direct charges & internal labor
          </div>
        </div>

        {/* Profitability & Operating Margin */}
        <div className="p-4 bg-white border border-[#EDE5DC] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#7A6E63] mb-1">
            <span className="font-semibold uppercase tracking-wider">Operating Profitability</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-800">
            {portfolioLedger ? formatPaiseCompact(portfolioLedger.accrual.totalOperatingProfitPaise) : 'Gated'}
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {portfolioLedger ? `${portfolioLedger.accrual.operatingProfitMarginPercent.toFixed(1)}% Operating Margin` : 'Requires Treasury Authority'}
          </div>
        </div>
      </div>

      {/* Row 2: Strategic Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Package Tiers Margins */}
        <Card
          title="Agency Margin by Service Tier"
          subtitle="Accrual operating profitability performance"
        >
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs text-emerald-900">
                  Full-Service Planning ({marginByPackageType.fullService.count} Weddings)
                </span>
                <Badge variant="success" size="sm">
                  {marginByPackageType.fullService.marginPercent.toFixed(1)}% Net Margin
                </Badge>
              </div>
              <div className="flex justify-between text-xs text-[#7A6E63] mt-2">
                <span>Revenue: {formatPaiseCompact(marginByPackageType.fullService.invoicedRevenuePaise)}</span>
                <span className="font-semibold text-emerald-800">
                  Profit: {formatPaiseCompact(marginByPackageType.fullService.operatingProfitPaise)}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50/50 border border-amber-200/60 rounded">
              <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-xs text-amber-900">
                  Partial Day-Of Coordination ({marginByPackageType.partialService.count} Weddings)
                </span>
                <Badge variant="gold" size="sm">
                  {marginByPackageType.partialService.marginPercent.toFixed(1)}% Net Margin
                </Badge>
              </div>
              <div className="flex justify-between text-xs text-[#7A6E63] mt-2">
                <span>Revenue: {formatPaiseCompact(marginByPackageType.partialService.invoicedRevenuePaise)}</span>
                <span className="font-semibold text-[#8C7355]">
                  Profit: {formatPaiseCompact(marginByPackageType.partialService.operatingProfitPaise)}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* Portfolio Authoritative Cash Flow */}
        <Card
          title="Consolidated Treasury Cash Flow"
          subtitle="Strictly verified and cleared cash movements"
        >
          {portfolioLedger && canViewTreasury ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-[#EDE5DC]">
                <span className="text-[#7A6E63]">Cleared Client Collections:</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatPaiseToINR(portfolioLedger.cashFlow.totalClearedInflowsPaise)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-[#EDE5DC]">
                <span className="text-[#7A6E63]">Cleared Vendor Settlements:</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatPaiseToINR(portfolioLedger.cashFlow.totalClearedOutflowsPaise)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-[#EDE5DC]">
                <span className="text-[#7A6E63]">Cleared Direct Expenses:</span>
                <span className="font-mono font-bold text-stone-700">
                  {formatPaiseToINR(portfolioLedger.cashFlow.totalClearedDirectExpensesPaise)}
                </span>
              </div>

              <div className="flex justify-between pt-1 font-semibold text-sm">
                <span className="text-[#231E1B]">Consolidated Net Cash:</span>
                <span className="font-mono font-bold text-[#231E1B]">
                  {formatPaiseToINR(portfolioLedger.cashFlow.netCashPositionPaise)}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#7A6E63] italic">
              Treasury & Cash Position data requires 'analytics:treasury:read' authority.
            </div>
          )}
        </Card>

        {/* Working Capital & Outstanding Obligations */}
        <Card
          title="Working Capital & Obligations"
          subtitle="Receivables and payable liabilities tracking"
        >
          {portfolioLedger && canViewTreasury ? (
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-[#EDE5DC]">
                <span className="text-[#7A6E63]">Outstanding Client Receivables:</span>
                <span className="font-mono font-bold text-amber-700">
                  {formatPaiseToINR(portfolioLedger.workingCapital.totalOutstandingReceivablesPaise)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-[#EDE5DC]">
                <span className="text-[#7A6E63]">Unpaid Vendor Liabilities:</span>
                <span className="font-mono font-bold text-rose-700">
                  {formatPaiseToINR(portfolioLedger.workingCapital.totalUnpaidVendorLiabilitiesPaise)}
                </span>
              </div>

              <div className="flex justify-between pb-2 border-b border-[#EDE5DC]">
                <span className="text-[#7A6E63]">Unpaid Direct Expenses:</span>
                <span className="font-mono font-bold text-stone-700">
                  {formatPaiseToINR(portfolioLedger.workingCapital.totalUnpaidDirectExpensesPaise)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 pt-1 text-[11px] text-emerald-700 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Double-Counting Anomaly Protection Active</span>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-xs text-[#7A6E63] italic">
              Working Capital data requires 'analytics:treasury:read' authority.
            </div>
          )}
        </Card>
      </div>

      {/* Row 3: Master Luxury Vendor Procurement Performance */}
      {canViewVendors && vendors.length > 0 && (
        <Card
          title="Master Luxury Vendor Performance & Procurement Activity"
          subtitle="Live database metrics: contracted galas, category distribution, and RFQ quotations"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAF6F1] text-[#231E1B] border-b border-[#EDE5DC]">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Vendor Business Name</th>
                  <th className="px-4 py-2.5 font-semibold">Service Category</th>
                  <th className="px-4 py-2.5 font-semibold">City</th>
                  <th className="px-4 py-2.5 font-semibold">Contact Person</th>
                  <th className="px-4 py-2.5 font-semibold text-center">Quotations Submitted</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Contracted Weddings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE5DC]">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="px-4 py-3 font-serif font-bold text-[#231E1B]">
                      {v.businessName}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="neutral" size="sm">
                        {v.category.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-[#4A5568]">{v.city}</td>
                    <td className="px-4 py-3 text-[#7A6E63]">{v.contactPerson}</td>
                    <td className="px-4 py-3 font-mono text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold">
                        {v._count.quotations} RFQ Quotes
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-right font-bold text-emerald-800">
                      {v._count.weddingVendors} Awarded
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Row 4: Individual Destination Wedding Profitability Table */}
      <Card
        title="Destination Wedding Gala Ledger Summaries"
        subtitle="Individual performance, guest counts, and net cash positions across Rajasthan's palace destinations"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#FAF6F1] text-[#231E1B] border-b border-[#EDE5DC]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Wedding Gala</th>
                <th className="px-4 py-2.5 font-semibold">Palace Venue</th>
                <th className="px-4 py-2.5 font-semibold">Package Tier</th>
                <th className="px-4 py-2.5 font-semibold">Guests</th>
                <th className="px-4 py-2.5 font-semibold">Invoiced Revenue</th>
                <th className="px-4 py-2.5 font-semibold">Operating Profit</th>
                <th className="px-4 py-2.5 font-semibold text-right">Net Cash Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EDE5DC]">
              {data.weddings.map((w) => (
                <tr key={w.weddingId} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="px-4 py-3 font-serif font-bold text-[#231E1B]">
                    {w.weddingTitle}
                  </td>
                  <td className="px-4 py-3 text-[#4A5568]">
                    {w.venueName} ({w.primaryCity})
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={w.packageType === 'FULL_SERVICE' ? 'gold' : 'neutral'} size="sm">
                      {w.packageType === 'FULL_SERVICE' ? 'Full-Service' : 'Day-Of'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono">{w.targetGuestCount} Pax</td>
                  <td className="px-4 py-3 font-mono font-medium text-[#231E1B]">
                    {formatPaiseToINR(w.ledger.accrual.invoicedClientRevenuePaise)}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-emerald-800">
                    {formatPaiseToINR(w.ledger.accrual.operatingProfitPaise)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#231E1B] text-right">
                    {formatPaiseToINR(w.ledger.cashFlow.netActualCashFlowPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

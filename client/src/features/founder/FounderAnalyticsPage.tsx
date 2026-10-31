import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import {
  Crown,
  Users,
  ShieldCheck,
  Percent,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { formatPaiseToINR, formatPaiseCompact } from 'shared';

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
  portfolioLedger: {
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

export const FounderAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<SeasonalFinancialAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/seasonal');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load seasonal analytics', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20 text-[#718096]">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-[#C5A059]" />
        Computing authoritative seasonal financial analytics...
      </div>
    );
  }

  const { seasonOverview, portfolioLedger, marginByPackageType } = data;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#5B1424]">
            Founder Season Review & Strategic Analytics
          </h2>
          <p className="text-xs text-[#718096] mt-0.5">
            Developer B Scope • High-season Jaipur & Udaipur luxury portfolio financials & net margin audit
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

      {/* Season Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-[#E7E2D8] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#718096] mb-1">
            <span className="font-semibold uppercase tracking-wider">Luxury Portfolio</span>
            <Crown className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2229]">
            {seasonOverview.totalWeddings} Weddings
          </div>
          <div className="text-[11px] text-[#718096] mt-1 flex gap-2">
            <span className="text-emerald-700 font-semibold">{seasonOverview.completedWeddings} Settled</span>
            <span>•</span>
            <span className="text-amber-700 font-semibold">{seasonOverview.activeWeddings} Active</span>
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E7E2D8] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#718096] mb-1">
            <span className="font-semibold uppercase tracking-wider">Total Season Budget</span>
            <Sparkles className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#5B1424]">
            {formatPaiseCompact(seasonOverview.totalBudgetPaise)}
          </div>
          <div className="text-[11px] text-[#718096] mt-1">
            Avg: <span className="font-mono font-medium">{formatPaiseCompact(seasonOverview.averageBudgetPaise)}</span> / wedding
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E7E2D8] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#718096] mb-1">
            <span className="font-semibold uppercase tracking-wider">Royalty & Guests</span>
            <Users className="w-4 h-4 text-[#C5A059]" />
          </div>
          <div className="font-serif text-2xl font-bold text-[#1E2229]">
            {seasonOverview.totalTargetGuests.toLocaleString()} Pax
          </div>
          <div className="text-[11px] text-[#718096] mt-1">
            Avg: <span className="font-mono font-medium">{seasonOverview.averageGuestCount}</span> guests / gala
          </div>
        </div>

        <div className="p-4 bg-white border border-[#E7E2D8] rounded-md shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#718096] mb-1">
            <span className="font-semibold uppercase tracking-wider">Overall Net Margin</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-serif text-2xl font-bold text-emerald-800">
            {portfolioLedger.accrual.operatingProfitMarginPercent.toFixed(1)}%
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Audited Operating Profit
          </div>
        </div>
      </div>

      {/* Strategic Package Margins & Cash Position */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full-Service vs Partial-Service Margins */}
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
              <div className="flex justify-between text-xs text-[#718096] mt-2">
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
              <div className="flex justify-between text-xs text-[#718096] mt-2">
                <span>Revenue: {formatPaiseCompact(marginByPackageType.partialService.invoicedRevenuePaise)}</span>
                <span className="font-semibold text-[#8C6F31]">
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
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between pb-2 border-b border-[#E7E2D8]">
              <span className="text-[#718096]">Cleared Client Collections:</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatPaiseToINR(portfolioLedger.cashFlow.totalClearedInflowsPaise)}
              </span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E7E2D8]">
              <span className="text-[#718096]">Cleared Vendor Settlements:</span>
              <span className="font-mono font-bold text-rose-700">
                {formatPaiseToINR(portfolioLedger.cashFlow.totalClearedOutflowsPaise)}
              </span>
            </div>

            <div className="flex justify-between pb-2 border-b border-[#E7E2D8]">
              <span className="text-[#718096]">Cleared Direct Expenses:</span>
              <span className="font-mono font-bold text-stone-700">
                {formatPaiseToINR(portfolioLedger.cashFlow.totalClearedDirectExpensesPaise)}
              </span>
            </div>

            <div className="flex justify-between pt-1 font-semibold text-sm">
              <span className="text-[#1E2229]">Consolidated Net Cash:</span>
              <span className="font-mono font-bold text-[#5B1424]">
                {formatPaiseToINR(portfolioLedger.cashFlow.netCashPositionPaise)}
              </span>
            </div>
          </div>
        </Card>

        {/* Audit Watchdog Across Portfolio */}
        <Card
          title="Portfolio Audit Watchdog"
          subtitle="Integrity assurance across 25 destination galas"
        >
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 rounded flex items-center justify-between text-xs text-emerald-900">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-700" />
                <div>
                  <div className="font-semibold">6-Vector Anomaly Watchdog</div>
                  <div className="text-[10px] text-emerald-700">
                    {data.auditAnomaliesTotal === 0
                      ? 'Zero discrepancies detected across portfolio'
                      : `${data.auditAnomaliesTotal} anomaly flags under review`}
                  </div>
                </div>
              </div>
              <Badge variant={data.auditAnomaliesTotal === 0 ? 'success' : 'danger'} size="sm">
                {data.auditAnomaliesTotal === 0 ? 'Compliant' : 'Alert'}
              </Badge>
            </div>

            <div className="text-[11px] text-[#718096] leading-relaxed p-2 bg-[#F7F4EE] rounded">
              All currency mathematics execute with exact integer BigInt paise. Direct expenses and vendor bills enforce strict anti-double-counting checks.
            </div>
          </div>
        </Card>
      </div>

      {/* Individual Destination Wedding Profitability Table */}
      <Card
        title="Destination Wedding Gala Ledger Summaries"
        subtitle="Individual performance, guest counts, and net cash positions across Rajasthan's palace destinations"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
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
            <tbody className="divide-y divide-[#E7E2D8]">
              {data.weddings.map((w) => (
                <tr key={w.weddingId} className="hover:bg-[#FDFBF7] transition-colors">
                  <td className="px-4 py-3 font-serif font-bold text-[#1E2229]">
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
                  <td className="px-4 py-3 font-mono font-medium text-[#1E2229]">
                    {formatPaiseToINR(w.ledger.accrual.invoicedClientRevenuePaise)}
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-emerald-800">
                    {formatPaiseToINR(w.ledger.accrual.operatingProfitPaise)}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-[#5B1424] text-right">
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

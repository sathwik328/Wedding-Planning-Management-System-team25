import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { Trophy, CheckCircle } from 'lucide-react';
import { formatPaiseToINR, formatPaiseCompact } from 'shared';
import { useAuth } from '../../contexts/AuthContext';

export interface ComparisonQuotation {
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
}

export interface RfqComparisonMatrixData {
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
  quotations: ComparisonQuotation[];
  lowestBaseAmountPaise: string;
  highestBaseAmountPaise: string;
  spreadPaise: string;
}

export interface RfqComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: RfqComparisonMatrixData | null;
  isLoading: boolean;
  onAwardVendor: (groupId: string, quotationId: string) => Promise<void>;
}

export const RfqComparisonModal: React.FC<RfqComparisonModalProps> = ({
  isOpen,
  onClose,
  data,
  onAwardVendor
}) => {
  const { hasPermission } = useAuth();
  const canAward = hasPermission('procurement:rfq:award');
  const [awardingId, setAwardingId] = useState<string | null>(null);

  if (!isOpen || !data) return null;

  const isAwarded = data.rfqGroup.status === 'AWARDED';

  const handleAward = async (quotationId: string) => {
    try {
      setAwardingId(quotationId);
      await onAwardVendor(data.rfqGroup.id, quotationId);
    } finally {
      setAwardingId(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="3-Vendor Quotation Comparison Matrix"
      subtitle={`${data.rfqGroup.title} • Target: ${data.rfqGroup.targetGuestCount} Guests`}
      maxWidth="4xl"
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="text-xs text-[#718096]">
            Selection automatically rejects competing quotes and generates the contracted WeddingVendor record.
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close Matrix
          </Button>
        </div>
      }
    >
      {/* Spread & Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 bg-[#F7F4EE] border border-[#E7E2D8] rounded">
          <span className="text-[11px] font-semibold text-[#718096] uppercase">Quotations Analyzed</span>
          <div className="text-lg font-serif font-bold text-[#1E2229] mt-0.5">
            {data.quotations.length} Proposals
          </div>
        </div>
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase">Lowest Quotation</span>
          <div className="text-lg font-serif font-bold text-emerald-900 mt-0.5">
            {formatPaiseCompact(data.lowestBaseAmountPaise)}
          </div>
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded">
          <span className="text-[11px] font-semibold text-amber-800 uppercase">Highest Quotation</span>
          <div className="text-lg font-serif font-bold text-amber-900 mt-0.5">
            {formatPaiseCompact(data.highestBaseAmountPaise)}
          </div>
        </div>
        <div className="p-3 bg-[#5B1424]/5 border border-[#5B1424]/20 rounded">
          <span className="text-[11px] font-semibold text-[#5B1424] uppercase">Price Variance Spread</span>
          <div className="text-lg font-serif font-bold text-[#5B1424] mt-0.5">
            {formatPaiseCompact(data.spreadPaise)}
          </div>
        </div>
      </div>

      {/* Side-by-Side Vendor Quotation Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {data.quotations.map((q) => {
          const isWinner = q.isSelectedWinner || data.rfqGroup.awardedQuotationId === q.quotationId;
          const isLowest = q.baseAmountPaise === data.lowestBaseAmountPaise;

          return (
            <div
              key={q.quotationId}
              className={`border rounded-lg p-4 flex flex-col justify-between transition-all ${
                isWinner
                  ? 'border-[#C5A059] bg-amber-50/40 shadow-md ring-1 ring-[#C5A059]'
                  : 'border-[#E7E2D8] bg-white'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-2">
                  <Badge variant={isWinner ? 'gold' : isLowest ? 'success' : 'neutral'} size="sm">
                    {isWinner ? 'Selected Winner' : isLowest ? 'Best Value' : 'Proposed'}
                  </Badge>
                  <span className="text-[10px] font-mono text-[#718096]">{q.quoteReference}</span>
                </div>

                <h4 className="font-serif font-bold text-[#1E2229] text-base leading-snug">
                  {q.vendorName}
                </h4>

                <div className="mt-3 py-2 border-y border-[#E7E2D8]/60 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#718096]">Base Amount:</span>
                    <span className="font-mono font-bold text-[#1E2229]">
                      {formatPaiseToINR(q.baseAmountPaise)}
                    </span>
                  </div>

                  {q.pricePerPlatePaise && (
                    <div className="flex justify-between">
                      <span className="text-[#718096]">Price Per Plate:</span>
                      <span className="font-mono font-semibold text-emerald-800">
                        {formatPaiseToINR(q.pricePerPlatePaise)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-[#718096]">Extra Hour Rate:</span>
                    <span className="font-mono text-[#4A5568]">
                      {BigInt(q.extraHourRatePaise) > 0n
                        ? `${formatPaiseToINR(q.extraHourRatePaise)}/hr`
                        : 'Included'}
                    </span>
                  </div>
                </div>

                {q.menuDescription && (
                  <div className="mt-3 p-2 bg-[#F7F4EE] rounded text-xs text-[#4A5568] leading-relaxed">
                    <span className="font-semibold text-[#1E2229] block mb-0.5">Curation & Menu:</span>
                    {q.menuDescription}
                  </div>
                )}

                {/* Line Items Count */}
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-[#718096] uppercase tracking-wider block mb-1">
                    Line Item Breakdown ({q.lineItems.length})
                  </span>
                  <div className="space-y-1">
                    {q.lineItems.map((item) => (
                      <div
                        key={item.id}
                        className="text-[11px] flex justify-between items-center py-1 border-b border-stone-100"
                      >
                        <span className="truncate pr-2 text-[#1E2229]">{item.description}</span>
                        <span className="font-mono font-medium text-[#4A5568] shrink-0">
                          {formatPaiseToINR(item.totalPricePaise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Award Action */}
              <div className="mt-5 pt-3 border-t border-[#E7E2D8]">
                {isWinner ? (
                  <div className="flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-[#8C6F31]">
                    <Trophy className="w-4 h-4 text-[#C5A059]" />
                    Contracted Partner
                  </div>
                ) : isAwarded ? (
                  <div className="text-center py-2 text-xs text-[#718096] italic">
                    Competing Request Closed
                  </div>
                ) : !canAward ? (
                  <div className="text-center py-2 text-xs text-[#718096] italic">
                    Awarding requires Lead Planner or Founder authorization
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    isLoading={awardingId === q.quotationId}
                    disabled={isAwarded || awardingId !== null}
                    leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                    onClick={() => handleAward(q.quotationId)}
                  >
                    Award Contract
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

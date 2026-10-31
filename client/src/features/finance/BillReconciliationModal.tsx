import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { formatPaiseToINR } from 'shared';

export interface BillReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  bill: {
    id: string;
    billNumber: string;
    vendorName: string;
    baselineAgreedPaise: string;
    totalBilledPaise: string;
  } | null;
  onReconciled: () => void;
}

export const BillReconciliationModal: React.FC<BillReconciliationModalProps> = ({
  isOpen,
  onClose,
  bill,
  onReconciled
}) => {
  const [varianceReason, setVarianceReason] = useState('Approved extra items as per client request');
  const [reconciliationNotes, setReconciliationNotes] = useState('Audited by Lead Planner against quotation baseline');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !bill) return null;

  const baselineBig = BigInt(bill.baselineAgreedPaise);
  const billedBig = BigInt(bill.totalBilledPaise);
  const varianceBig = billedBig - baselineBig;
  const isOver = varianceBig > 0n;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/finance/bills/${bill.id}/reconcile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          varianceReason,
          reconciliationNotes
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to reconcile bill');
      }

      onReconciled();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Vendor Bill Quotation Baseline Reconciliation"
      subtitle={`Bill: ${bill.billNumber} • Partner: ${bill.vendorName}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
            {error}
          </div>
        )}

        {/* Baseline vs Actual Variance Card */}
        <div className="p-3.5 bg-[#F7F4EE] border border-[#E7E2D8] rounded space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-[#718096]">Contracted Baseline (Agreed Quote):</span>
            <span className="font-mono font-bold text-[#1E2229]">
              {formatPaiseToINR(bill.baselineAgreedPaise)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-[#718096]">Final Billed Amount:</span>
            <span className="font-mono font-bold text-[#1E2229]">
              {formatPaiseToINR(bill.totalBilledPaise)}
            </span>
          </div>

          <div className="pt-2 border-t border-[#E7E2D8] flex justify-between items-center font-semibold">
            <span className="text-[#1E2229]">Reconciliation Variance:</span>
            <span
              className={`font-mono text-sm ${
                isOver ? 'text-amber-800' : varianceBig === 0n ? 'text-emerald-800' : 'text-blue-800'
              }`}
            >
              {isOver ? '+' : ''}
              {formatPaiseToINR(varianceBig.toString())}
              {varianceBig === 0n && ' (Exact Baseline Match)'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">
            Variance Justification / Reason *
          </label>
          <input
            type="text"
            required
            value={varianceReason}
            onChange={(e) => setVarianceReason(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">
            Auditor & Reconciliation Notes *
          </label>
          <textarea
            rows={3}
            required
            value={reconciliationNotes}
            onChange={(e) => setReconciliationNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Approve & Reconcile Bill
          </Button>
        </div>
      </form>
    </Modal>
  );
};

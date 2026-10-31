import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { parseStrictIndianCurrencyToPaise, formatPaiseToINR } from 'shared';

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'CLIENT' | 'VENDOR' | 'DIRECT';
  targetId: string; // clientInvoiceId, vendorBillId, or additionalChargeId
  targetTitle: string;
  defaultAmountPaise?: string;
  weddingId?: string; // required for direct expense payment
  onPaymentRecorded: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  type,
  targetId,
  targetTitle,
  defaultAmountPaise,
  weddingId,
  onPaymentRecorded
}) => {
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'NEFT_RTGS' | 'CHEQUE' | 'BANK_TRANSFER' | 'CASH'>('NEFT_RTGS');
  const [vendorPaymentType, setVendorPaymentType] = useState<'ADVANCE' | 'FINAL_SETTLEMENT'>('ADVANCE');
  const [transactionReference, setTransactionReference] = useState('');
  const [isCleared, setIsCleared] = useState(true);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const amountPaise = parseStrictIndianCurrencyToPaise(amountRupees);
      const status = isCleared ? 'CLEARED' : 'PENDING';

      let endpoint = '';
      let body: any = {};

      if (type === 'CLIENT') {
        endpoint = '/api/finance/client-payments';
        body = {
          clientInvoiceId: targetId,
          amountPaise,
          paymentMethod: paymentMethod === 'CASH' ? 'BANK_TRANSFER' : paymentMethod,
          transactionReference,
          status,
          notes
        };
      } else if (type === 'VENDOR') {
        endpoint = '/api/finance/vendor-payments';
        body = {
          vendorBillId: targetId,
          paymentType: vendorPaymentType,
          amountPaise,
          paymentMethod: paymentMethod === 'CASH' ? 'BANK_TRANSFER' : paymentMethod,
          transactionReference,
          status,
          notes
        };
      } else {
        // DIRECT EXPENSE
        endpoint = '/api/finance/direct-payments';
        body = {
          weddingId,
          additionalChargeId: targetId,
          amountPaise,
          paymentMethod,
          transactionReference,
          status,
          notes
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record payment');
      }

      onPaymentRecorded();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const titlePrefix =
    type === 'CLIENT'
      ? 'Record Client Inflow Payment'
      : type === 'VENDOR'
      ? 'Disburse Vendor Payment'
      : 'Execute Direct Agency Payment';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={titlePrefix}
      subtitle={`Target: ${targetTitle}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
            {error}
          </div>
        )}

        {defaultAmountPaise && (
          <div className="p-2.5 bg-[#F7F4EE] rounded flex justify-between items-center text-xs">
            <span className="text-[#718096]">Bill/Invoice Balance Target:</span>
            <span className="font-mono font-bold text-[#1E2229]">
              {formatPaiseToINR(defaultAmountPaise)}
            </span>
          </div>
        )}

        {type === 'VENDOR' && (
          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Payment Stage *</label>
            <select
              value={vendorPaymentType}
              onChange={(e) => setVendorPaymentType(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white"
            >
              <option value="ADVANCE">Vendor Advance (Partial Commitment)</option>
              <option value="FINAL_SETTLEMENT">Final Settlement (Post-Event Closure)</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">
            Amount in Indian Rupees (INR) *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. 5,00,000 or 2500000"
            value={amountRupees}
            onChange={(e) => setAmountRupees(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
          <span className="text-[10px] text-[#718096] mt-0.5 block">
            Exact integer paise converted via strict Indian numbering format.
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white"
            >
              <option value="NEFT_RTGS">NEFT / RTGS</option>
              <option value="BANK_TRANSFER">Bank Transfer (IMPS)</option>
              <option value="CHEQUE">Cheque</option>
              {type === 'DIRECT' && <option value="CASH">Cash / Petty Cash</option>}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">
              Transaction / UTR Ref *
            </label>
            <input
              type="text"
              required
              placeholder="UTR-HDFC-2026-XXXX"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
        </div>

        <div className="p-3 bg-[#FDFBF7] border border-[#E7E2D8] rounded">
          <label className="flex items-center gap-2 cursor-pointer text-xs">
            <input
              type="checkbox"
              checked={isCleared}
              onChange={(e) => setIsCleared(e.target.checked)}
              className="rounded text-[#5B1424] focus:ring-[#C5A059]"
            />
            <span className="font-medium text-[#1E2229]">
              Funds Cleared into Bank Account (Affects Net Cash Position)
            </span>
          </label>
          <p className="text-[10px] text-[#718096] mt-1 pl-5">
            Unchecking records as PENDING commitment only. Only CLEARED funds count towards audited cash inflows/outflows.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">Notes & Memo</label>
          <input
            type="text"
            placeholder="e.g. Authorized by Founder; HDFC corporate treasury"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Confirm Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
};

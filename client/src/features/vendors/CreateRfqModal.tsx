import React, { useState } from 'react';
import { Modal } from '../../components/common/Modal';
import { Button } from '../../components/common/Button';
import { VENDOR_CATEGORIES, VendorCategory } from 'shared';
import { apiFetch } from '../../services/api';

export interface VendorOption {
  id: string;
  businessName: string;
  category: string;
  city: string;
}

export interface WeddingOption {
  id: string;
  title: string;
  targetGuestCount: number;
}

export interface CreateRfqModalProps {
  isOpen: boolean;
  onClose: () => void;
  weddings: WeddingOption[];
  vendors: VendorOption[];
  selectedWeddingId?: string;
  onRfqCreated: () => void;
}

export const CreateRfqModal: React.FC<CreateRfqModalProps> = ({
  isOpen,
  onClose,
  weddings,
  vendors,
  selectedWeddingId,
  onRfqCreated
}) => {
  const [weddingId, setWeddingId] = useState(selectedWeddingId || (weddings[0]?.id ?? ''));
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<VendorCategory>('CATERING');
  const [targetGuestCount, setTargetGuestCount] = useState(400);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [requirement, setRequirement] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Filter vendors matching selected category
  const categoryVendors = vendors.filter((v) => v.category === category);

  const toggleVendor = (id: string) => {
    setSelectedVendorIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedVendorIds.length === 0) {
      setError('Please select at least 1 vendor (recommend 3 for side-by-side comparison).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/api/rfq/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingId,
          title,
          category,
          targetGuestCount: Number(targetGuestCount),
          vendorIds: selectedVendorIds,
          requirement
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create RFQ group');
      }

      onRfqCreated();
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
      title="Create RFQ Quotation Group"
      subtitle="Dispatch quotation tenders to luxury vendors for 3-way side-by-side comparison"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">Target Wedding *</label>
          <select
            value={weddingId}
            onChange={(e) => setWeddingId(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white"
          >
            {weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} ({w.targetGuestCount} Guests)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">RFQ Group Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Sangeet Royal Banquet & Live Stations (400 Pax)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Service Category *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as VendorCategory);
                setSelectedVendorIds([]); // Reset selection when category changes
              }}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059] bg-white"
            >
              {VENDOR_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1E2229] mb-1">Target Guests *</label>
            <input
              type="number"
              min={10}
              max={10000}
              required
              value={targetGuestCount}
              onChange={(e) => setTargetGuestCount(Number(e.target.value))}
              className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">
            Invite Vendors (Selected: {selectedVendorIds.length}) *
          </label>
          <div className="max-h-40 overflow-y-auto border border-[#E7E2D8] rounded p-2 space-y-1 bg-[#FDFBF7]">
            {categoryVendors.length === 0 ? (
              <p className="text-xs text-[#718096] italic p-2">
                No vendors found in {category}. Register vendors in directory first.
              </p>
            ) : (
              categoryVendors.map((v) => {
                const checked = selectedVendorIds.includes(v.id);
                return (
                  <label
                    key={v.id}
                    className={`flex items-center justify-between p-2 rounded text-xs cursor-pointer transition-colors ${
                      checked ? 'bg-[#C5A059]/15 border border-[#C5A059]/40' : 'hover:bg-stone-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleVendor(v.id)}
                        className="rounded text-[#5B1424] focus:ring-[#C5A059]"
                      />
                      <span className="font-medium text-[#1E2229]">{v.businessName}</span>
                    </div>
                    <span className="text-[11px] text-[#718096] font-mono">{v.city}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1E2229] mb-1">Detailed Requirements *</label>
          <textarea
            rows={3}
            required
            placeholder="Detailed scope of work, timeline, inclusions, silver service, dietary specifications..."
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            className="w-full text-xs px-3 py-2 border border-[#E7E2D8] rounded focus:outline-none focus:ring-1 focus:ring-[#C5A059]"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
            Dispatch RFQ Group
          </Button>
        </div>
      </form>
    </Modal>
  );
};

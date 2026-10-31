import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { parseStrictIndianCurrencyToPaise, formatPaiseCompact } from 'shared';

export interface WeddingCreationModalProps {
  isOpen: boolean;
  couples: Array<{ id: string; partnerOneName: string; partnerTwoName: string; wedding?: any }>;
  onClose: () => void;
  onSuccess: (weddingId: string) => void;
}

export const WeddingCreationModal: React.FC<WeddingCreationModalProps> = ({
  isOpen,
  couples,
  onClose,
  onSuccess
}) => {
  const availableCouples = couples.filter((c) => !c.wedding);
  const [coupleId, setCoupleId] = useState(availableCouples[0]?.id || '');
  const [title, setTitle] = useState('');
  const [packageType, setPackageType] = useState<'FULL_SERVICE' | 'PARTIAL_DAY_OF'>('FULL_SERVICE');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [primaryCity, setPrimaryCity] = useState<'Jaipur' | 'Udaipur' | 'Jodhpur'>('Udaipur');
  const [venueName, setVenueName] = useState('City Palace & Jagmandir Island');
  const [targetGuestCount, setTargetGuestCount] = useState(450);
  const [totalBudgetRupees, setTotalBudgetRupees] = useState('4,50,00,000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBudgetDisplay = () => {
    try {
      const paise = parseStrictIndianCurrencyToPaise(totalBudgetRupees);
      return formatPaiseCompact(paise);
    } catch {
      return 'Invalid INR';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleId) {
      setError('Please select a couple dossier');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const totalBudgetPaise = parseStrictIndianCurrencyToPaise(totalBudgetRupees);
      const res = await fetch('/api/weddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleId,
          title: title.trim() || `${venueName} Luxury Wedding`,
          packageType,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          primaryCity,
          venueName,
          targetGuestCount: Number(targetGuestCount),
          totalBudgetPaise
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize wedding project');
      }

      onSuccess(data.data.id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initialize Royal Wedding Project"
      subtitle="Creates wedding dossier, multi-day itinerary, and automatically provisions task milestones"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Couple Dossier *</label>
            <select
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={coupleId}
              onChange={(e) => setCoupleId(e.target.value)}
            >
              <option value="">Select a couple without an active wedding...</option>
              {availableCouples.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.partnerOneName} & {c.partnerTwoName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Official Wedding Project Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Singhania & Merchant Royal Udaipur Gala"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Package Tier *</label>
            <select
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={packageType}
              onChange={(e) => setPackageType(e.target.value as any)}
            >
              <option value="FULL_SERVICE">Full Service Luxury (32 Milestones)</option>
              <option value="PARTIAL_DAY_OF">Partial Coordination (20 Milestones)</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Primary Destination City *</label>
            <select
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={primaryCity}
              onChange={(e) => setPrimaryCity(e.target.value as any)}
            >
              <option value="Udaipur">Udaipur (Lake Pichola / Mewar)</option>
              <option value="Jaipur">Jaipur (Pink City / Amer)</option>
              <option value="Jodhpur">Jodhpur (Sun City / Marwar)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Palace / Heritage Venue Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. The Oberoi Udaivilas / Umaid Bhawan Palace"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Commencement Date *</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Conclusion Date *</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Target Royal Guest Count</label>
            <input
              type="number"
              min="20"
              max="5000"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={targetGuestCount}
              onChange={(e) => setTargetGuestCount(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">
              Total Wedding Budget (INR) *
              <span className="text-[#C5A059] font-semibold ml-2 font-mono">[{getBudgetDisplay()}]</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 4,50,00,000"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none font-mono"
              value={totalBudgetRupees}
              onChange={(e) => setTotalBudgetRupees(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Initialize Project & Provision Tasks
          </Button>
        </div>
      </form>
    </Modal>
  );
};

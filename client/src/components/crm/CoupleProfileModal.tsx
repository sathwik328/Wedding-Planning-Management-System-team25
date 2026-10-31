import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface CoupleProfileModalProps {
  isOpen: boolean;
  enquiryId: string | null;
  initialCoupleNames: string;
  initialEmail: string;
  initialPhone: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const CoupleProfileModal: React.FC<CoupleProfileModalProps> = ({
  isOpen,
  enquiryId,
  initialCoupleNames,
  initialEmail,
  initialPhone,
  onClose,
  onSuccess
}) => {
  const parts = initialCoupleNames.split(/&|and|\+/i);
  const [partnerOneName, setPartnerOneName] = useState(parts[0]?.trim() || initialCoupleNames);
  const [partnerTwoName, setPartnerTwoName] = useState(parts[1]?.trim() || '');
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState(initialPhone);
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryId) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/crm/enquiries/${enquiryId}/convert-to-couple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerOneName,
          partnerTwoName,
          email,
          phone,
          address
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to convert to couple dossier');
      }

      onSuccess();
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
      title="Convert to VIP Couple Profile"
      subtitle="Establish formal couple records for service agreement execution"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Partner One (Groom / Bride) *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={partnerOneName}
              onChange={(e) => setPartnerOneName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Partner Two (Bride / Groom) *</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={partnerTwoName}
              onChange={(e) => setPartnerTwoName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Official Contact Email *</label>
            <input
              type="email"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Primary Phone *</label>
            <input
              type="tel"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Residential / Palace Address</label>
            <input
              type="text"
              placeholder="e.g. Rajputana Estate, Civil Lines, Jaipur"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Establish Couple Profile
          </Button>
        </div>
      </form>
    </Modal>
  );
};

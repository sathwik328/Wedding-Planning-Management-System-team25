import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { parseStrictIndianCurrencyToPaise, formatPaiseCompact } from 'shared';
import { apiFetch } from '../../services/api';

export interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [coupleNames, setCoupleNames] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [source, setSource] = useState('INSTAGRAM');
  const [roughDate, setRoughDate] = useState('');
  const [estimatedGuests, setEstimatedGuests] = useState(450);
  const [themePreference, setThemePreference] = useState('');
  const [budgetRupees, setBudgetRupees] = useState('3,50,00,000');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBudgetDisplay = () => {
    try {
      const paise = parseStrictIndianCurrencyToPaise(budgetRupees);
      return formatPaiseCompact(paise);
    } catch {
      return 'Invalid INR format';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedNames = coupleNames.trim();
    if (!trimmedNames || trimmedNames.length < 3) {
      setError('Identifying couple names are required (minimum 3 characters)');
      return;
    }
    if (!primaryEmail.trim() || !primaryEmail.includes('@')) {
      setError('A valid primary email address is required');
      return;
    }
    if (!primaryPhone.trim() || primaryPhone.trim().length < 8) {
      setError('A valid primary contact phone number is required');
      return;
    }
    if (!roughDate) {
      setError('Please select a tentative event date');
      return;
    }

    setLoading(true);

    try {
      const budgetCeilingPaise = parseStrictIndianCurrencyToPaise(budgetRupees);
      const res = await apiFetch('/api/crm/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupleNames: trimmedNames,
          primaryEmail: primaryEmail.trim(),
          primaryPhone: primaryPhone.trim(),
          source,
          roughDate: new Date(roughDate).toISOString(),
          estimatedGuests: Number(estimatedGuests),
          themePreference,
          budgetCeilingPaise,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create enquiry');
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
      title="Create VIP Wedding Enquiry"
      subtitle="Register an incoming luxury destination wedding inquiry"
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
            <label className="block font-medium text-[#1E2229] mb-1">Couple Names *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rajveer Singh & Meenakshi Rathore"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={coupleNames}
              onChange={(e) => setCoupleNames(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Primary Email *</label>
            <input
              type="email"
              required
              placeholder="royalty@family.com"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={primaryEmail}
              onChange={(e) => setPrimaryEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Primary Phone *</label>
            <input
              type="tel"
              required
              placeholder="+91 98290 12345"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={primaryPhone}
              onChange={(e) => setPrimaryPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Inquiry Source</label>
            <select
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              <option value="INSTAGRAM">Instagram Luxury Showcase</option>
              <option value="WHATSAPP">Direct WhatsApp Concierge</option>
              <option value="PHONE_CALL">Palace Reception / Phone</option>
              <option value="REFERRAL">Royal Family Referral</option>
              <option value="WEBSITE">Official Portfolio Portal</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Target Wedding Date *</label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={roughDate}
              onChange={(e) => setRoughDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Estimated Guest Count</label>
            <input
              type="number"
              min="20"
              max="5000"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={estimatedGuests}
              onChange={(e) => setEstimatedGuests(Number(e.target.value))}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">
              Budget Ceiling (INR) *
              <span className="text-[#C5A059] font-semibold ml-2 font-mono">
                [{getBudgetDisplay()}]
              </span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 3,50,00,000"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none font-mono"
              value={budgetRupees}
              onChange={(e) => setBudgetRupees(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Theme & Palace Preferences</label>
            <input
              type="text"
              placeholder="e.g. Udaipur City Palace, Royal Rajputana Heritage Gala"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={themePreference}
              onChange={(e) => setThemePreference(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Consultation / Briefing Notes</label>
            <textarea
              rows={3}
              placeholder="Special requests, family traditions, mandatory decor aesthetics..."
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Register Enquiry
          </Button>
        </div>
      </form>
    </Modal>
  );
};

import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface ConsultationModalProps {
  isOpen: boolean;
  enquiryId: string | null;
  coupleNames: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const ConsultationModal: React.FC<ConsultationModalProps> = ({
  isOpen,
  enquiryId,
  coupleNames,
  onClose,
  onSuccess
}) => {
  const [consultationDate, setConsultationDate] = useState('');
  const [consultationTime, setConsultationTime] = useState('16:00');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryId) return;

    setError(null);
    setLoading(true);

    try {
      const combinedDateTime = new Date(`${consultationDate}T${consultationTime}:00`).toISOString();
      const res = await fetch(`/api/crm/enquiries/${enquiryId}/schedule-consultation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consultationDate: combinedDateTime,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to schedule consultation');
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
      title="Schedule Royal Consultation"
      subtitle={`Arrange an executive planning session with ${coupleNames}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Consultation Date *</label>
          <input
            type="date"
            required
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={consultationDate}
            onChange={(e) => setConsultationDate(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Time Slot *</label>
          <input
            type="time"
            required
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={consultationTime}
            onChange={(e) => setConsultationTime(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Briefing / Agenda Notes</label>
          <textarea
            rows={4}
            placeholder="Agenda items, palace walkthrough details, budget scope clarification..."
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Confirm Schedule
          </Button>
        </div>
      </form>
    </Modal>
  );
};

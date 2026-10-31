import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { apiFetch } from '../../services/api';

export interface NewIncidentModalProps {
  isOpen: boolean;
  weddingId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewIncidentModal: React.FC<NewIncidentModalProps> = ({
  isOpen,
  weddingId,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'CRITICAL'>('MEDIUM');
  const [reportedBy, setReportedBy] = useState('Rajesh Chouhan (Lead Coordinator)');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch(`/api/operations/${weddingId}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          severity,
          reportedBy
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to log incident');
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
      title="Report Live Operational Incident"
      subtitle="Log on-ground bottleneck, technical delay, or palace protocol issue"
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Incident Headline *</label>
          <input
            type="text"
            required
            placeholder="e.g. Stage generator phase tripped at Zenana courtyard"
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Severity Level *</label>
          <select
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as any)}
          >
            <option value="LOW">Low (Minor vendor adjustment / non-critical)</option>
            <option value="MEDIUM">Medium (Requires coordinator intervention)</option>
            <option value="CRITICAL">Critical (Immediate palace protocol or audio/power issue)</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Detailed Description *</label>
          <textarea
            rows={3}
            required
            placeholder="Describe what occurred, affected ceremony activities, and immediate steps taken..."
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Reported By *</label>
          <input
            type="text"
            required
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={reportedBy}
            onChange={(e) => setReportedBy(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" type="submit" isLoading={loading}>
            Log Incident
          </Button>
        </div>
      </form>
    </Modal>
  );
};

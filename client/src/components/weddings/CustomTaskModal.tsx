import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface CustomTaskModalProps {
  isOpen: boolean;
  weddingId: string;
  weddingTitle: string;
  teamMembers: Array<{ id: string; name: string; role: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const CustomTaskModal: React.FC<CustomTaskModalProps> = ({
  isOpen,
  weddingId,
  weddingTitle,
  teamMembers,
  onClose,
  onSuccess
}) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'VENUE_DESIGN' | 'VENDORS' | 'GUEST_LOGISTICS' | 'BIG_DAY_EXECUTION'>('VENUE_DESIGN');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/weddings/${weddingId}/tasks/custom`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          priority,
          dueDate: new Date(dueDate).toISOString(),
          assignedToId: assignedToId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create bespoke task');
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
      title="Create Bespoke Milestone Task"
      subtitle={`Add a custom deliverable for ${weddingTitle}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Task Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Vintage Rolls-Royce Fleet Logistics"
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Operational Category *</label>
          <select
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value as any)}
          >
            <option value="VENUE_DESIGN">Venue Architecture & Decor</option>
            <option value="VENDORS">Master Vendor Procurement</option>
            <option value="GUEST_LOGISTICS">Royal Guest Logistics & Haveli Hospitality</option>
            <option value="BIG_DAY_EXECUTION">Big Day Minute-by-Minute Operations</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Priority</label>
          <select
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Assigned Lead / Coordinator</label>
          <select
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
            value={assignedToId}
            onChange={(e) => setAssignedToId(e.target.value)}
          >
            <option value="">Unassigned</option>
            {teamMembers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role.replace('_', ' ')})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Target Due Date *</label>
          <input
            type="date"
            required
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-[#E7E2D8]">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" isLoading={loading}>
            Create Bespoke Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};

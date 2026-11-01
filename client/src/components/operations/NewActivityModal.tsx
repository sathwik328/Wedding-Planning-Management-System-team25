import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { apiFetch } from '../../services/api';

export interface NewActivityModalProps {
  isOpen: boolean;
  weddingId: string;
  weddingDays: Array<{ id: string; dayNumber: number; title: string; date: string }>;
  coordinators: Array<{ id: string; name: string; role: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewActivityModal: React.FC<NewActivityModalProps> = ({
  isOpen,
  weddingId,
  weddingDays,
  coordinators,
  onClose,
  onSuccess
}) => {
  const [weddingDayId, setWeddingDayId] = useState(weddingDays[0]?.id || '');
  const [subEvent, setSubEvent] = useState<'MEHENDI' | 'HALDI' | 'SANGEET' | 'BARAAT' | 'PHERAS' | 'RECEPTION'>('BARAAT');
  const [activityName, setActivityName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [coordinatorId, setCoordinatorId] = useState(coordinators[0]?.id || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (weddingDays.length > 0 && !weddingDayId) {
      setWeddingDayId(weddingDays[0].id);
    }
    if (coordinators.length > 0 && !coordinatorId) {
      setCoordinatorId(coordinators[0].id);
    }
  }, [weddingDays, coordinators]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weddingDayId) {
      setError('Please select a wedding day');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const selectedDay = weddingDays.find((d) => d.id === weddingDayId);
      const baseDate = selectedDay?.date ? selectedDay.date.substring(0, 10) : '2026-12-15';

      const fullStart = new Date(`${baseDate}T${startTime}:00`).toISOString();
      const fullEnd = new Date(`${baseDate}T${endTime}:00`).toISOString();

      const res = await apiFetch(`/api/operations/${weddingId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weddingDayId,
          subEvent,
          activityName,
          startTime: fullStart,
          endTime: fullEnd,
          location,
          coordinatorId: coordinatorId || undefined,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to add schedule activity');
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
      title="Add Day-of Schedule Activity"
      subtitle="Define precise minute-by-minute ceremonial milestone"
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
            <label className="block font-medium text-[#1E2229] mb-1">Wedding Day *</label>
            <select
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={weddingDayId}
              onChange={(e) => setWeddingDayId(e.target.value)}
            >
              {weddingDays.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title} ({new Date(d.date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Sub-Event Ceremony *</label>
            <select
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={subEvent}
              onChange={(e) => setSubEvent(e.target.value as any)}
            >
              <option value="MEHENDI">Mehendi & High Tea</option>
              <option value="HALDI">Haldi & Phoolon Ki Holi</option>
              <option value="SANGEET">Sangeet & Royal Musical Evening</option>
              <option value="BARAAT">Baraat Royal Procession</option>
              <option value="PHERAS">Varmala & Pheras Vedic Rites</option>
              <option value="RECEPTION">Grand Reception Gala</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Activity Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Royal Elephant Procession & Safa Tying Ceremony"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Commencement Time (24h) *</label>
            <input
              type="time"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Conclusion Time (24h) *</label>
            <input
              type="time"
              required
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Palace Courtyard / Specific Location *</label>
            <input
              type="text"
              required
              placeholder="e.g. Zenana Deodhi / Lake Pavilion"
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div>
            <label className="block font-medium text-[#1E2229] mb-1">Lead Operations Coordinator</label>
            <select
              className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
              value={coordinatorId}
              onChange={(e) => setCoordinatorId(e.target.value)}
            >
              <option value="">Unassigned</option>
              {coordinators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role.replace('_', ' ')})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block font-medium text-[#1E2229] mb-1">Operational Protocol / Notes</label>
            <textarea
              rows={2}
              placeholder="Rose petal shower cue, royal bugle sequence, VIP family escort..."
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
            Add Activity to Timeline
          </Button>
        </div>
      </form>
    </Modal>
  );
};

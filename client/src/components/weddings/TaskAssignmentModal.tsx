import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

export interface TaskAssignmentModalProps {
  isOpen: boolean;
  weddingId: string;
  task: {
    id: string;
    title: string;
    stage: string;
    priority: string;
    dueDate: string;
    assignedToId?: string | null;
  } | null;
  teamMembers: Array<{ id: string; name: string; role: string }>;
  onClose: () => void;
  onSuccess: () => void;
}

export const TaskAssignmentModal: React.FC<TaskAssignmentModalProps> = ({
  isOpen,
  weddingId,
  task,
  teamMembers,
  onClose,
  onSuccess
}) => {
  const [stage, setStage] = useState(task?.stage || 'TO_PLAN');
  const [priority, setPriority] = useState(task?.priority || 'MEDIUM');
  const [assignedToId, setAssignedToId] = useState(task?.assignedToId || '');
  const [dueDate, setDueDate] = useState(task?.dueDate ? task.dueDate.substring(0, 10) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (task) {
      setStage(task.stage);
      setPriority(task.priority);
      setAssignedToId(task.assignedToId || '');
      setDueDate(task.dueDate ? task.dueDate.substring(0, 10) : '');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/weddings/${weddingId}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage,
          priority,
          assignedToId: assignedToId || null,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update task');
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
      title="Task Milestone Assignment & Status"
      subtitle={task?.title || 'Milestone Task'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded">
            {error}
          </div>
        )}

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Assigned Team Member</label>
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
          <label className="block font-medium text-[#1E2229] mb-1">Execution Stage</label>
          <select
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
            value={stage}
            onChange={(e) => setStage(e.target.value)}
          >
            <option value="TO_PLAN">To Plan</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Completed</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Operational Priority</label>
          <select
            className="w-full px-3 py-2 border border-[#E7E2D8] rounded focus:ring-1 focus:ring-[#5B1424] focus:outline-none bg-white"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical (Palace / VIP Mandate)</option>
          </select>
        </div>

        <div>
          <label className="block font-medium text-[#1E2229] mb-1">Target Due Date</label>
          <input
            type="date"
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
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
};

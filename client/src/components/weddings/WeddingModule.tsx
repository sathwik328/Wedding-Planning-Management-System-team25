import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { WeddingCreationModal } from './WeddingCreationModal';
import { TaskAssignmentModal } from './TaskAssignmentModal';
import { CustomTaskModal } from './CustomTaskModal';
import { formatPaiseCompact } from 'shared';
import { apiFetch } from '../../services/api';
import { 
  Calendar, 
  MapPin, 
  PlusCircle, 
  RefreshCw, 
  User, 
  Users, 
  Workflow
} from 'lucide-react';

interface WeddingSummary {
  id: string;
  title: string;
  packageType: string;
  startDate: string;
  endDate: string;
  primaryCity: string;
  venueName: string;
  targetGuestCount: number;
  totalBudgetPaise: string;
  status: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
  couple: {
    partnerOneName: string;
    partnerTwoName: string;
  };
}

interface TaskItem {
  id: string;
  weddingId: string;
  templateKey: string;
  title: string;
  category: string;
  stage: 'TO_PLAN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: string;
  isCustom: boolean;
  assignedToId?: string | null;
  assignedTo?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export const WeddingModule: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedWeddingId, setSelectedWeddingId] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modals
  const [isCreationModalOpen, setIsCreationModalOpen] = useState(false);
  const [isCustomTaskModalOpen, setIsCustomTaskModalOpen] = useState(false);
  const [editTaskTarget, setEditTaskTarget] = useState<TaskItem | null>(null);

  // Queries
  const { data: weddings = [] } = useQuery<WeddingSummary[]>({
    queryKey: ['weddings'],
    queryFn: async () => {
      const res = await apiFetch('/api/weddings');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Default select first wedding if none selected
  const activeWeddingId = selectedWeddingId || weddings[0]?.id || null;
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery<TaskItem[]>({
    queryKey: ['tasks', activeWeddingId, stageFilter, categoryFilter],
    queryFn: async () => {
      if (!activeWeddingId) return [];
      const params = new URLSearchParams();
      if (stageFilter !== 'ALL') params.set('stage', stageFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      const res = await apiFetch(`/api/weddings/${activeWeddingId}/tasks?${params.toString()}`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!activeWeddingId
  });

  const { data: teamMembers = [] } = useQuery<TeamMember[]>({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const res = await apiFetch('/api/weddings/team/members');
      const json = await res.json();
      return json.data || [];
    }
  });

  const { data: couples = [] } = useQuery<any[]>({
    queryKey: ['couples'],
    queryFn: async () => {
      const res = await apiFetch('/api/crm/couples');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Quick Stage Update Mutation
  const updateTaskStageMutation = useMutation({
    mutationFn: async ({ taskId, stage }: { taskId: string; stage: string }) => {
      if (!activeWeddingId) return;
      const res = await apiFetch(`/api/weddings/${activeWeddingId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeWeddingId] });
      queryClient.invalidateQueries({ queryKey: ['weddings'] });
    }
  });

  // Backfill verification mutation
  const backfillMutation = useMutation({
    mutationFn: async () => {
      if (!activeWeddingId) return;
      const res = await apiFetch(`/api/weddings/${activeWeddingId}/tasks/backfill`, {
        method: 'POST'
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', activeWeddingId] });
      queryClient.invalidateQueries({ queryKey: ['weddings'] });
    }
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Badge variant="danger" size="sm">Critical</Badge>;
      case 'HIGH':
        return <Badge variant="warning" size="sm">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="gold" size="sm">Medium</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Low</Badge>;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'VENUE_DESIGN':
        return <span className="text-[11px] font-medium text-amber-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">Venue & Decor</span>;
      case 'VENDORS':
        return <span className="text-[11px] font-medium text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">Procurement</span>;
      case 'GUEST_LOGISTICS':
        return <span className="text-[11px] font-medium text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Guest Hospitality</span>;
      default:
        return <span className="text-[11px] font-medium text-rose-900 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">Big Day Ops</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-light text-[#231E1B]">Wedding Management & Task Engine</h2>
          <p className="text-xs text-[#7A6E63]">
            32 Full-Service / 20 Partial-Service milestone pipelines with automated state verification
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Wedding Switcher */}
          <select
            className="text-xs border border-[#EDE5DC] rounded px-3 py-1.5 bg-white font-medium text-[#231E1B] focus:ring-1 focus:ring-[#231E1B] focus:outline-none max-w-xs"
            value={activeWeddingId || ''}
            onChange={(e) => setSelectedWeddingId(e.target.value)}
          >
            {weddings.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title} ({w.venueName})
              </option>
            ))}
          </select>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => backfillMutation.mutate()}
            isLoading={backfillMutation.isPending}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Sync Tasks
          </Button>

          <Button
            variant="gold"
            size="sm"
            onClick={() => setIsCustomTaskModalOpen(true)}
            disabled={!activeWeddingId}
            leftIcon={<PlusCircle className="w-4 h-4" />}
          >
            Add Task
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreationModalOpen(true)}
            leftIcon={<Workflow className="w-4 h-4" />}
          >
            New Wedding
          </Button>
        </div>
      </div>

      {activeWedding && (
        /* Selected Wedding Overview Banner */
        <Card className="border-l-4 border-l-[#231E1B] bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant={activeWedding.packageType === 'FULL_SERVICE' ? 'wine' : 'gold'} size="sm">
                  {activeWedding.packageType.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-[#7A6E63] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-[#B89358]" />
                  {activeWedding.venueName}, {activeWedding.primaryCity}
                </span>
              </div>
              <h3 className="font-serif text-xl font-light text-[#231E1B] text-[#231E1B] mt-1">{activeWedding.title}</h3>
              <div className="flex items-center gap-4 text-xs text-[#7A6E63] mt-2">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#231E1B]" />
                  {new Date(activeWedding.startDate).toLocaleDateString()} to {new Date(activeWedding.endDate).toLocaleDateString()}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#231E1B]" />
                  {activeWedding.targetGuestCount} Royal Guests
                </span>
                <span>•</span>
                <span className="font-mono font-bold text-[#231E1B]">
                  Budget: {formatPaiseCompact(activeWedding.totalBudgetPaise)}
                </span>
              </div>
            </div>

            {/* Progress Bar Widget */}
            <div className="w-full md:w-64 bg-[#FAF6F1] p-3 rounded border border-[#EDE5DC]">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-[#231E1B]">Milestone Progress:</span>
                <span className="font-mono font-bold text-[#231E1B]">{activeWedding.progressPercent}%</span>
              </div>
              <div className="w-full bg-[#EDE5DC] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#231E1B] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${activeWedding.progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-[#7A6E63] mt-1">
                <span>{activeWedding.completedTasks} completed</span>
                <span>{activeWedding.totalTasks} total milestones</span>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Filter Toolbar */}
      <Card bodyClassName="p-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
          {/* Stage Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[#7A6E63] mr-1">Stage:</span>
            {['ALL', 'TO_PLAN', 'IN_PROGRESS', 'BLOCKED', 'DONE'].map((st) => (
              <button
                key={st}
                onClick={() => setStageFilter(st)}
                className={`px-2.5 py-1 rounded transition-colors ${
                  stageFilter === st
                    ? 'bg-[#231E1B] text-white font-medium'
                    : 'bg-[#FAF6F1] text-[#4A5568] hover:bg-[#EDE5DC]'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-[#7A6E63] mr-1">Category:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'VENUE_DESIGN', label: 'Venue' },
              { id: 'VENDORS', label: 'Vendors' },
              { id: 'GUEST_LOGISTICS', label: 'Logistics' },
              { id: 'BIG_DAY_EXECUTION', label: 'Big Day' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                  categoryFilter === cat.id
                    ? 'bg-[#B89358] text-white font-medium'
                    : 'bg-[#FAF6F1] text-[#4A5568] hover:bg-[#EDE5DC]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Tasks Table */}
      <Card>
        {tasksLoading ? (
          <div className="py-12 text-center text-xs text-[#7A6E63]">Loading milestone tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#7A6E63]">
            No tasks match the active filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#FAF6F1] text-[#231E1B] border-b border-[#EDE5DC]">
                <tr>
                  <th className="px-4 py-3 font-semibold">Milestone Deliverable</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Assigned Staff</th>
                  <th className="px-4 py-3 font-semibold">Due Date</th>
                  <th className="px-4 py-3 font-semibold">Priority</th>
                  <th className="px-4 py-3 font-semibold">Stage</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDE5DC]">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-amber-50/20">
                    <td className="px-4 py-3 max-w-sm">
                      <div className="font-semibold text-[#231E1B] flex items-center gap-1.5">
                        <span>{task.title}</span>
                        {task.isCustom && (
                          <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.2 rounded border border-purple-200">
                            Bespoke
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-[10px] text-stone-400 mt-0.5">
                        {task.templateKey}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {getCategoryBadge(task.category)}
                    </td>

                    <td className="px-4 py-3 text-[#4A5568]">
                      {task.assignedTo ? (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#B89358]" />
                          <div>
                            <span className="font-medium text-[#231E1B]">{task.assignedTo.name}</span>
                            <span className="text-[10px] text-[#7A6E63] block">
                              {task.assignedTo.role.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="italic text-stone-400">Unassigned</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[#231E1B] font-mono">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3">
                      {getPriorityBadge(task.priority)}
                    </td>

                    <td className="px-4 py-3">
                      <select
                        className={`text-[11px] px-2 py-1 rounded font-medium border border-[#EDE5DC] ${
                          task.stage === 'DONE'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : task.stage === 'IN_PROGRESS'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : task.stage === 'BLOCKED'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-stone-50 text-stone-700'
                        }`}
                        value={task.stage}
                        onChange={(e) =>
                          updateTaskStageMutation.mutate({
                            taskId: task.id,
                            stage: e.target.value
                          })
                        }
                      >
                        <option value="TO_PLAN">To Plan</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="BLOCKED">Blocked</option>
                        <option value="DONE">Done</option>
                      </select>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTaskTarget(task)}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <WeddingCreationModal
        isOpen={isCreationModalOpen}
        couples={couples}
        onClose={() => setIsCreationModalOpen(false)}
        onSuccess={(newId) => {
          setSelectedWeddingId(newId);
          queryClient.invalidateQueries({ queryKey: ['weddings'] });
        }}
      />

      {editTaskTarget && activeWeddingId && (
        <TaskAssignmentModal
          isOpen={!!editTaskTarget}
          weddingId={activeWeddingId}
          task={editTaskTarget}
          teamMembers={teamMembers}
          onClose={() => setEditTaskTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks', activeWeddingId] });
            queryClient.invalidateQueries({ queryKey: ['weddings'] });
          }}
        />
      )}

      {isCustomTaskModalOpen && activeWeddingId && activeWedding && (
        <CustomTaskModal
          isOpen={isCustomTaskModalOpen}
          weddingId={activeWeddingId}
          weddingTitle={activeWedding.title}
          teamMembers={teamMembers}
          onClose={() => setIsCustomTaskModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['tasks', activeWeddingId] });
            queryClient.invalidateQueries({ queryKey: ['weddings'] });
          }}
        />
      )}
    </div>
  );
};

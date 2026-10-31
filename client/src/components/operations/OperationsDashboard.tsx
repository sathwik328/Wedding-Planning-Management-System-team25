import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { NewActivityModal } from './NewActivityModal';
import { NewIncidentModal } from './NewIncidentModal';
import { ResolveIncidentModal } from './ResolveIncidentModal';
import { apiFetch } from '../../services/api';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Phone, 
  Radar, 
  Radio, 
  RefreshCw, 
  ShieldAlert, 
  Trash2, 
  UserCheck, 
  Users 
} from 'lucide-react';

interface EventScheduleItem {
  id: string;
  weddingDayId: string;
  subEvent: string;
  activityName: string;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
  coordinator?: {
    id: string;
    name: string;
    phone?: string;
    role: string;
  } | null;
  weddingDay?: {
    id: string;
    dayNumber: number;
    title: string;
    date: string;
  };
}

interface VendorCheckInItem {
  id: string;
  scheduledArrival: string | null;
  actualArrival: string | null;
  status: 'EXPECTED' | 'ARRIVED' | 'DELAYED' | 'UNSCHEDULED';
  delayMinutes: number;
  checkedInBy?: string | null;
  notes?: string | null;
  weddingVendor: {
    id: string;
    serviceCategory: string;
    vendor: {
      businessName: string;
      category: string;
      contactPerson: string;
      phone: string;
    };
  };
}

interface IncidentItem {
  id: string;
  title: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'CRITICAL';
  reportedAt: string;
  reportedBy: string;
  status: 'OPEN' | 'RESOLVING' | 'RESOLVED';
  resolvedAt?: string | null;
  resolutionNotes?: string | null;
}

export const OperationsDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedWeddingId, setSelectedWeddingId] = useState<string | null>(null);
  const [activeOpsTab, setActiveOpsTab] = useState<'timeline' | 'radar' | 'incidents' | 'roster'>('timeline');

  // Modals
  const [isNewActivityModalOpen, setIsNewActivityModalOpen] = useState(false);
  const [isNewIncidentModalOpen, setIsNewIncidentModalOpen] = useState(false);
  const [resolveIncidentTarget, setResolveIncidentTarget] = useState<IncidentItem | null>(null);

  // Queries
  const { data: weddings = [] } = useQuery<any[]>({
    queryKey: ['weddings'],
    queryFn: async () => {
      const res = await apiFetch('/api/weddings');
      const json = await res.json();
      return json.data || [];
    }
  });

  const activeWeddingId = selectedWeddingId || weddings[0]?.id || null;
  const activeWedding = weddings.find((w) => w.id === activeWeddingId);

  // Cockpit Summary Query
  const { data: cockpit, isLoading: cockpitLoading, refetch: refetchCockpit } = useQuery<any>({
    queryKey: ['cockpit', activeWeddingId],
    queryFn: async () => {
      if (!activeWeddingId) return null;
      const res = await apiFetch(`/api/operations/${activeWeddingId}/cockpit`);
      const json = await res.json();
      return json.data;
    },
    enabled: !!activeWeddingId
  });

  // Schedules Query
  const { data: schedules = [], isLoading: schedulesLoading } = useQuery<EventScheduleItem[]>({
    queryKey: ['schedules', activeWeddingId],
    queryFn: async () => {
      if (!activeWeddingId) return [];
      const res = await apiFetch(`/api/operations/${activeWeddingId}/schedules`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!activeWeddingId
  });

  // Vendor Check-ins Query
  const { data: vendorCheckIns = [], isLoading: radarLoading } = useQuery<VendorCheckInItem[]>({
    queryKey: ['vendorCheckIns', activeWeddingId],
    queryFn: async () => {
      if (!activeWeddingId) return [];
      const res = await apiFetch(`/api/operations/${activeWeddingId}/vendor-check-ins`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!activeWeddingId
  });

  // Incidents Query
  const { data: incidents = [], isLoading: incidentsLoading } = useQuery<IncidentItem[]>({
    queryKey: ['incidents', activeWeddingId],
    queryFn: async () => {
      if (!activeWeddingId) return [];
      const res = await apiFetch(`/api/operations/${activeWeddingId}/incidents`);
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!activeWeddingId
  });

  // Team Members
  const { data: teamMembers = [] } = useQuery<any[]>({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const res = await apiFetch('/api/weddings/team/members');
      const json = await res.json();
      return json.data || [];
    }
  });

  // Check-In Vendor Mutation
  const checkInMutation = useMutation({
    mutationFn: async ({ id, checkedInBy }: { id: string; checkedInBy: string }) => {
      if (!activeWeddingId) return;
      const res = await apiFetch(`/api/operations/${activeWeddingId}/vendor-check-ins/${id}/check-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkedInBy,
          notes: 'Checked in at on-ground palace entrance'
        })
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendorCheckIns', activeWeddingId] });
      queryClient.invalidateQueries({ queryKey: ['cockpit', activeWeddingId] });
    }
  });

  // Delete Schedule Mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      if (!activeWeddingId) return;
      await apiFetch(`/api/operations/${activeWeddingId}/schedules/${scheduleId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules', activeWeddingId] });
      queryClient.invalidateQueries({ queryKey: ['cockpit', activeWeddingId] });
    }
  });

  const getSubEventBadge = (sub: string) => {
    switch (sub) {
      case 'MEHENDI':
        return <Badge variant="warning" size="sm">Mehendi</Badge>;
      case 'HALDI':
        return <Badge variant="gold" size="sm">Haldi</Badge>;
      case 'SANGEET':
        return <Badge variant="wine" size="sm">Sangeet</Badge>;
      case 'BARAAT':
        return <Badge variant="wine" size="sm">Baraat</Badge>;
      case 'PHERAS':
        return <Badge variant="wine" size="sm">Pheras</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Reception</Badge>;
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return <Badge variant="danger" size="sm" dot>Critical Protocol</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning" size="sm" dot>Medium</Badge>;
      default:
        return <Badge variant="neutral" size="sm">Low</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Day-of Operations Cockpit</h2>
          <p className="text-xs text-[#718096]">
            Minute-by-minute ceremonial timeline, vendor arrival radar & live incident dispatch
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Wedding Selector */}
          <select
            className="text-xs border border-[#E7E2D8] rounded px-3 py-1.5 bg-white font-medium text-[#1E2229] focus:ring-1 focus:ring-[#5B1424] focus:outline-none max-w-xs"
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
            variant="ghost"
            size="sm"
            onClick={() => refetchCockpit()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Radar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsNewActivityModalOpen(true)}
            disabled={!activeWeddingId}
            leftIcon={<Clock className="w-4 h-4" />}
          >
            Add Activity
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsNewIncidentModalOpen(true)}
            disabled={!activeWeddingId}
            leftIcon={<ShieldAlert className="w-4 h-4" />}
          >
            Log Incident
          </Button>
        </div>
      </div>

      {/* Real-time Status Radar Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#5B1424]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#718096] uppercase">Scheduled Activities</span>
            <Clock className="w-4 h-4 text-[#5B1424]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#1E2229] mt-2">
            {schedules.length} Milestones
          </div>
        </Card>

        <Card className="border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#718096] uppercase">On-Schedule Vendors</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-800 mt-2">
            {cockpit?.stats?.onScheduleVendors ?? 0} Partners
          </div>
        </Card>

        <Card className="border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#718096] uppercase">Delayed Arrivals</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-rose-700 mt-2">
            {cockpit?.stats?.delayedVendorCount ?? 0} Delayed
          </div>
        </Card>

        <Card className="border-l-4 border-l-amber-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#718096] uppercase">Open Incidents</span>
            <Radio className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-800 mt-2">
            {cockpit?.stats?.openIncidentCount ?? 0} Active
          </div>
        </Card>
      </div>

      {/* Sub-Tabs: Timeline, Radar, Incidents, Staff Roster */}
      <div className="flex space-x-2 border-b border-[#E7E2D8]">
        <button
          onClick={() => setActiveOpsTab('timeline')}
          className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeOpsTab === 'timeline'
              ? 'border-[#5B1424] text-[#5B1424]'
              : 'border-transparent text-[#718096] hover:text-[#1E2229]'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Timeline Schedule ({schedules.length})</span>
        </button>

        <button
          onClick={() => setActiveOpsTab('radar')}
          className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeOpsTab === 'radar'
              ? 'border-[#5B1424] text-[#5B1424]'
              : 'border-transparent text-[#718096] hover:text-[#1E2229]'
          }`}
        >
          <Radar className="w-4 h-4" />
          <span>Vendor Arrival Radar ({vendorCheckIns.length})</span>
        </button>

        <button
          onClick={() => setActiveOpsTab('incidents')}
          className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeOpsTab === 'incidents'
              ? 'border-[#5B1424] text-[#5B1424]'
              : 'border-transparent text-[#718096] hover:text-[#1E2229]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Live Incidents ({incidents.length})</span>
        </button>

        <button
          onClick={() => setActiveOpsTab('roster')}
          className={`pb-2 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
            activeOpsTab === 'roster'
              ? 'border-[#5B1424] text-[#5B1424]'
              : 'border-transparent text-[#718096] hover:text-[#1E2229]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Roster ({cockpit?.staffRoster?.length ?? 0})</span>
        </button>
      </div>

      {/* 1. Minute-by-Minute Timeline Tab */}
      {activeOpsTab === 'timeline' && (
        <Card>
          {schedulesLoading ? (
            <div className="py-12 text-center text-xs text-[#718096]">Loading minute-by-minute timeline...</div>
          ) : schedules.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718096]">
              No schedule activities created for this wedding yet. Click &quot;Add Activity&quot; above to begin.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time Window</th>
                    <th className="px-4 py-3 font-semibold">Ceremony</th>
                    <th className="px-4 py-3 font-semibold">Activity & Protocol</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Lead Coordinator</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {schedules.map((item) => (
                    <tr key={item.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-mono font-medium text-[#5B1424] whitespace-nowrap">
                        {new Date(item.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
                        {new Date(item.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-[#718096] font-sans">
                          {item.weddingDay?.title || 'Day Schedule'}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {getSubEventBadge(item.subEvent)}
                      </td>

                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-semibold text-[#1E2229]">{item.activityName}</div>
                        {item.notes && (
                          <div className="text-[11px] text-[#718096] mt-0.5">{item.notes}</div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-[#1E2229]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#C5A059]" />
                          <span>{item.location}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[#4A5568]">
                        {item.coordinator ? (
                          <div>
                            <div className="font-medium text-[#1E2229]">{item.coordinator.name}</div>
                            {item.coordinator.phone && (
                              <div className="text-[10px] text-[#718096] flex items-center gap-1 mt-0.5">
                                <Phone className="w-3 h-3" />
                                <span>{item.coordinator.phone}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="italic text-stone-400">Unassigned</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteScheduleMutation.mutate(item.id)}
                          className="text-stone-400 hover:text-rose-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. Vendor Arrival Radar Tab */}
      {activeOpsTab === 'radar' && (
        <Card>
          {radarLoading ? (
            <div className="py-12 text-center text-xs text-[#718096]">Scanning arrival radar...</div>
          ) : vendorCheckIns.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718096]">
              No contracted vendors currently attached to this wedding dossier.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Vendor Partner</th>
                    <th className="px-4 py-3 font-semibold">Category</th>
                    <th className="px-4 py-3 font-semibold">Scheduled Target</th>
                    <th className="px-4 py-3 font-semibold">Arrival Status</th>
                    <th className="px-4 py-3 font-semibold">Delay Assessment</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {vendorCheckIns.map((ci) => (
                    <tr key={ci.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#1E2229]">
                          {ci.weddingVendor.vendor.businessName}
                        </div>
                        <div className="text-[11px] text-[#718096] flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          <span>{ci.weddingVendor.vendor.phone} ({ci.weddingVendor.vendor.contactPerson})</span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant="gold" size="sm">
                          {ci.weddingVendor.serviceCategory.replace('_', ' ')}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-mono text-[#1E2229]">
                        {ci.scheduledArrival ? (
                          new Date(ci.scheduledArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        ) : (
                          <span className="text-[#718096] italic">Unscheduled</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {ci.status === 'ARRIVED' && (
                          <Badge variant="success" size="sm" dot>
                            Arrived ({ci.actualArrival ? new Date(ci.actualArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''})
                          </Badge>
                        )}
                        {ci.status === 'EXPECTED' && (
                          <Badge variant="info" size="sm" dot>En Route / Expected</Badge>
                        )}
                        {ci.status === 'DELAYED' && (
                          <Badge variant="danger" size="sm" dot>Late / Alert</Badge>
                        )}
                        {ci.status === 'UNSCHEDULED' && (
                          <Badge variant="neutral" size="sm">Unscheduled</Badge>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {ci.delayMinutes > 0 ? (
                          <span className="font-bold text-rose-700 font-mono">
                            +{ci.delayMinutes} min delay
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium">On Schedule</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {ci.status !== 'ARRIVED' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() =>
                              checkInMutation.mutate({
                                id: ci.id,
                                checkedInBy: 'Lead Operations Coordinator'
                              })
                            }
                            isLoading={checkInMutation.isPending}
                            leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                          >
                            Check In
                          </Button>
                        ) : (
                          <span className="text-[11px] text-emerald-800 font-medium">Checked In</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 3. Incidents Tab */}
      {activeOpsTab === 'incidents' && (
        <Card>
          {incidentsLoading ? (
            <div className="py-12 text-center text-xs text-[#718096]">Loading operations incident logs...</div>
          ) : incidents.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718096]">
              Zero active incidents reported. Operations proceeding according to protocol.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Incident Details</th>
                    <th className="px-4 py-3 font-semibold">Severity</th>
                    <th className="px-4 py-3 font-semibold">Reported Info</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Resolution Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {incidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 max-w-sm">
                        <div className="font-semibold text-[#1E2229]">{inc.title}</div>
                        <div className="text-[11px] text-[#4A5568] mt-0.5">{inc.description}</div>
                        {inc.resolutionNotes && (
                          <div className="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded mt-1.5 border border-emerald-200">
                            <strong>Resolved:</strong> {inc.resolutionNotes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        {getSeverityBadge(inc.severity)}
                      </td>

                      <td className="px-4 py-3 text-[#4A5568]">
                        <div>{inc.reportedBy}</div>
                        <div className="text-[10px] text-[#718096]">
                          {new Date(inc.reportedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <Badge variant={inc.status === 'RESOLVED' ? 'success' : 'danger'} size="sm" dot>
                          {inc.status}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {inc.status !== 'RESOLVED' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setResolveIncidentTarget(inc)}
                          >
                            Resolve Incident
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 4. Staff Roster Tab */}
      {activeOpsTab === 'roster' && (
        <Card>
          {cockpitLoading ? (
            <div className="py-12 text-center text-xs text-[#718096]">Loading staff roster...</div>
          ) : !cockpit?.staffRoster || cockpit.staffRoster.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#718096]">
              No team members assigned to tasks or activities on this wedding yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Staff Member</th>
                    <th className="px-4 py-3 font-semibold">Operational Role</th>
                    <th className="px-4 py-3 font-semibold">Contact Details</th>
                    <th className="px-4 py-3 font-semibold">Assigned Tasks</th>
                    <th className="px-4 py-3 font-semibold">Coordinated Ceremonies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  {cockpit.staffRoster.map((item: any) => (
                    <tr key={item.user.id} className="hover:bg-amber-50/20">
                      <td className="px-4 py-3 font-semibold text-[#1E2229]">
                        {item.user.name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="wine" size="sm">
                          {item.user.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-[#4A5568]">
                        <div>{item.user.email}</div>
                        {item.user.phone && (
                          <div className="text-[11px] text-[#718096]">{item.user.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#5B1424]">
                        {item.taskCount} Milestones
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-[#C5A059]">
                        {item.scheduleCount} Activities
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      {isNewActivityModalOpen && activeWeddingId && (
        <NewActivityModal
          isOpen={isNewActivityModalOpen}
          weddingId={activeWeddingId}
          weddingDays={activeWedding?.days || []}
          coordinators={teamMembers}
          onClose={() => setIsNewActivityModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['schedules', activeWeddingId] });
            queryClient.invalidateQueries({ queryKey: ['cockpit', activeWeddingId] });
          }}
        />
      )}

      {isNewIncidentModalOpen && activeWeddingId && (
        <NewIncidentModal
          isOpen={isNewIncidentModalOpen}
          weddingId={activeWeddingId}
          onClose={() => setIsNewIncidentModalOpen(false)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['incidents', activeWeddingId] });
            queryClient.invalidateQueries({ queryKey: ['cockpit', activeWeddingId] });
          }}
        />
      )}

      {resolveIncidentTarget && activeWeddingId && (
        <ResolveIncidentModal
          isOpen={!!resolveIncidentTarget}
          weddingId={activeWeddingId}
          incident={resolveIncidentTarget}
          onClose={() => setResolveIncidentTarget(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['incidents', activeWeddingId] });
            queryClient.invalidateQueries({ queryKey: ['cockpit', activeWeddingId] });
          }}
        />
      )}
    </div>
  );
};

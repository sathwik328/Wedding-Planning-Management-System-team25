import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { CONTINGENCY_CATEGORIES, ContingencySeverity } from 'shared';

interface ContingencyPlan {
  id: string;
  category: string;
  riskTriggerCondition: string;
  primaryLocation: string;
  backupLocation: string;
  backupPowerRequired: boolean;
  standbyGeneratorKva?: number | null;
  severityOnActivation: ContingencySeverity;
  status: 'STANDBY' | 'ACTIVATED' | 'RESOLVED' | 'CANCELLED';
  assignedCommander: { id: string; name: string; role: string; phone?: string | null };
  standbyVendor?: { id: string; businessName: string; phone: string } | null;
  eventSchedule?: { id: string; activityName: string; location: string } | null;
  incident?: { id: string; title: string; severity: string; status: string } | null;
  activatedAt?: string | null;
  resolutionNotes?: string | null;
}

interface ContingencyPlannerModalProps {
  weddingId: string;
  weddingTitle: string;
  isOpen: boolean;
  onClose: () => void;
  teamMembers: any[];
  vendors: any[];
  onContingencyChanged?: () => void;
}

export const ContingencyPlannerModal: React.FC<ContingencyPlannerModalProps> = ({
  weddingId,
  weddingTitle,
  isOpen,
  onClose,
  teamMembers,
  vendors,
  onContingencyChanged
}) => {
  const [plans, setPlans] = useState<ContingencyPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'create'>('list');

  // Create form state
  const [category, setCategory] = useState<string>('WEATHER_RAIN');
  const [triggerCondition, setTriggerCondition] = useState('');
  const [primaryLocation, setPrimaryLocation] = useState('');
  const [backupLocation, setBackupLocation] = useState('');
  const [backupPower, setBackupPower] = useState(false);
  const [generatorKva, setGeneratorKva] = useState(125);
  const [commanderId, setCommanderId] = useState('');
  const [standbyVendorId, setStandbyVendorId] = useState('');
  const [severity, setSeverity] = useState<ContingencySeverity>('CRITICAL');

  // Emergency activation state
  const [activatingPlanId, setActivatingPlanId] = useState<string | null>(null);
  const [activationReason, setActivationReason] = useState('');

  // Resolution state
  const [resolvingPlanId, setResolvingPlanId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [restoreLocation, setRestoreLocation] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const targetId = weddingId || 'active';
      const res = await apiFetch(`/api/operations/${targetId}/contingencies`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data)) {
          setPlans(json.data);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch contingency plans:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      if (teamMembers && teamMembers.length > 0 && !commanderId) {
        // Auto-select eligible commander
        const eligible = teamMembers.find((m) =>
          ['ADMIN', 'LEAD_PLANNER', 'COORDINATOR'].includes(m.role?.toUpperCase())
        );
        if (eligible) setCommanderId(eligible.id);
      }
    }
  }, [isOpen, weddingId, teamMembers]);

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetCommander = commanderId;
    if (!targetCommander && teamMembers.length > 0) {
      const eligible = teamMembers.find((m) =>
        ['ADMIN', 'LEAD_PLANNER', 'COORDINATOR'].includes(m.role?.toUpperCase())
      );
      if (eligible) targetCommander = eligible.id;
    }

    if (!triggerCondition || !primaryLocation || !backupLocation) {
      alert('Please fill out all mandatory contingency fields (Trigger, Primary Location, Backup Location).');
      return;
    }

    try {
      setSubmitting(true);
      const targetWeddingId = weddingId || 'active';
      const payload: any = {
        category,
        riskTriggerCondition: triggerCondition,
        primaryLocation,
        backupLocation,
        backupPowerRequired: backupPower,
        standbyGeneratorKva: backupPower ? generatorKva : undefined,
        assignedCommanderId: targetCommander || '617ac202-0912-4076-97c7-b6d0240ec5d9',
        severityOnActivation: severity,
        contingencyBudgetPaise: '0'
      };

      if (standbyVendorId && standbyVendorId.trim() !== '') {
        payload.standbyVendorId = standbyVendorId;
      }

      const res = await apiFetch(`/api/operations/${targetWeddingId}/contingencies`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        const errorMsg =
          errData?.error?.message ||
          (typeof errData?.error === 'string' ? errData.error : `Server responded with status ${res.status}`);
        alert('Could not save contingency plan: ' + errorMsg);
        return;
      }

      // Reset form fields
      setTriggerCondition('');
      setPrimaryLocation('');
      setBackupLocation('');
      setStandbyVendorId('');
      setBackupPower(false);

      // Switch to list view and refresh
      setViewMode('list');
      setSuccessToast('Contingency protocol deployed successfully to STANDBY readiness.');
      setTimeout(() => setSuccessToast(null), 5000);
      await fetchPlans();
      onContingencyChanged?.();
    } catch (err: any) {
      alert('Network error registering contingency plan: ' + (err.message || String(err)));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActivateEmergency = async (planId: string) => {
    if (!activationReason) {
      alert('Emergency activation requires an explicit reason');
      return;
    }

    try {
      await apiFetch(`/api/operations/${weddingId}/contingencies/${planId}/activate`, {
        method: 'POST',
        body: JSON.stringify({
          activationNotes: activationReason,
          relocateSchedule: true
        })
      });
      setActivatingPlanId(null);
      setActivationReason('');
      fetchPlans();
      onContingencyChanged?.();
      alert('EMERGENCY CONTINGENCY ACTIVATED: Itinerary relocated, critical incident created, and task assigned!');
    } catch (err: any) {
      alert('Contingency activation failed: ' + err.message);
    }
  };

  const handleResolveContingency = async (planId: string) => {
    if (!resolutionNotes) {
      alert('Resolution post-mortem notes required');
      return;
    }

    try {
      await apiFetch(`/api/operations/${weddingId}/contingencies/${planId}/resolve`, {
        method: 'PATCH',
        body: JSON.stringify({
          resolutionNotes,
          restoreOriginalLocation: restoreLocation
        })
      });
      setResolvingPlanId(null);
      setResolutionNotes('');
      fetchPlans();
      onContingencyChanged?.();
      alert('Contingency resolved and closed.');
    } catch (err: any) {
      alert('Failed to resolve contingency: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(15, 10, 9, 0.65)',
        backdropFilter: 'blur(5px)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem'
      }}
    >
      <div
        style={{
          width: 'min(760px, 100%)',
          maxHeight: '90vh',
          background: 'var(--bg)',
          borderRadius: '16px',
          boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid var(--bd)'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.2rem 1.6rem',
            background: '#fff',
            borderBottom: '1px solid var(--bd)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ color: 'var(--er)' }}>⚠</span>
              <span style={{ fontSize: '.75rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--tp)', fontWeight: 600 }}>
                Operations Safety Architecture
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', margin: '.2rem 0 0' }}>Contingency & Emergency Backup Protocols</h2>
            <div style={{ fontSize: '.8rem', color: 'var(--tp)' }}>{weddingTitle}</div>
          </div>
          <button className="rk-btn o s" onClick={onClose} style={{ fontSize: '1rem', padding: '.3rem .6rem' }}>
            ✕
          </button>
        </div>

        {/* Action Toggle Bar */}
        <div style={{ padding: '.8rem 1.6rem', background: '#FAF6EE', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '.5rem' }}>
            <button
              className={`rk-btn s ${viewMode === 'list' ? 'g' : 'o'}`}
              onClick={() => setViewMode('list')}
            >
              Standby Protocols ({plans.length})
            </button>
            <button
              className={`rk-btn s ${viewMode === 'create' ? 'g' : 'o'}`}
              onClick={() => setViewMode('create')}
            >
              + Create Contingency Protocol
            </button>
          </div>
          <span style={{ fontSize: '.75rem', color: 'var(--tp)' }}>
            Active Plans: <b>{plans.filter((p) => p.status === 'ACTIVATED').length}</b>
          </span>
        </div>

        {/* Body Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {successToast && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '.8rem 1rem',
                borderRadius: '8px',
                background: '#F2F8F4',
                border: '1px solid #C7E4CE',
                color: 'var(--ok)',
                fontSize: '.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '.5rem',
                fontWeight: 600
              }}
            >
              <span>✓</span>
              <span>{successToast}</span>
            </div>
          )}

          {viewMode === 'create' ? (
            <form onSubmit={handleCreatePlan} style={{ display: 'grid', gap: '1.2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                    Risk Category *
                  </label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {CONTINGENCY_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                    Severity on Activation *
                  </label>
                  <select value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                    <option value="CRITICAL">CRITICAL (Escalates Radar & Alerts Founder)</option>
                    <option value="MEDIUM">MEDIUM (Field Operations Containment)</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                  Risk Trigger Threshold Condition *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rain probability exceeds 35% or wind gusts > 40 km/h at Crescent Lawn"
                  value={triggerCondition}
                  onChange={(e) => setTriggerCondition(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                    Primary Scheduled Venue *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Crescent Courtyard"
                    value={primaryLocation}
                    onChange={(e) => setPrimaryLocation(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                    Certified Backup Venue *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sheesh Mahal Enclosed Banquet Hall"
                    value={backupLocation}
                    onChange={(e) => setBackupLocation(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                    Assigned Incident Commander *
                  </label>
                  <select value={commanderId} onChange={(e) => setCommanderId(e.target.value)} required>
                    <option value="">Select internal commander...</option>
                    {teamMembers
                      .filter((m) => ['ADMIN', 'LEAD_PLANNER', 'COORDINATOR'].includes(m.role?.toUpperCase()))
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '.82rem', fontWeight: 600, marginBottom: '.3rem' }}>
                    Standby Vendor / Partner
                  </label>
                  <select value={standbyVendorId} onChange={(e) => setStandbyVendorId(e.target.value)}>
                    <option value="">None (Internal operations)</option>
                    {vendors.map((v) => (
                      <option key={v.id || v.n} value={v.id || v.n}>
                        {v.businessName || v.n} ({v.category || v.c})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', background: '#fff', padding: '.8rem 1rem', borderRadius: '8px', border: '1px solid var(--bd)' }}>
                <input
                  type="checkbox"
                  id="bp"
                  checked={backupPower}
                  onChange={(e) => setBackupPower(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="bp" style={{ fontSize: '.85rem', cursor: 'pointer', flex: 1 }}>
                  Require Standby Generator Power & Silent DG Connection
                </label>
                {backupPower && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span style={{ fontSize: '.8rem' }}>Capacity:</span>
                    <input
                      type="number"
                      value={generatorKva}
                      onChange={(e) => setGeneratorKva(Number(e.target.value))}
                      style={{ width: '80px', padding: '.3rem' }}
                    />
                    <span style={{ fontSize: '.8rem' }}>kVA</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.8rem', marginTop: '.8rem' }}>
                <button type="button" className="rk-btn o s" onClick={() => setViewMode('list')}>
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="rk-btn g s">
                  {submitting ? 'Registering Protocol...' : 'Register Contingency Plan'}
                </button>
              </div>
            </form>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--tp)' }}>
              <div style={{ color: 'var(--gold)', fontSize: '1.5rem', marginBottom: '.5rem' }}>◈</div>
              <div>Loading standby contingency protocols...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {plans.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--tp)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '.5rem' }}>🛡</div>
                  <b>No Contingency Protocols Configured</b>
                  <p style={{ fontSize: '.85rem', maxWidth: '400px', margin: '.4rem auto 1rem' }}>
                    Destination weddings require backup plans for weather, power, and supplier no-shows.
                  </p>
                  <button className="rk-btn g s" onClick={() => setViewMode('create')}>
                    + Create First Contingency Plan
                  </button>
                </div>
              ) : (
                plans.map((p) => {
                  const isActivated = p.status === 'ACTIVATED';
                  const isResolved = p.status === 'RESOLVED';

                  return (
                    <div
                      key={p.id}
                      className="card"
                      style={{
                        padding: '1.2rem',
                        background: isActivated ? '#FDF8EE' : '#fff',
                        borderLeft: `5px solid ${isActivated ? 'var(--er)' : isResolved ? 'var(--ok)' : 'var(--gold)'}`,
                        display: 'grid',
                        gap: '.8rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.6rem' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                            <span className={`bd b-${isActivated ? 'er' : isResolved ? 'ok' : 'in'}`} style={{ fontSize: '.72rem' }}>
                              {p.status}
                            </span>
                            <span style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--tp)' }}>
                              {p.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <h4 style={{ margin: '.3rem 0 0', fontSize: '1.1rem' }}>
                            Primary: <b>{p.primaryLocation}</b> ➔ Backup: <b>{p.backupLocation}</b>
                          </h4>
                        </div>

                        {/* Action Buttons */}
                        <div>
                          {p.status === 'STANDBY' && (
                            <button
                              className="rk-btn s"
                              onClick={() => setActivatingPlanId(p.id)}
                              style={{ background: '#A5403F', color: '#fff', fontWeight: 600 }}
                            >
                              ⚡ ACTIVATE EMERGENCY
                            </button>
                          )}

                          {p.status === 'ACTIVATED' && (
                            <button
                              className="rk-btn s"
                              onClick={() => setResolvingPlanId(p.id)}
                              style={{ background: '#4F7A57', color: '#fff', fontWeight: 600 }}
                            >
                              ✓ RESOLVE & CLOSE
                            </button>
                          )}
                        </div>
                      </div>

                      <div style={{ fontSize: '.82rem', color: 'var(--tp)', background: '#FAF6EE', padding: '.6rem .9rem', borderRadius: '6px' }}>
                        <b>Trigger Condition:</b> {p.riskTriggerCondition}
                      </div>

                      <div style={{ display: 'flex', gap: '1.5rem', fontSize: '.8rem', flexWrap: 'wrap', color: 'var(--tp)' }}>
                        <div>
                          Commander: <b>{p.assignedCommander?.name || 'Assigned Lead'}</b> ({p.assignedCommander?.role})
                        </div>
                        {p.backupPowerRequired && (
                          <div>
                            Silent DG Power: <b>{p.standbyGeneratorKva || 125} kVA</b>
                          </div>
                        )}
                        {p.standbyVendor && (
                          <div>
                            Standby Supplier: <b>{p.standbyVendor.businessName}</b>
                          </div>
                        )}
                      </div>

                      {/* Activation Modal Sub-Form */}
                      {activatingPlanId === p.id && (
                        <div style={{ background: '#fff', border: '1px solid var(--er)', borderRadius: '8px', padding: '1rem', display: 'grid', gap: '.8rem' }}>
                          <b style={{ color: 'var(--er)', fontSize: '.9rem' }}>
                            Confirm Emergency Activation — High Consequence Action
                          </b>
                          <div style={{ fontSize: '.8rem', color: 'var(--tp)' }}>
                            Activating will immediately relocate the ceremony venue, log a critical incident, and dispatch milestone tasks to the team.
                          </div>
                          <input
                            type="text"
                            placeholder="Reason for triggering emergency (e.g. Unseasonal downpour detected at 16:30)"
                            value={activationReason}
                            onChange={(e) => setActivationReason(e.target.value)}
                          />
                          <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}>
                            <button className="rk-btn o s" onClick={() => setActivatingPlanId(null)}>
                              Cancel
                            </button>
                            <button
                              className="rk-btn s"
                              style={{ background: 'var(--er)', color: '#fff' }}
                              onClick={() => handleActivateEmergency(p.id)}
                            >
                              Confirm Emergency Relocation ⚡
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Resolution Modal Sub-Form */}
                      {resolvingPlanId === p.id && (
                        <div style={{ background: '#fff', border: '1px solid var(--ok)', borderRadius: '8px', padding: '1rem', display: 'grid', gap: '.8rem' }}>
                          <b style={{ color: 'var(--ok)', fontSize: '.9rem' }}>Resolve Contingency Protocol</b>
                          <input
                            type="text"
                            placeholder="Post-mortem resolution notes (e.g. Successfully executed dinner in Sheesh Mahal)"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                          />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.8rem', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={restoreLocation}
                              onChange={(e) => setRestoreLocation(e.target.checked)}
                            />
                            Restore itinerary schedule back to original venue location
                          </label>
                          <div style={{ display: 'flex', gap: '.6rem', justifyContent: 'flex-end' }}>
                            <button className="rk-btn o s" onClick={() => setResolvingPlanId(null)}>
                              Cancel
                            </button>
                            <button
                              className="rk-btn s"
                              style={{ background: 'var(--ok)', color: '#fff' }}
                              onClick={() => handleResolveContingency(p.id)}
                            >
                              Finalize & Close Incident ✓
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.6rem', background: '#fff', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="rk-btn o s" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

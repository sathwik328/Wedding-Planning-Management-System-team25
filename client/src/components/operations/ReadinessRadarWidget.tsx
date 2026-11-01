import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { RadarSeverity, WeddingReadinessAuditResponse } from 'shared';

interface ReadinessRadarWidgetProps {
  weddingId: string;
  onOpenContingency?: () => void;
}

export const ReadinessRadarWidget: React.FC<ReadinessRadarWidgetProps> = ({ weddingId, onOpenContingency }) => {
  const [audit, setAudit] = useState<WeddingReadinessAuditResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/api/operations/${weddingId}/readiness`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setAudit(json.data);
          setError(null);
        }
      } else {
        const errJson = await res.json().catch(() => null);
        const rawErr = errJson?.error;
        let msg = 'Operational data pending synchronization';
        if (typeof rawErr === 'string') {
          msg = rawErr;
        } else if (rawErr && typeof rawErr.message === 'string') {
          msg = rawErr.message;
        } else if (errJson && typeof errJson.message === 'string') {
          msg = errJson.message;
        }
        setError(msg);
      }
    } catch (err: any) {
      setError(typeof err?.message === 'string' ? err.message : 'Failed to load readiness radar audit');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!weddingId || weddingId === 'wed-demo-01') {
      setLoading(false);
      setAudit(null);
      setError(null);
      return;
    }
    fetchAudit();
  }, [weddingId]);

  if (!weddingId || weddingId === 'wed-demo-01') {
    return (
      <div className="card" style={{ padding: '1.2rem', borderLeft: '4px solid var(--gold)', background: '#FAF6EE' }}>
        <div style={{ fontWeight: 600, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          <span style={{ color: 'var(--gold)' }}>◈</span>
          <span>Wedding Readiness & Risk Radar Cockpit</span>
        </div>
        <div style={{ fontSize: '.85rem', color: 'var(--tp)', marginTop: '.3rem' }}>
          Select an active wedding from your portfolio above to inspect real-time readiness scores, vendor punctuality, and risk interventions.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--gold)', fontSize: '1.2rem', marginBottom: '.5rem' }}>◈</div>
        <div style={{ fontSize: '.9rem', color: 'var(--tp)' }}>Computing real-time readiness vectors...</div>
      </div>
    );
  }

  if (error || !audit) {
    const errorDisplay = typeof error === 'string'
      ? error
      : (error && typeof (error as any).message === 'string' ? (error as any).message : 'Operational data pending synchronization');

    return (
      <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--er)' }}>
        <div style={{ fontWeight: 600, color: 'var(--er)' }}>Readiness Radar Notice</div>
        <div style={{ fontSize: '.85rem', color: 'var(--tp)', marginTop: '.3rem' }}>
          {errorDisplay}
        </div>
      </div>
    );
  }

  const getSeverityTheme = (sev: RadarSeverity) => {
    switch (sev) {
      case 'CRITICAL':
        return { color: '#A5403F', bg: '#FDF2F2', border: '#F1C0BF', label: 'CRITICAL RISK', badge: 'er' };
      case 'HIGH':
        return { color: '#B9791B', bg: '#FEF8EE', border: '#F6DFB8', label: 'ELEVATED RISK', badge: 'wa' };
      case 'MEDIUM':
        return { color: '#976A1C', bg: '#FFFDF5', border: '#F8EECF', label: 'MODERATE RISK', badge: 'wa' };
      case 'LOW':
        return { color: '#4F7A57', bg: '#F2F8F4', border: '#C7E4CE', label: 'OPTIMAL READINESS', badge: 'ok' };
      default:
        return { color: '#8C7B6B', bg: '#FAF6EE', border: '#E7DFD0', label: 'PENDING SETUP', badge: 'in' };
    }
  };

  const theme = getSeverityTheme(audit.severityLevel);
  const score = audit.overallScore;

  return (
    <div
      className="card"
      style={{
        padding: '1.5rem',
        borderTop: `4px solid ${theme.color}`,
        background: '#fff',
        display: 'grid',
        gap: '1.2rem'
      }}
    >
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.8rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <span style={{ fontSize: '1.1rem', color: theme.color }}>◈</span>
            <span style={{ fontSize: '.75rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--tp)', fontWeight: 600 }}>
              Wedding Readiness & Risk Radar
            </span>
            <span className={`bd b-${theme.badge}`} style={{ fontSize: '.72rem', textTransform: 'uppercase' }}>
              {theme.label}
            </span>
          </div>
          <h3 style={{ margin: '.3rem 0 0', fontSize: '1.4rem' }}>{audit.weddingTitle}</h3>
          <div style={{ fontSize: '.82rem', color: 'var(--tp)', marginTop: '.2rem' }}>
            {audit.statusLabel}
          </div>
        </div>

        {/* Circular Gauge / Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '84px',
              height: '84px',
              borderRadius: '50%',
              background: theme.bg,
              border: `3px solid ${theme.color}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(41,35,33,0.06)'
            }}
          >
            {score !== null ? (
              <>
                <b style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.9rem', lineHeight: 1, color: theme.color }}>
                  {score}
                </b>
                <span style={{ fontSize: '.62rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--tp)' }}>
                  / 100
                </span>
              </>
            ) : (
              <span style={{ fontSize: '.7rem', color: 'var(--tp)', fontWeight: 600, textAlign: 'center', padding: '0 4px' }}>
                SETUP
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hard Blocker Alerts Banner */}
      {audit.hardBlockers && audit.hardBlockers.length > 0 && (
        <div
          style={{
            background: theme.bg,
            border: `1px solid ${theme.border}`,
            borderRadius: '10px',
            padding: '1rem 1.2rem',
            display: 'grid',
            gap: '.6rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontWeight: 600, fontSize: '.85rem', color: theme.color }}>
            <span>⚠</span>
            <span>Active Risk Interventions Required ({audit.hardBlockers.length})</span>
          </div>
          {audit.hardBlockers.map((hb, idx) => (
            <div
              key={idx}
              style={{
                background: '#fff',
                padding: '.6rem .9rem',
                borderRadius: '6px',
                border: '1px solid var(--bd)',
                fontSize: '.82rem',
                display: 'grid',
                gap: '.2rem'
              }}
            >
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{hb.reason}</div>
              <div style={{ color: 'var(--tp)', fontSize: '.78rem' }}>
                <span style={{ color: 'var(--gold)', fontWeight: 600 }}>Action: </span>
                {hb.recommendedAction}
              </div>
            </div>
          ))}

          {onOpenContingency && (
            <div style={{ marginTop: '.4rem' }}>
              <button
                className="rk-btn o s"
                onClick={onOpenContingency}
                style={{ background: '#fff', borderColor: theme.color, color: theme.color, fontWeight: 600 }}
              >
                Open Contingency & Backup Protocols ↗
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 Pillars Breakdown Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginTop: '.3rem' }}>
        {Object.entries(audit.pillars).map(([key, p]) => (
          <div
            key={key}
            style={{
              padding: '.85rem',
              borderRadius: '8px',
              border: '1px solid var(--bd)',
              background: '#FAF6EE'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <b style={{ fontSize: '.85rem' }}>{p.pillar}</b>
              <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--ink)' }}>
                {p.earnedScore} <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>/ {p.maxScore}</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div
              style={{
                height: '6px',
                borderRadius: '3px',
                background: '#E7DFD0',
                margin: '.5rem 0 .4rem',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${p.percentage}%`,
                  background: p.percentage >= 80 ? 'var(--ok)' : p.percentage >= 50 ? 'var(--gold)' : 'var(--er)',
                  transition: 'width 0.3s'
                }}
              />
            </div>

            <div style={{ fontSize: '.75rem', color: 'var(--tp)' }}>{p.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

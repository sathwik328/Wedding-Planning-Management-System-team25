import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { VendorReliabilityScorecard } from 'shared';

interface VendorReliabilityModalProps {
  vendorId: string;
  vendorName: string;
  isOpen: boolean;
  onClose: () => void;
}

export const VendorReliabilityModal: React.FC<VendorReliabilityModalProps> = ({
  vendorId,
  vendorName,
  isOpen,
  onClose
}) => {
  const [scorecard, setScorecard] = useState<VendorReliabilityScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDossier = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await apiFetch(`/api/vendors/${vendorId}/reliability-dossier`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            setScorecard(json.data);
          }
        } else {
          const errJson = await res.json().catch(() => null);
          setError(errJson?.error || 'Failed to fetch vendor reliability dossier');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch vendor reliability dossier');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && vendorId) {
      fetchDossier();
    }
  }, [isOpen, vendorId]);

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
          width: 'min(640px, 100%)',
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
              <span style={{ color: 'var(--gold)' }}>★</span>
              <span style={{ fontSize: '.75rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--tp)', fontWeight: 600 }}>
                Procurement Intelligence
              </span>
            </div>
            <h2 style={{ fontSize: '1.4rem', margin: '.2rem 0 0' }}>Vendor Reliability Dossier</h2>
            <div style={{ fontSize: '.8rem', color: 'var(--tp)' }}>{vendorName}</div>
          </div>
          <button className="rk-btn o s" onClick={onClose} style={{ fontSize: '1rem', padding: '.3rem .6rem' }}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'grid', gap: '1.2rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--tp)' }}>
              <div style={{ color: 'var(--gold)', fontSize: '1.5rem', marginBottom: '.5rem' }}>◈</div>
              <div>Computing empirical reliability index...</div>
            </div>
          ) : error || !scorecard ? (
            <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--er)' }}>
              {error || 'Scorecard data unavailable'}
            </div>
          ) : (
            <>
              {/* Reliability Score Card */}
              <div
                className="card"
                style={{
                  padding: '1.4rem',
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                    <span
                      className={`bd b-${scorecard.ratingStatus === 'RATED' ? 'ok' : 'in'}`}
                      style={{ fontSize: '.72rem' }}
                    >
                      {scorecard.ratingStatus === 'RATED' ? 'RATED SUPPLIER' : 'EMERGING PARTNER'}
                    </span>
                    <span style={{ fontSize: '.75rem', color: 'var(--tp)', fontWeight: 600 }}>
                      {scorecard.category} &bull; {scorecard.city}
                    </span>
                  </div>
                  <h3 style={{ margin: '.4rem 0 .2rem', fontSize: '1.3rem' }}>{scorecard.businessName}</h3>
                  <div style={{ fontSize: '.8rem', color: 'var(--tp)' }}>
                    Assessment Confidence:{' '}
                    <b style={{ color: scorecard.evidenceCoverage.isStatisticallyConfident ? 'var(--ok)' : 'var(--wa)' }}>
                      {scorecard.scoreType.replace(/_/g, ' ')}
                    </b>
                  </div>
                </div>

                {/* Circular Score */}
                <div
                  style={{
                    width: '92px',
                    height: '92px',
                    borderRadius: '50%',
                    background: scorecard.reliabilityIndex !== null ? '#F2F8F4' : '#FAF6EE',
                    border: `3px solid ${scorecard.reliabilityIndex !== null ? 'var(--ok)' : 'var(--bd)'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {scorecard.reliabilityIndex !== null ? (
                    <>
                      <b style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '2.2rem', lineHeight: 1, color: 'var(--ok)' }}>
                        {scorecard.reliabilityIndex}
                      </b>
                      <span style={{ fontSize: '.62rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--tp)' }}>
                        / 100
                      </span>
                    </>
                  ) : (
                    <span style={{ fontSize: '.7rem', color: 'var(--tp)', fontWeight: 600, textAlign: 'center' }}>
                      UNRATED
                    </span>
                  )}
                </div>
              </div>

              {/* Evidence Coverage & Missing Metric Notice */}
              <div
                style={{
                  background: '#FAF6EE',
                  border: '1px solid var(--bd)',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'grid',
                  gap: '.5rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '.85rem' }}>
                  <b>Statistical Evidence Coverage</b>
                  <b style={{ color: scorecard.evidenceCoverage.coveragePercent >= 80 ? 'var(--ok)' : 'var(--gold)' }}>
                    {scorecard.evidenceCoverage.coveragePercent}%
                  </b>
                </div>

                <div style={{ height: '6px', borderRadius: '3px', background: '#E7DFD0', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${scorecard.evidenceCoverage.coveragePercent}%`,
                      background: scorecard.evidenceCoverage.coveragePercent >= 80 ? 'var(--ok)' : 'var(--gold)'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', marginTop: '.2rem' }}>
                  {scorecard.evidenceCoverage.availableComponents.map((c) => (
                    <span key={c} className="bd b-ok" style={{ fontSize: '.68rem' }}>
                      ✓ {c.replace(/_/g, ' ')}
                    </span>
                  ))}
                  {scorecard.evidenceCoverage.missingComponents.map((m) => (
                    <span key={m} className="bd b-wa" style={{ fontSize: '.68rem' }}>
                      ○ PENDING: {m.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3 Component Breakdown Cards */}
              <div style={{ display: 'grid', gap: '.8rem' }}>
                {/* 1. Punctuality */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--bd)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Punctuality (Max 40 pts)
                    </div>
                    <b style={{ fontSize: '1rem', color: 'var(--ink)' }}>{scorecard.components.punctuality.metricLabel}</b>
                    <div style={{ fontSize: '.8rem', color: 'var(--tp)', marginTop: '.1rem' }}>
                      {scorecard.components.punctuality.metricValueText}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ fontSize: '1.3rem', color: scorecard.components.punctuality.available ? 'var(--ink)' : 'var(--tp)' }}>
                      {scorecard.components.punctuality.available ? scorecard.components.punctuality.earnedPoints : '—'}
                    </b>
                    <span style={{ fontSize: '.75rem', color: 'var(--tp)' }}> / 40</span>
                  </div>
                </div>

                {/* 2. Cost Fidelity */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--bd)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Cost Fidelity vs Contract Baseline (Max 35 pts)
                    </div>
                    <b style={{ fontSize: '1rem', color: 'var(--ink)' }}>{scorecard.components.costFidelity.metricLabel}</b>
                    <div style={{ fontSize: '.8rem', color: 'var(--tp)', marginTop: '.1rem' }}>
                      {scorecard.components.costFidelity.metricValueText}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ fontSize: '1.3rem', color: scorecard.components.costFidelity.available ? 'var(--ink)' : 'var(--tp)' }}>
                      {scorecard.components.costFidelity.available ? scorecard.components.costFidelity.earnedPoints : '—'}
                    </b>
                    <span style={{ fontSize: '.75rem', color: 'var(--tp)' }}> / 35</span>
                  </div>
                </div>

                {/* 3. Incident Stability */}
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid var(--bd)',
                    borderRadius: '8px',
                    padding: '1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase', fontWeight: 600 }}>
                      Incident-Free Operations (Max 25 pts)
                    </div>
                    <b style={{ fontSize: '1rem', color: 'var(--ink)' }}>{scorecard.components.incidentStability.metricLabel}</b>
                    <div style={{ fontSize: '.8rem', color: 'var(--tp)', marginTop: '.1rem' }}>
                      {scorecard.components.incidentStability.metricValueText}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <b style={{ fontSize: '1.3rem', color: scorecard.components.incidentStability.available ? 'var(--ink)' : 'var(--tp)' }}>
                      {scorecard.components.incidentStability.available ? scorecard.components.incidentStability.earnedPoints : '—'}
                    </b>
                    <span style={{ fontSize: '.75rem', color: 'var(--tp)' }}> / 25</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.6rem', background: '#fff', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="rk-btn o s" onClick={onClose}>
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};

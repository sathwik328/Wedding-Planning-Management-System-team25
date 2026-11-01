import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';
import { BudgetSimulationResult } from 'shared';

interface BudgetSimulatorDrawerProps {
  weddingId: string;
  weddingTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

const inr = (n: number | string) => {
  const num = typeof n === 'string' ? Number(n) : n;
  return '₹' + Math.round(num / 100).toLocaleString('en-IN');
};

export const BudgetSimulatorDrawer: React.FC<BudgetSimulatorDrawerProps> = ({
  weddingId,
  weddingTitle,
  isOpen,
  onClose
}) => {
  const [additionalPlates, setAdditionalPlates] = useState<number>(25);
  const [extraPhotographyHours, setExtraPhotographyHours] = useState<number>(2);
  const [extraSoundHours, setExtraSoundHours] = useState<number>(2);
  const [extraDecorBudget, setExtraDecorBudget] = useState<number>(100000);
  const [agencyMarkupPercent, setAgencyMarkupPercent] = useState<number>(0);

  const [simulation, setSimulation] = useState<BudgetSimulationResult | null>(null);
  const runSimulation = async () => {
    try {
      const res = await apiFetch('/api/finance/simulate-budget', {
        method: 'POST',
        body: JSON.stringify({
          weddingId,
          deltaGuestCount: additionalPlates,
          additionalCateringPlates: additionalPlates,
          extraPhotographyHours,
          extraSoundHours,
          extraDecorBudgetPaise: String(extraDecorBudget * 100),
          agencyMarkupPercent
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setSimulation(json.data);
        }
      }
    } catch (err: any) {
      console.error('Simulation calculation failed:', err);
    }
  };

  useEffect(() => {
    if (isOpen && weddingId) {
      runSimulation();
    }
  }, [
    isOpen,
    weddingId,
    additionalPlates,
    extraPhotographyHours,
    extraSoundHours,
    extraDecorBudget,
    agencyMarkupPercent
  ]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(15, 10, 9, 0.55)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        style={{
          width: 'min(640px, 100%)',
          height: '100%',
          background: 'var(--bg)',
          boxShadow: '-8px 0 32px rgba(41,35,33,0.2)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Drawer Header */}
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
              <span style={{ color: 'var(--gold)' }}>◈</span>
              <span style={{ fontSize: '.75rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--tp)', fontWeight: 600 }}>
                High-Consequence Financial Tool
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: '.2rem 0 0' }}>Budget Impact Simulator</h2>
            <div style={{ fontSize: '.8rem', color: 'var(--tp)' }}>{weddingTitle}</div>
          </div>
          <button className="rk-btn o s" onClick={onClose} style={{ fontSize: '1rem', padding: '.3rem .6rem' }}>
            ✕
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'grid', gap: '1.5rem' }}>
          {/* Rate Discovery Verification Alert */}
          {simulation && (
            <div
              style={{
                background: '#fff',
                border: '1px solid var(--bd)',
                borderRadius: '10px',
                padding: '1rem',
                fontSize: '.82rem',
                display: 'grid',
                gap: '.4rem'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ color: 'var(--ink)' }}>Awarded Procurement Rate Sources</b>
                <span
                  className={`bd b-${simulation.simulationDeltas.cateringPlateRateStatus === 'AWARDED' ? 'ok' : 'wa'}`}
                  style={{ fontSize: '.7rem' }}
                >
                  {simulation.simulationDeltas.cateringPlateRateStatus === 'AWARDED' ? 'AWARDED TENDER' : 'UNCONTRACTED ESTIMATE'}
                </span>
              </div>
              <div style={{ color: 'var(--tp)' }}>
                Catering Plate: <b>{inr(simulation.simulationDeltas.cateringPlateRatePaise)}/plate</b> &bull; Photography Overtime: <b>{inr(simulation.simulationDeltas.photographyExtraRatePaise)}/hr</b> &bull; Sound Overtime: <b>{inr(simulation.simulationDeltas.soundExtraRatePaise)}/hr</b>
              </div>
            </div>
          )}

          {/* Interactive What-If Parameter Controls */}
          <div className="card" style={{ padding: '1.2rem', display: 'grid', gap: '1.2rem' }}>
            <h4 style={{ margin: 0, fontSize: '1rem' }}>Simulated Scope Expansion Parameters</h4>

            {/* Additional Catering Plates */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
                <span>Additional Catering Plates (Headcount Delta)</span>
                <b>+{additionalPlates} Plates</b>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="5"
                value={additionalPlates}
                onChange={(e) => setAdditionalPlates(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
            </div>

            {/* Extra Photography Hours */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
                <span>Extra Photography / Cinematography Hours</span>
                <b>+{extraPhotographyHours} hrs</b>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={extraPhotographyHours}
                onChange={(e) => setExtraPhotographyHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
            </div>

            {/* Extra Sound / Light Overtime */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
                <span>Sangeet Sound & Lighting Overtime</span>
                <b>+{extraSoundHours} hrs</b>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={extraSoundHours}
                onChange={(e) => setExtraSoundHours(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
            </div>

            {/* Additional Decor Enhancements */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
                <span>Floral & Production Add-on Budget</span>
                <b>₹{(extraDecorBudget / 1000).toLocaleString('en-IN')}k</b>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="10000"
                value={extraDecorBudget}
                onChange={(e) => setExtraDecorBudget(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
            </div>

            {/* Agency Markup Slider */}
            <div style={{ paddingTop: '.5rem', borderTop: '1px solid var(--bd)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.85rem', marginBottom: '.3rem' }}>
                <span>Simulated Agency Markup on Scope Expansion</span>
                <b style={{ color: agencyMarkupPercent > 0 ? 'var(--ok)' : 'var(--tp)' }}>
                  {agencyMarkupPercent}% {agencyMarkupPercent === 0 ? '(Exact Pass-Through)' : 'Markup'}
                </b>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="1"
                value={agencyMarkupPercent}
                onChange={(e) => setAgencyMarkupPercent(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--gold)' }}
              />
              <div style={{ fontSize: '.72rem', color: 'var(--tp)', marginTop: '.2rem' }}>
                Default is 0.0% exact pass-through. Increase slider to model agency management margin.
              </div>
            </div>
          </div>

          {/* Real-time Financial Impact Comparison */}
          {simulation && (
            <div className="card" style={{ padding: '1.2rem', display: 'grid', gap: '1rem', background: '#fff' }}>
              <h4 style={{ margin: 0, fontSize: '1rem' }}>Projected Financial Impact Summary</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: '#FAF6EE', padding: '.9rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase' }}>Baseline Expenses</div>
                  <b style={{ fontSize: '1.2rem', color: 'var(--ink)' }}>{inr(simulation.baseline.committedExpensesPaise)}</b>
                </div>

                <div style={{ background: '#FAF6EE', padding: '.9rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase' }}>Scope Cost Delta (Vendor Cost)</div>
                  <b style={{ fontSize: '1.2rem', color: 'var(--er)' }}>+{inr(simulation.simulationDeltas.totalExpenseDeltaPaise)}</b>
                </div>

                <div style={{ background: '#FAF6EE', padding: '.9rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase' }}>Client Billing Add-On</div>
                  <b style={{ fontSize: '1.2rem', color: 'var(--ok)' }}>+{inr(simulation.simulationDeltas.clientBilledRevenueDeltaPaise)}</b>
                </div>

                <div style={{ background: '#FAF6EE', padding: '.9rem', borderRadius: '8px' }}>
                  <div style={{ fontSize: '.75rem', color: 'var(--tp)', textTransform: 'uppercase' }}>Agency Gross Profit Delta</div>
                  <b style={{ fontSize: '1.2rem', color: 'var(--gold)' }}>+{inr(simulation.simulationDeltas.agencyMarkupRevenueDeltaPaise)}</b>
                </div>
              </div>

              {/* Total Projected Bottom Line */}
              <div
                style={{
                  padding: '1rem',
                  borderRadius: '10px',
                  background: simulation.projectedTotals.isDeficit ? '#FDF2F2' : '#F2F8F4',
                  border: `1px solid ${simulation.projectedTotals.isDeficit ? '#F1C0BF' : '#C7E4CE'}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '.78rem', color: 'var(--tp)' }}>Total Projected Profit After Scope Expansion</div>
                  <b style={{ fontSize: '1.4rem', color: simulation.projectedTotals.isDeficit ? 'var(--er)' : 'var(--ok)' }}>
                    {inr(simulation.projectedTotals.projectedProfitPaise)}
                  </b>
                  <span style={{ fontSize: '.8rem', marginLeft: '.6rem', color: 'var(--tp)' }}>
                    (Margin: {simulation.projectedTotals.projectedMarginPercent !== null ? `${simulation.projectedTotals.projectedMarginPercent}%` : 'Pre-Invoicing'})
                  </span>
                </div>

                {simulation.projectedTotals.isDeficit && (
                  <span className="bd b-er" style={{ fontSize: '.75rem' }}>
                    DEFICIT WARNING
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div style={{ padding: '1rem 1.6rem', background: '#fff', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'flex-end', gap: '.8rem' }}>
          <button className="rk-btn o s" onClick={onClose}>
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};

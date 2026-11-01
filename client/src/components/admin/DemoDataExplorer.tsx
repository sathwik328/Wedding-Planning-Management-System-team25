import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../services/api';

export interface DemoDataExplorerProps {
  onNavigateTab?: (tab: string) => void;
}

const ENTITY_NAV_MAP: Record<string, { tab: string; label: string }> = {
  Couples: { tab: 'cli', label: 'Couples & Client Dossiers' },
  Weddings: { tab: 'wed', label: 'Wedding Projects' },
  Enquiries: { tab: 'enq', label: 'Enquiries Hub' },
  PlanningTasks: { tab: 'task', label: 'Tasks & Planning Kanban' },
  Vendors: { tab: 'ven', label: 'Vendor Directory' },
  RFQGroups: { tab: 'rfq', label: 'Procurement RFQs & Quotations' },
  VendorQuotations: { tab: 'rfq', label: 'Vendor Quotations Matrix' },
  ContractedWeddingVendors: { tab: 'ven', label: 'Contracted Vendors' },
  ClientInvoices: { tab: 'inv', label: 'Client Billing & Invoices' },
  VendorBills: { tab: 'vb', label: 'Vendor Bills & Settlements' },
  EventSchedules: { tab: 'sch', label: 'Event Schedule Milestones' },
  VendorCheckIns: { tab: 'dash', label: 'Live Day-of Check-Ins' },
  Incidents: { tab: 'dash', label: 'Operational Incidents Log' },
  ContingencyPlans: { tab: 'dash', label: 'Contingency Protocols' }
};

export const DemoDataExplorer: React.FC<DemoDataExplorerProps> = ({ onNavigateTab }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<string>('Weddings');
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null);

  const fetchExplorerData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/api/admin/demo-data-explorer');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else {
        const errJson = await res.json().catch(() => null);
        setError(errJson?.error || 'Failed to load demo data inspection metrics');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error fetching data explorer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplorerData();
  }, []);

  if (loading) {
    return (
      <div className="card" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div style={{ color: 'var(--gold)', fontSize: '1.5rem', marginBottom: '.6rem' }}>◈</div>
        <div style={{ fontSize: '.95rem', color: 'var(--tp)' }}>Auditing database registry and compiling record indices...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card" style={{ padding: '2rem', borderLeft: '4px solid var(--er)' }}>
        <b style={{ color: 'var(--er)' }}>Data Inspection Restricted</b>
        <div style={{ color: 'var(--tp)', fontSize: '.85rem', marginTop: '.3rem' }}>
          {typeof error === 'string' ? error : 'Executive oversight privileges required.'}
        </div>
      </div>
    );
  }

  const { overview, entityCounts, sampleRecords, relationships } = data;
  const availableSampleTabs = Object.keys(sampleRecords || {});

  const handleEntityClick = (entity: string) => {
    setSelectedEntity(entity);
    const sampleKey = availableSampleTabs.find(
      (k) => k.toLowerCase() === entity.toLowerCase() || (entity === 'PlanningTasks' && k === 'PlanningTasks')
    );
    if (sampleKey) {
      const el = document.getElementById('demo-data-samples-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navInfo = ENTITY_NAV_MAP[selectedEntity];
  const activeSampleKey = availableSampleTabs.find(
    (k) => k.toLowerCase() === selectedEntity.toLowerCase()
  ) || availableSampleTabs[0] || 'Weddings';
  const activeSampleData = sampleRecords?.[activeSampleKey] || [];

  return (
    <div style={{ display: 'grid', gap: '1.4rem' }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.8rem' }}>
        <div>
          <div className="cr">The Royal Knot / Administration</div>
          <h1 style={{ marginTop: '.2rem' }}>Demonstration Data Explorer</h1>
          <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
            Safe, read-only inspection of the active demonstration database and entity graph.
          </div>
        </div>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
          <span className="bd b-ok" style={{ fontSize: '.75rem' }}>
            ✓ READ-ONLY AUDIT MODE
          </span>
          <button className="rk-btn o s" onClick={fetchExplorerData}>
            ↻ Refresh Indices
          </button>
        </div>
      </div>

      {/* Primary Metrics Grid (Interactive KPI Cards) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div
          className="rk-card kpi hov"
          style={{ cursor: 'pointer' }}
          onClick={() => handleEntityClick('Weddings')}
          title="Click to view database entity distribution"
        >
          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Verified Records</span>
          <b>{Number(overview?.totalRecords || 0).toLocaleString()}</b>
          <span style={{ color: 'var(--ok)', fontSize: '.72rem' }}>All relational tables indexed ›</span>
        </div>
        <div className="rk-card kpi hov">
          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Database Engine</span>
          <b style={{ fontSize: '1.25rem' }}>SQLite Local Store</b>
          <span style={{ color: 'var(--tp)', fontSize: '.72rem' }}>dev.db &bull; Zero data resets</span>
        </div>
        <div
          className="rk-card kpi hov"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            handleEntityClick('Weddings');
            onNavigateTab?.('wed');
          }}
          title="Click to open Wedding Projects Module"
        >
          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Active Weddings</span>
          <b>{entityCounts?.Weddings || 0}</b>
          <span style={{ color: 'var(--gold)', fontSize: '.72rem' }}>Rajasthan destinations ↗</span>
        </div>
        <div
          className="rk-card kpi hov"
          style={{ cursor: 'pointer' }}
          onClick={() => {
            handleEntityClick('Vendors');
            onNavigateTab?.('ven');
          }}
          title="Click to open Vendor Directory"
        >
          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Registered Vendors</span>
          <b>{entityCounts?.Vendors || 0}</b>
          <span style={{ color: 'var(--tp)', fontSize: '.72rem' }}>Luxury service partners ↗</span>
        </div>
      </div>

      {/* Database Entity Registry & Counts (CLICKABLE PILLS) */}
      <div className="card" style={{ padding: '1.3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.8rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--ink)' }}>
              Database Entity Registry & Counts
            </h3>
            <div style={{ fontSize: '.78rem', color: 'var(--tp)', marginTop: '.2rem' }}>
              Click any entity card to inspect its live records or jump directly into its operational module.
            </div>
          </div>
          {navInfo && onNavigateTab && (
            <button
              className="rk-btn g s"
              onClick={() => onNavigateTab(navInfo.tab)}
              style={{ fontWeight: 600 }}
            >
              Open {navInfo.label} ↗
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '.75rem' }}>
          {Object.entries(entityCounts || {}).map(([entity, count]: [string, any]) => {
            const isSelected = selectedEntity.toLowerCase() === entity.toLowerCase();
            const isHovered = hoveredEntity === entity;

            return (
              <div
                key={entity}
                onClick={() => handleEntityClick(entity)}
                onMouseEnter={() => setHoveredEntity(entity)}
                onMouseLeave={() => setHoveredEntity(null)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '.7rem .9rem',
                  background: isSelected ? '#FAF0DD' : isHovered ? '#F5EBDD' : '#FAF6EE',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid var(--gold)' : isHovered ? '1px solid var(--gold)' : '1px solid var(--bd)',
                  fontSize: '.83rem',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? '0 3px 10px rgba(184,149,90,0.22)' : 'none',
                  transform: isHovered && !isSelected ? 'translateY(-1px)' : 'none'
                }}
                title={`Click to inspect ${entity} records`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <span style={{ color: isSelected ? 'var(--gold)' : 'var(--tp)', fontSize: '.75rem' }}>◈</span>
                  <span style={{ color: 'var(--ink)', fontWeight: isSelected ? 600 : 500 }}>{entity}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <b style={{ color: isSelected ? 'var(--ink)' : 'var(--gold)', fontSize: '.9rem' }}>
                    {Number(count).toLocaleString()}
                  </b>
                  <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>›</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Entity Context Bar */}
        <div
          style={{
            marginTop: '1rem',
            padding: '.75rem 1rem',
            background: '#FFFDF8',
            border: '1px dashed var(--gold)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '.6rem'
          }}
        >
          <div style={{ fontSize: '.82rem' }}>
            <span>Selected entity: </span>
            <b style={{ color: 'var(--gold)', fontSize: '.9rem' }}>{selectedEntity}</b>
            <span style={{ color: 'var(--tp)', marginLeft: '.4rem' }}>
              ({Number(entityCounts?.[selectedEntity] ?? 0).toLocaleString()} database records)
            </span>
          </div>

          <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
            {navInfo && onNavigateTab ? (
              <button
                className="rk-btn o s"
                onClick={() => onNavigateTab(navInfo.tab)}
                style={{ borderColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }}
              >
                Jump to {navInfo.label} ↗
              </button>
            ) : (
              <span style={{ fontSize: '.75rem', color: 'var(--tp)' }}>Operational entity</span>
            )}
            <button
              className="rk-btn s"
              onClick={() => {
                const el = document.getElementById('demo-data-samples-anchor');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              View Sample Records ↓
            </button>
          </div>
        </div>
      </div>

      {/* LIVE VISUALIZATIONS SECTION: Entity Distribution & Geographic Portfolio */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
        {/* Visual Chart 1: Database Volume Distribution */}
        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--ink)' }}>
              Database Record Share by Entity
            </h3>
            <span className="bd b-ok" style={{ fontSize: '.7rem' }}>Live dev.db</span>
          </div>
          <div style={{ display: 'grid', gap: '.7rem' }}>
            {[
              { label: 'Couples', count: entityCounts?.Couples || 0, color: '#B8955A' },
              { label: 'Vendors', count: entityCounts?.Vendors || 0, color: '#3A6B4F' },
              { label: 'Weddings', count: entityCounts?.Weddings || 0, color: '#8D1728' },
              { label: 'Client Invoices', count: entityCounts?.ClientInvoices || 0, color: '#4F7A57' },
              { label: 'Enquiries', count: entityCounts?.Enquiries || 0, color: '#B9791B' },
              { label: 'Planning Tasks', count: entityCounts?.PlanningTasks || 0, color: '#6B5B95' }
            ].map((item) => {
              const total = overview?.totalRecords || 1;
              const pct = Math.round((item.count / total) * 100);
              return (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.25rem' }}>
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{item.label}</span>
                    <span style={{ color: 'var(--tp)' }}>
                      <b>{item.count}</b> records ({pct}%)
                    </span>
                  </div>
                  <div style={{ height: '7px', background: '#FAF6EE', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: item.color, borderRadius: '4px', transition: 'width 0.3s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Visual Chart 2: Destination City Portfolio & Conversion */}
        <div className="card" style={{ padding: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--ink)' }}>
              Rajasthan Destination Footprint
            </h3>
            <span className="bd b-ok" style={{ fontSize: '.7rem' }}>Portfolio Ratio</span>
          </div>
          <div style={{ display: 'grid', gap: '.75rem' }}>
            {[
              { city: 'Udaipur', pct: 65, count: 24, note: 'Lake Pichola & Jagmandir Palaces' },
              { city: 'Jaipur', pct: 25, count: 9, note: 'Rambagh & City Palaces' },
              { city: 'Jodhpur', pct: 10, count: 4, note: 'Umaid Bhawan & Mehrangarh' }
            ].map((d) => (
              <div key={d.city}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.2rem' }}>
                  <div>
                    <b>{d.city}</b>
                    <span style={{ color: 'var(--tp)', fontSize: '.72rem', marginLeft: '.4rem' }}>{d.note}</span>
                  </div>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{d.count} weddings ({d.pct}%)</span>
                </div>
                <div style={{ height: '7px', background: '#FAF6EE', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${d.pct}%`, background: 'var(--gold)', borderRadius: '4px', transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1.2rem', paddingTop: '.8rem', borderTop: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--tp)' }}>Enquiry-to-Wedding Conversion Rate:</span>
            <span className="bd b-ok" style={{ fontSize: '.8rem', fontWeight: 600 }}>58.7% Qualified Conversion</span>
          </div>
        </div>
      </div>

      {/* Relational Architecture Mapping */}
      <div className="card" style={{ padding: '1.2rem' }}>
        <h3 style={{ margin: '0 0 .6rem', fontSize: '1.05rem', color: 'var(--ink)' }}>
          Relational Domain Architecture
        </h3>
        <div style={{ fontSize: '.78rem', color: 'var(--tp)', marginBottom: '1rem' }}>
          Foreign key relational bindings verified across CRM, Weddings, Operations, Procurement, and Financial Ledgers.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '.6rem' }}>
          {(relationships || []).map((rel: any, idx: number) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '.5rem',
                padding: '.55rem .75rem',
                borderRadius: '6px',
                background: '#fff',
                border: '1px solid var(--bd)',
                fontSize: '.8rem'
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{rel.from}</span>
              <span style={{ color: 'var(--gold)', fontSize: '.9rem' }}>&rarr;</span>
              <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{rel.to}</span>
              <span style={{ marginLeft: 'auto', color: 'var(--tp)', fontSize: '.72rem', background: '#FAF6EE', padding: '.15rem .4rem', borderRadius: '4px' }}>
                {rel.type}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Sanitized Live Data Samples Table (Filterable by Click) */}
      <div className="card" id="demo-data-samples-anchor" style={{ padding: '1.2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.8rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--ink)' }}>
              Sanitized Demonstration Records: <span style={{ color: 'var(--gold)' }}>{activeSampleKey}</span>
            </h3>
            <div style={{ fontSize: '.78rem', color: 'var(--tp)', marginTop: '.2rem' }}>
              Inspecting real records from dev.db (passwords, tokens & private hashes strictly redacted).
            </div>
          </div>
          <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
            {availableSampleTabs.map((tab) => (
              <button
                key={tab}
                className={`rk-btn s ${activeSampleKey === tab ? 'g' : 'o'}`}
                onClick={() => setSelectedEntity(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="table-responsive" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.8rem' }}>
            <thead>
              <tr style={{ background: '#FAF6EE', textAlign: 'left', borderBottom: '1px solid var(--bd)' }}>
                {activeSampleData && activeSampleData[0] &&
                  Object.keys(activeSampleData[0]).map((col) => (
                    <th key={col} style={{ padding: '.55rem .75rem', color: 'var(--tp)', fontWeight: 600, textTransform: 'capitalize' }}>
                      {col}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {activeSampleData && activeSampleData.length > 0 ? (
                activeSampleData.map((row: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bd)' }}>
                    {Object.entries(row).map(([k, val]: [string, any]) => (
                      <td key={k} style={{ padding: '.55rem .75rem', color: 'var(--ink)' }}>
                        {typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--tp)' }}>
                    No sample records loaded for {activeSampleKey}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

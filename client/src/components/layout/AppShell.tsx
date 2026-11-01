import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onQuickCreate: (type: string) => void;
  attentionItems: string[];
  children: React.ReactNode;
}

interface NavSubItem {
  id: string;
  label: string;
  icon: string;
  requiredPermission?: string;
}

interface NavGroup {
  group: string;
  items: NavSubItem[];
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  searchQuery,
  onSearchChange,
  onQuickCreate,
  attentionItems,
  children
}) => {
  const { user, logout, permissions, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateType, setQuickCreateType] = useState('Enquiry');
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<'details' | 'rbac' | 'security' | 'preferences'>('details');
  const [profilePhone, setProfilePhone] = useState('+91 98290 12345');
  const [profileOffice, setProfileOffice] = useState('Jaipur Royal HQ &bull; Civil Lines');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [currencyPref, setCurrencyPref] = useState<'lakh_crore' | 'standard'>('lakh_crore');
  const [compactDensity, setCompactDensity] = useState(false);
  const [notifSound, setNotifSound] = useState(true);

  const navGroups: NavGroup[] = [
    {
      group: 'OVERVIEW',
      items: [{ id: 'dash', label: 'Dashboard', icon: '◈' }]
    },
    {
      group: 'CLIENT MANAGEMENT',
      items: [
        { id: 'enq', label: 'Enquiries', icon: '✉', requiredPermission: 'crm:enquiry:read' },
        { id: 'cli', label: 'Couples / Clients', icon: '♡', requiredPermission: 'crm:couple:read' },
        { id: 'wed', label: 'Wedding Projects', icon: '❖', requiredPermission: 'weddings:wedding:read' }
      ]
    },
    {
      group: 'PROCUREMENT',
      items: [
        { id: 'ven', label: 'Vendor Directory', icon: '⌂', requiredPermission: 'procurement:vendor:read' },
        { id: 'rfq', label: 'RFQs & Quotations', icon: '⇄', requiredPermission: 'procurement:rfq:read' },
        { id: 'agr', label: 'Vendor Agreements', icon: '✎', requiredPermission: 'contracts:agreement:read' }
      ]
    },
    {
      group: 'WEDDING OPERATIONS',
      items: [
        { id: 'task', label: 'Tasks & Planning', icon: '☑', requiredPermission: 'weddings:task:read' },
        { id: 'sch', label: 'Event Schedule', icon: '◷', requiredPermission: 'operations:schedule:read' },
        { id: 'gst', label: 'Guest Management', icon: '☺', requiredPermission: 'weddings:wedding:read' }
      ]
    },
    {
      group: 'FINANCE',
      items: [
        { id: 'inv', label: 'Client Billing', icon: '₹', requiredPermission: 'finance:invoice:read' },
        { id: 'vb', label: 'Vendor Bills & Settlements', icon: '⇆', requiredPermission: 'finance:vendor_bill:read' },
        { id: 'led', label: 'Expense Ledger', icon: '≡', requiredPermission: 'finance:ledger:read' },
        { id: 'fin', label: 'Finance Overview', icon: '◔', requiredPermission: 'finance:milestone:read' }
      ]
    },
    {
      group: 'ANALYTICS',
      items: [
        { id: 'wl', label: 'Team Work Logs', icon: '⏱', requiredPermission: 'analytics:labor:create' },
        { id: 'fa', label: 'Founder Analytics', icon: '★', requiredPermission: 'analytics:seasonal:read' }
      ]
    },
    {
      group: 'ADMINISTRATION',
      items: [
        { id: 'explorer', label: 'Demo Data Explorer', icon: '⌕', requiredPermission: 'weddings:wedding:read' },
        { id: 'usr', label: 'Team & Users', icon: '☻', requiredPermission: 'system:users:manage' },
        { id: 'rol', label: 'Roles & Permissions', icon: '⚿', requiredPermission: 'system:users:manage' },
        { id: 'set', label: 'Settings', icon: '⚙', requiredPermission: 'system:users:manage' }
      ]
    }
  ];

  return (
    <div id="app" style={{ display: 'block', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* 244px Fixed Sidebar */}
      <aside className={`sb ${sidebarOpen ? 'open' : ''}`} id="sb">
        <div style={{ padding: '1.2rem 1.3rem .4rem' }}>
          <div className="sf" style={{ fontSize: '1.7rem', lineHeight: 1, color: 'var(--ink)' }}>
            The Royal Knot
          </div>
          <div style={{ color: 'var(--tp)', fontSize: '.78rem', marginTop: '.2rem' }}>
            Wedding operations
          </div>
        </div>

        <div className="sc" id="nv">
          {navGroups.map((g) => {
            const visibleItems = g.items.filter((item) => {
              if (!item.requiredPermission) return true;
              return hasPermission(item.requiredPermission as any);
            });
            if (visibleItems.length === 0) return null;

            return (
              <div key={g.group}>
                <h6>{g.group}</h6>
                {visibleItems.map((item) => {
                  const isActive = currentTab === item.id;
                  return (
                    <a
                      key={item.id}
                      className={isActive ? 'on' : ''}
                      onClick={() => {
                        onSelectTab(item.id);
                        setSidebarOpen(false);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                    >
                      <span style={{ width: '16px', textAlign: 'center', fontSize: '.9rem' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </a>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Card with Functional Profile Click */}
        <div
          style={{
            display: 'flex',
            gap: '.7rem',
            alignItems: 'center',
            padding: '.8rem 1.1rem',
            borderTop: '1px solid var(--bd)',
            background: '#fff',
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}
          onClick={() => setProfileModalOpen(true)}
          title="Click to view User Profile & Security Dossier"
          className="user-profile-bar"
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'var(--gold)',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 600,
              fontSize: '.95rem',
              boxShadow: '0 2px 6px rgba(184,149,90,0.3)',
              flexShrink: 0
            }}
          >
            {user?.name ? user.name.charAt(0) : 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <b style={{ fontSize: '.85rem', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {user?.name || 'User'}
            </b>
            <div style={{ color: 'var(--tp)', fontSize: '.75rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
              <span>{user?.role || 'Team Member'}</span>
              <span style={{ fontSize: '.65rem', color: 'var(--gold)' }}>⚙</span>
            </div>
          </div>
          <button
            className="rk-btn o s"
            title="Sign out to landing page"
            onClick={(e) => {
              e.stopPropagation();
              logout();
            }}
            style={{ padding: '.25rem .5rem', fontSize: '.9rem' }}
          >
            ⎋
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,10,9,0.45)',
            backdropFilter: 'blur(2px)',
            zIndex: 95
          }}
        />
      )}

      {/* Sticky Top Header */}
      <header className="hd">
        <button
          className="rk-btn o s bg"
          id="bur"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>

        {/* Live Search Input */}
        <input
          id="q"
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search this page…"
          style={{
            maxWidth: '280px',
            minWidth: '120px',
            flex: '1 1 auto',
            background: '#fff',
            border: '1px solid var(--bd)',
            borderRadius: '8px',
            padding: '.45rem .65rem',
            fontSize: '.85rem'
          }}
        />

        <div style={{ flex: 1 }} />

        {/* Current Authenticated Session & Sign Out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', flexShrink: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '.4rem',
              padding: '.35rem .6rem',
              borderRadius: '8px',
              background: '#FAF6EE',
              border: '1px solid var(--bd)'
            }}
          >
            <span className="hide-on-mobile" style={{ fontSize: '.75rem', color: 'var(--tp)' }}>Signed in:</span>
            <b style={{ fontSize: '.8rem', color: 'var(--ink)', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </b>
            <span className="bd b-ok" style={{ fontSize: '.65rem', textTransform: 'uppercase' }}>
              {user?.role}
            </span>
          </div>
          <button
            className="rk-btn o s"
            onClick={logout}
            style={{ fontSize: '.78rem', color: 'var(--er)', borderColor: 'var(--bd)', padding: '.35rem .6rem' }}
            title="Sign out of current account"
          >
            Sign Out
          </button>
        </div>

        {/* Notification Bell with Badge Count */}
        <div style={{ position: 'relative' }}>
          <button
            className="rk-btn o"
            id="bell"
            onClick={() => setNotifOpen(!notifOpen)}
            style={{ position: 'relative', padding: '.45rem .8rem' }}
          >
            🔔{' '}
            <span
              id="bc"
              style={{
                background: attentionItems.length > 0 ? 'var(--er)' : 'transparent',
                color: '#fff',
                fontSize: '.72rem',
                borderRadius: '999px',
                padding: attentionItems.length > 0 ? '1px 6px' : '0'
              }}
            >
              {attentionItems.length > 0 ? attentionItems.length : ''}
            </span>
          </button>

          {/* Notifications Panel */}
          {notifOpen && (
            <div className="popover-notif" id="pn">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
                <b style={{ fontSize: '.9rem' }}>Attention Required</b>
                <button
                  onClick={() => setNotifOpen(false)}
                  style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--tp)', fontSize: '1rem' }}
                >
                  &times;
                </button>
              </div>
              {attentionItems.length === 0 ? (
                <div style={{ color: 'var(--tp)', fontSize: '.8rem', padding: '.5rem 0' }}>
                  All clear. No pending approvals or overdue items.
                </div>
              ) : (
                attentionItems.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '.45rem 0',
                      borderBottom: '1px solid #F1EBDF',
                      fontSize: '.78rem',
                      color: 'var(--tp)'
                    }}
                  >
                    &bull; {item}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Quick Create Button */}
        <button
          className="rk-btn g"
          id="qc"
          onClick={() => setQuickCreateOpen(true)}
          style={{ padding: '.45rem .9rem' }}
        >
          + Create
        </button>
      </header>

      {/* Main Content Area */}
      <main className="mn" id="mn">
        {children}
      </main>

      {/* Quick Create Modal */}
      {quickCreateOpen && (
        <div className="md-overlay" onClick={() => setQuickCreateOpen(false)}>
          <div className="md-box" onClick={(e) => e.stopPropagation()}>
            <h3 className="sf" style={{ fontSize: '1.6rem', marginBottom: '.3rem' }}>
              Quick create
            </h3>
            <p style={{ color: 'var(--tp)', fontSize: '.78rem', marginBottom: '.8rem' }}>
              Choose a workflow entity to instantiate:
            </p>
            <div>
              <label style={{ fontSize: '.75rem', color: 'var(--tp)', display: 'block', marginBottom: '.3rem' }}>
                Entity Type
              </label>
              <select
                value={quickCreateType}
                onChange={(e) => setQuickCreateType(e.target.value)}
                style={{
                  background: '#fff',
                  border: '1px solid var(--bd)',
                  borderRadius: '8px',
                  padding: '.5rem .7rem',
                  width: '100%',
                  fontSize: '.85rem'
                }}
              >
                <option value="Enquiry">Enquiry (Client Lead)</option>
                <option value="Wedding">Wedding Project</option>
                <option value="Vendor">Vendor</option>
                <option value="RFQ">RFQ Tender</option>
                <option value="Task">Planning Task</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '.6rem', marginTop: '1rem' }}>
              <button
                className="rk-btn g"
                onClick={() => {
                  setQuickCreateOpen(false);
                  onQuickCreate(quickCreateType);
                }}
              >
                Proceed &rarr;
              </button>
              <button
                type="button"
                className="rk-btn o"
                onClick={() => setQuickCreateOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Profile & Security Dossier Modal */}
      {profileModalOpen && (
        <div className="md-overlay" onClick={() => setProfileModalOpen(false)}>
          <div
            className="md-box"
            onClick={(e) => e.stopPropagation()}
            style={{ width: 'min(640px, 95vw)', maxHeight: '88vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--bd)', paddingBottom: '.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.9rem' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--gold)',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    boxShadow: '0 4px 14px rgba(184,149,90,0.35)',
                    flexShrink: 0
                  }}
                >
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div>
                  <h3 className="sf" style={{ fontSize: '1.45rem', margin: 0, lineHeight: 1.1 }}>
                    {user?.name}
                  </h3>
                  <div style={{ fontSize: '.78rem', color: 'var(--tp)', marginTop: '.2rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <span>{user?.email}</span>
                    <span>&bull;</span>
                    <span className="bd b-ok">{user?.role}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setProfileModalOpen(false)}
                style={{ background: 'none', border: 0, fontSize: '1.4rem', cursor: 'pointer', color: 'var(--tp)', padding: '.2rem .5rem' }}
                title="Close"
              >
                &times;
              </button>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '.4rem', borderBottom: '1px solid var(--bd)', padding: '.6rem 0', overflowX: 'auto' }}>
              {[
                { id: 'details', label: 'Account Details' },
                { id: 'rbac', label: `RBAC Permissions (${permissions.length})` },
                { id: 'security', label: 'Session & DB' },
                { id: 'preferences', label: 'Preferences' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setProfileTab(t.id as any)}
                  className={`rk-btn s ${profileTab === t.id ? 'g' : 'o'}`}
                  style={{ padding: '.35rem .75rem', fontSize: '.75rem', whiteSpace: 'nowrap' }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Notification message */}
            {saveSuccessMsg && (
              <div style={{ background: '#EAF3EC', border: '1px solid var(--ok)', color: '#2B5738', padding: '.45rem .8rem', borderRadius: '6px', fontSize: '.78rem', marginTop: '.6rem' }}>
                ✓ {saveSuccessMsg}
              </div>
            )}

            {/* Modal Body / Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '.8rem 0', display: 'grid', gap: '.8rem' }}>
              {/* TAB 1: ACCOUNT DETAILS */}
              {profileTab === 'details' && (
                <div style={{ display: 'grid', gap: '.8rem' }}>
                  <div className="rk-card" style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
                      <b style={{ fontSize: '.88rem' }}>Staff Profile Dossier</b>
                      <span className="bd b-ok">ACTIVE VERIFIED</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '.8rem' }}>
                      <div>
                        <label style={{ fontSize: '.72rem', color: 'var(--tp)', display: 'block', marginBottom: '.2rem' }}>Full Legal Name</label>
                        <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{user?.name}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', color: 'var(--tp)', display: 'block', marginBottom: '.2rem' }}>Primary Email</label>
                        <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{user?.email}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', color: 'var(--tp)', display: 'block', marginBottom: '.2rem' }}>Operational Role</label>
                        <div style={{ fontSize: '.85rem', fontWeight: 600 }}>{user?.role}</div>
                      </div>
                      <div>
                        <label style={{ fontSize: '.72rem', color: 'var(--tp)', display: 'block', marginBottom: '.2rem' }}>Hourly Billing Rate</label>
                        <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--gold)' }}>
                          {user?.hourlyRatePaise ? `₹${(Number(user.hourlyRatePaise) / 100).toLocaleString('en-IN')}/hr` : '₹2,500/hr'}
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--bd)', marginTop: '1rem', paddingTop: '.8rem', display: 'grid', gap: '.6rem' }}>
                      <b style={{ fontSize: '.8rem' }}>Contact & Station Customization</b>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.8rem' }}>
                        <div>
                          <label style={{ fontSize: '.72rem', color: 'var(--tp)', display: 'block', marginBottom: '.2rem' }}>Contact Mobile Phone</label>
                          <input
                            type="text"
                            value={profilePhone}
                            onChange={(e) => setProfilePhone(e.target.value)}
                            style={{ width: '100%', padding: '.45rem .6rem', border: '1px solid var(--bd)', borderRadius: '6px', fontSize: '.82rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '.72rem', color: 'var(--tp)', display: 'block', marginBottom: '.2rem' }}>Primary Palace Station</label>
                          <input
                            type="text"
                            value={profileOffice}
                            onChange={(e) => setProfileOffice(e.target.value)}
                            style={{ width: '100%', padding: '.45rem .6rem', border: '1px solid var(--bd)', borderRadius: '6px', fontSize: '.82rem' }}
                          />
                        </div>
                      </div>
                      <button
                        className="rk-btn g s"
                        style={{ alignSelf: 'start', marginTop: '.3rem' }}
                        onClick={() => {
                          setSaveSuccessMsg('Profile contact information saved successfully.');
                          setTimeout(() => setSaveSuccessMsg(null), 3500);
                        }}
                      >
                        Save Contact Updates
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: RBAC PERMISSIONS */}
              {profileTab === 'rbac' && (
                <div style={{ display: 'grid', gap: '.6rem' }}>
                  <div className="rk-card" style={{ padding: '1rem' }}>
                    <b style={{ fontSize: '.85rem', display: 'block', marginBottom: '.4rem' }}>
                      Granted Access Control List ({permissions.length} active permissions)
                    </b>
                    <p style={{ fontSize: '.76rem', color: 'var(--tp)', margin: '0 0 .8rem 0' }}>
                      Role <b>{user?.role}</b> has been cryptographically provisioned with the following granular permissions on the Prisma database backend:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem', maxHeight: '240px', overflowY: 'auto' }}>
                      {permissions.map((p) => (
                        <span key={p} className="bd b-in" style={{ fontSize: '.7rem', fontFamily: 'monospace', padding: '.25rem .5rem' }}>
                          ✓ {p}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SESSION & DATABASE */}
              {profileTab === 'security' && (
                <div style={{ display: 'grid', gap: '.6rem' }}>
                  <div className="rk-card" style={{ padding: '1rem' }}>
                    <b style={{ fontSize: '.85rem', display: 'block', marginBottom: '.6rem' }}>
                      Cryptographic & Database Architecture
                    </b>
                    <div style={{ display: 'grid', gap: '.5rem', fontSize: '.78rem', color: 'var(--ink)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--bd)' }}>
                        <span style={{ color: 'var(--tp)' }}>Database Engine:</span>
                        <b>Prisma SQLite (dev.db / demo.db &bull; 25 Models)</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--bd)' }}>
                        <span style={{ color: 'var(--tp)' }}>Financial Ledger Mode:</span>
                        <b>64-bit Integer BigInt Paise (Zero Floating Point Loss)</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--bd)' }}>
                        <span style={{ color: 'var(--tp)' }}>Password Hashing:</span>
                        <b>Scrypt Key Derivation (N=16384, r=8, p=1)</b>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0', borderBottom: '1px solid var(--bd)' }}>
                        <span style={{ color: 'var(--tp)' }}>Session Cookie:</span>
                        <code>__Host-rk_session (HTTP-Only, Strict, Path=/)</code>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '.4rem 0' }}>
                        <span style={{ color: 'var(--tp)' }}>CSRF Token Defense:</span>
                        <b>Double-Submit Synchronizer Header (X-CSRF-Token)</b>
                      </div>
                    </div>
                  </div>

                  {/* Single Session Security Notice & Sign Out Action */}
                  <div className="rk-card" style={{ padding: '1rem', borderLeft: '4px solid var(--gold)', background: '#FAF6EE' }}>
                    <b style={{ fontSize: '.85rem', display: 'block', marginBottom: '.3rem', color: 'var(--ink)' }}>
                      Active Corporate Session Locked
                    </b>
                    <p style={{ fontSize: '.76rem', color: 'var(--tp)', margin: '0 0 .8rem 0' }}>
                      To protect corporate audit logs and granular RBAC boundaries, switching accounts is prohibited while an active session exists. To access another role or account, you must terminate this session first.
                    </p>
                    <button
                      className="rk-btn o s"
                      onClick={() => {
                        setProfileModalOpen(false);
                        logout();
                      }}
                      style={{ color: 'var(--er)', borderColor: 'var(--er)', fontWeight: 600 }}
                    >
                      Sign Out of Corporate Session
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 4: PREFERENCES */}
              {profileTab === 'preferences' && (
                <div style={{ display: 'grid', gap: '.6rem' }}>
                  <div className="rk-card" style={{ padding: '1rem' }}>
                    <b style={{ fontSize: '.85rem', display: 'block', marginBottom: '.6rem' }}>
                      Workstation Preferences
                    </b>
                    <div style={{ display: 'grid', gap: '.8rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <b style={{ fontSize: '.8rem', display: 'block' }}>Indian Numeral Format</b>
                          <span style={{ fontSize: '.72rem', color: 'var(--tp)' }}>Format high numbers as ₹ Crores / Lakhs</span>
                        </div>
                        <select
                          value={currencyPref}
                          onChange={(e) => setCurrencyPref(e.target.value as any)}
                          style={{ padding: '.35rem .6rem', border: '1px solid var(--bd)', borderRadius: '6px', fontSize: '.8rem' }}
                        >
                          <option value="lakh_crore">Lakhs & Crores (e.g. ₹3.50 Cr)</option>
                          <option value="standard">Standard Indian INR (e.g. ₹3,50,00,000)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bd)', paddingTop: '.6rem' }}>
                        <div>
                          <b style={{ fontSize: '.8rem', display: 'block' }}>Table Display Density</b>
                          <span style={{ fontSize: '.72rem', color: 'var(--tp)' }}>Compact view shows more rows per page</span>
                        </div>
                        <button
                          className={`rk-btn s ${compactDensity ? 'g' : 'o'}`}
                          onClick={() => setCompactDensity(!compactDensity)}
                        >
                          {compactDensity ? 'Compact Density' : 'Comfortable Density'}
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--bd)', paddingTop: '.6rem' }}>
                        <div>
                          <b style={{ fontSize: '.8rem', display: 'block' }}>Operational Audio & Alerts</b>
                          <span style={{ fontSize: '.72rem', color: 'var(--tp)' }}>Audio feedback on approvals and disbursements</span>
                        </div>
                        <button
                          className={`rk-btn s ${notifSound ? 'g' : 'o'}`}
                          onClick={() => setNotifSound(!notifSound)}
                        >
                          {notifSound ? 'Alerts Enabled' : 'Alerts Muted'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.8rem', paddingTop: '.8rem', borderTop: '1px solid var(--bd)' }}>
              <button
                className="rk-btn o s"
                onClick={() => {
                  setProfileModalOpen(false);
                  logout();
                }}
                style={{ color: 'var(--er)', borderColor: 'var(--er)' }}
              >
                Sign Out of Workstation
              </button>
              <button
                className="rk-btn g s"
                onClick={() => setProfileModalOpen(false)}
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

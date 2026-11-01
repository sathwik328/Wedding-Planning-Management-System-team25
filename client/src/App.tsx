import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { CrmModule } from './components/crm/CrmModule';
import { WeddingModule } from './components/weddings/WeddingModule';
import { OperationsDashboard } from './components/operations/OperationsDashboard';
import { VendorDirectoryPage, FinanceLedgerPage, FounderAnalyticsPage } from './features';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { EnquiryModal } from './components/crm/EnquiryModal';
import { WeddingCreationModal } from './components/weddings/WeddingCreationModal';
import { CreateVendorModal } from './features/vendors/CreateVendorModal';
import { CreateRfqModal } from './features/vendors/CreateRfqModal';
import { CustomTaskModal } from './components/weddings/CustomTaskModal';
import { ReadinessRadarWidget } from './components/operations/ReadinessRadarWidget';
import { BudgetSimulatorDrawer } from './components/finance/BudgetSimulatorDrawer';
import { ContingencyPlannerModal } from './components/operations/ContingencyPlannerModal';
import { VendorReliabilityModal } from './features/vendors/VendorReliabilityModal';
import { GuestPortalPage } from './components/portal/GuestPortalPage';
import { FeatureShowcaseCarousel } from './components/common/FeatureShowcaseCarousel';
import { DemoDataExplorer } from './components/admin/DemoDataExplorer';
import { apiFetch } from './services/api';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Formatting Utilities
const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const cr = (n: number) =>
  n >= 1e7
    ? '₹' + (n / 1e7).toFixed(2) + ' Cr'
    : n >= 1e5
    ? '₹' + (n / 1e5).toFixed(1) + ' L'
    : inr(n);

// Semantic Status Badges
const BD: Record<string, string> = {
  Pending: 'wa',
  Draft: 'in',
  Sent: 'in',
  New: 'in',
  Active: 'ok',
  Cleared: 'ok',
  Approved: 'ok',
  Paid: 'ok',
  Awarded: 'ok',
  Reconciled: 'ok',
  Completed: 'ok',
  Signed: 'ok',
  Converted: 'ok',
  Confirmed: 'ok',
  Overdue: 'er',
  Rejected: 'er',
  Lost: 'er',
  Cancelled: 'er',
  Declined: 'er',
  Flagged: 'er',
  'Partially Paid': 'wa',
  'Under Review': 'wa',
  'Quotes Received': 'wa',
  'Awaiting Signature': 'wa',
  Qualified: 'ok'
};

const renderBadge = (status: string) => {
  const variant = BD[status] || 'in';
  return <span className={`bd b-${variant}`}>{status}</span>;
};

const RESTRICTED_TAB_PERMISSIONS: Record<string, { perm: string; label: string }> = {
  cli: { perm: 'crm:couple:read', label: 'Couples & Client Dossiers' },
  rfq: { perm: 'procurement:rfq:read', label: 'Procurement RFQs & Quotations' },
  agr: { perm: 'contracts:agreement:read', label: 'Vendor Service Agreements' },
  inv: { perm: 'finance:invoice:read', label: 'Client Billing & Invoicing' },
  vb: { perm: 'finance:vendor_bill:read', label: 'Vendor Bills & Settlements' },
  led: { perm: 'finance:ledger:read', label: 'Corporate Expense Ledger' },
  fin: { perm: 'finance:milestone:read', label: 'Executive Finance Overview' },
  finance_full: { perm: 'finance:ledger:read', label: 'Full Financial Ledger' },
  fa: { perm: 'analytics:seasonal:read', label: 'Founder Strategic Analytics' },
  founder_full: { perm: 'analytics:seasonal:read', label: 'Full Founder Analytics' },
  explorer: { perm: 'weddings:wedding:read', label: 'Demonstration Data Explorer' },
  usr: { perm: 'system:users:manage', label: 'Team & User Administration' },
  rol: { perm: 'system:users:manage', label: 'Roles & Permissions Matrix' },
  set: { perm: 'system:users:manage', label: 'System Configuration' }
};

const AccessRestrictedView: React.FC<{ label: string; perm: string; userRole?: string }> = ({ label, perm, userRole }) => (
  <div className="card" style={{ padding: '2.5rem', textAlign: 'center', background: '#fff', borderLeft: '4px solid var(--er)', margin: '1.5rem 0' }}>
    <div style={{ fontSize: '2.5rem', marginBottom: '.6rem', color: 'var(--er)' }}>⚿</div>
    <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.8rem', color: 'var(--ink)', margin: '0 0 .5rem' }}>
      Access Restricted: {label}
    </h2>
    <p style={{ color: 'var(--tp)', fontSize: '.9rem', maxWidth: '540px', margin: '0 auto 1.2rem', lineHeight: 1.5 }}>
      Your active account role <b>({userRole || 'COORDINATOR'})</b> is not authorized to access confidential financial ledgers, billing data, or administrative configurations.
    </p>
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem', padding: '.5rem 1rem', background: '#FAF6EE', borderRadius: '8px', border: '1px solid var(--bd)', fontSize: '.8rem', color: 'var(--ink)' }}>
      <span>Required RBAC Scope:</span>
      <code style={{ background: '#fff', padding: '.2rem .4rem', borderRadius: '4px', border: '1px solid var(--bd)', color: 'var(--er)', fontWeight: 600 }}>{perm}</code>
    </div>
  </div>
);

export const MainDashboard: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [currentTab, setCurrentTab] = useState('dash');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [enquiryStatusFilter, setEnquiryStatusFilter] = useState('All');

  // Sub-workspace selections
  const [selectedWeddingId, setSelectedWeddingId] = useState<number | null>(null);
  const [weddingTab, setWeddingTab] = useState('Overview');
  const [weddingsViewMode, setWeddingsViewMode] = useState<'carousel' | 'grid'>('carousel');
  const [selectedRfqIndex, setSelectedRfqIndex] = useState<number | null>(null);
  const [selectedBillIndex, setSelectedBillIndex] = useState<number | null>(null);

  // Sorting state: { [tableId]: { colIndex, direction } }
  const [sortState, setSortState] = useState<Record<string, { i: number; d: number }>>({});

  // Quick Create Modal state
  const [activeCreateModal, setActiveCreateModal] = useState<'Enquiry' | 'Wedding' | 'Vendor' | 'RFQ' | 'Task' | null>(null);
  const [liveCouples, setLiveCouples] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [, setIsLiveSyncing] = useState(false);

  // Special Features (Phase 8) Modal & Drawer States
  const [budgetSimulatorOpen, setBudgetSimulatorOpen] = useState(false);
  const [contingencyModalOpen, setContingencyModalOpen] = useState(false);
  const [selectedReliabilityVendor, setSelectedReliabilityVendor] = useState<{ id: string; name: string } | null>(null);
  const [previewPortalToken, setPreviewPortalToken] = useState<string | null>(null);

  useEffect(() => {
    (window as any).__setPreviewPortalToken = setPreviewPortalToken;
    (window as any).__closeGuestPortal = () => setPreviewPortalToken(null);
    (window as any).__setCurrentTab = setCurrentTab;
    (window as any).__setBudgetSimulatorOpen = setBudgetSimulatorOpen;
    (window as any).__setContingencyModalOpen = setContingencyModalOpen;
    (window as any).__setSelectedReliabilityVendor = setSelectedReliabilityVendor;
    (window as any).__setActiveCreateModal = setActiveCreateModal;
  }, []);

  // Operational State Data (initialized with prototype realistic sample dataset)
  const [weddings, setWeddings] = useState([
    {
      id: 0,
      n: 'The Mehra Wedding',
      d: 'Jaipur',
      dt: '12–14 Dec 2026',
      dd: '2026-12-12',
      g: 450,
      days: 3,
      c: 32000000,
      b: 21000000,
      pl: 'Naina Kapoor',
      st: 'Active',
      pr: 62,
      v: [
        ['Velvet Blooms', 'Decoration', 950000],
        ['Celebration Sound Co.', 'Entertainment', 400000],
        ['Royal Frames Studio', 'Photography', 200000]
      ]
    },
    {
      id: 1,
      n: 'The Kapoor Wedding',
      d: 'Udaipur',
      dt: '20–22 Jan 2027',
      dd: '2027-01-20',
      g: 380,
      days: 3,
      c: 26000000,
      b: 17500000,
      pl: 'Naina Kapoor',
      st: 'Active',
      pr: 41,
      v: [
        ['The Grand Table', 'Catering', 1800000],
        ['Marigold Productions', 'Production', 700000]
      ]
    },
    {
      id: 2,
      n: 'The Sharma Wedding',
      d: 'Jaipur',
      dt: '8–11 Feb 2027',
      dd: '2027-02-08',
      g: 520,
      days: 4,
      c: 26000000,
      b: 18000000,
      pl: 'Kabir Singh',
      st: 'Active',
      pr: 28,
      v: [['Velvet Blooms', 'Decoration', 1200000]]
    }
  ]);

  const [enquiries, setEnquiries] = useState([
    { n: 'Anaya & Dev Bhatia', d: 'Udaipur', dt: 'Mar 2027', g: 300, b: '₹2–3 Cr', s: 'Referral', st: 'Qualified', pl: 'Naina Kapoor' },
    { n: 'Ritika & Sameer Jain', d: 'Jaipur', dt: 'Feb 2027', g: 420, b: '₹3–4 Cr', s: 'Instagram', st: 'Proposal Sent', pl: 'Kabir Singh' },
    { n: 'Tanvi & Aryan Oberoi', d: 'Udaipur', dt: 'Apr 2027', g: 250, b: '₹1.5–2 Cr', s: 'Wedding fair', st: 'New', pl: 'Naina Kapoor' },
    { n: 'Zoya & Kabir Khan', d: 'Jaipur', dt: 'Jan 2027', g: 500, b: '₹4 Cr+', s: 'Referral', st: 'Follow-up', pl: 'Kabir Singh' }
  ]);

  const [vendors, setVendors] = useState([
    { n: 'Royal Frames Studio', c: 'Photography', ct: 'Jaipur', p: 'Meera Joshi', ph: '+91 98290 11001', st: 'Active' },
    { n: 'The Grand Table', c: 'Catering', ct: 'Udaipur', p: 'Imran Qureshi', ph: '+91 98290 11002', st: 'Active' },
    { n: 'Velvet Blooms', c: 'Decoration', ct: 'Jaipur', p: 'Sana Verma', ph: '+91 98290 11003', st: 'Active' },
    { n: 'Celebration Sound Co.', c: 'Entertainment', ct: 'Jaipur', p: 'Dev Malhotra', ph: '+91 98290 11004', st: 'Active' },
    { n: 'Marigold Productions', c: 'Production', ct: 'Udaipur', p: 'Pooja Nair', ph: '+91 98290 11005', st: 'Active' },
    { n: 'Lumière Films', c: 'Videography', ct: 'Jaipur', p: 'Arman Sethi', ph: '+91 98290 11006', st: 'Pending Review' },
    { n: 'Frame & Fable', c: 'Photography', ct: 'Udaipur', p: 'Isha Rao', ph: '+91 98290 11007', st: 'Active' }
  ]);

  const [rfqs, setRfqs] = useState([
    {
      id: 'RFQ-2041',
      t: 'Wedding photography — 3 days',
      w: 0,
      cat: 'Photography',
      dl: '05 Nov',
      st: 'Quotes Received',
      win: null as number | null,
      q: [
        { v: 'Royal Frames Studio', base: 180000, tax: 32400, ex: 0, inc: '3 photographers, 1 drone, album', val: '30 days', pay: '25% advance, balance on delivery' },
        { v: 'Lumière Films', base: 210000, tax: 37800, ex: 15000, inc: '4 photographers, cinematic film, drone', val: '21 days', pay: '40% advance' },
        { v: 'Frame & Fable', base: 195000, tax: 35100, ex: 8000, inc: '3 photographers, album, pre-wedding shoot', val: '30 days', pay: '30% advance' }
      ]
    },
    {
      id: 'RFQ-2042',
      t: 'Catering — 380 guests, 3 days',
      w: 1,
      cat: 'Catering',
      dl: '10 Nov',
      st: 'Under Review',
      win: null as number | null,
      q: [
        { v: 'The Grand Table', base: 1500000, tax: 270000, ex: 30000, inc: 'Veg + non-veg, live counters', val: '45 days', pay: '30% advance' }
      ]
    },
    {
      id: 'RFQ-2043',
      t: 'Decoration — mandap & sangeet',
      w: 2,
      cat: 'Decoration',
      dl: '15 Nov',
      st: 'Sent',
      win: null as number | null,
      q: []
    }
  ]);

  const [invoices, setInvoices] = useState([
    { id: 'INV-101', w: 0, t: 'Booking confirmation', a: 10000000, due: '2026-08-15', p: [{ r: 'PAY-501', a: 10000000, by: 'Rohan Mehta', s: 'Cleared' }] },
    { id: 'INV-102', w: 0, t: 'Pre-wedding payment', a: 8000000, due: '2026-11-20', p: [{ r: 'PAY-512', a: 3000000, by: 'Rohan Mehta', s: 'Cleared' }] },
    { id: 'INV-103', w: 1, t: 'Booking confirmation', a: 6500000, due: '2026-10-20', p: [] },
    { id: 'INV-104', w: 2, t: 'Booking confirmation', a: 5000000, due: '2026-10-28', p: [{ r: 'PAY-518', a: 5000000, by: 'Rohan Mehta', s: 'Cleared' }] }
  ]);

  const [vendorBills, setVendorBills] = useState([
    {
      id: 'VB-31',
      w: 0,
      v: 'Royal Frames Studio',
      ag: 200000,
      ch: [{ d: 'Extra drone coverage (Sangeet)', a: 20000, ap: false }],
      p: [{ r: 'VP-71', a: 50000, ty: 'Advance', by: 'Rohan Mehta', s: 'Cleared' }],
      rec: 'Review'
    },
    {
      id: 'VB-32',
      w: 1,
      v: 'The Grand Table',
      ag: 1800000,
      ch: [{ d: '40 additional plates', a: 60000, ap: true }],
      p: [{ r: 'VP-74', a: 600000, ty: 'Advance', by: 'Rohan Mehta', s: 'Cleared' }],
      rec: 'Review'
    },
    {
      id: 'VB-33',
      w: 0,
      v: 'Velvet Blooms',
      ag: 950000,
      ch: [],
      p: [{ r: 'VP-77', a: 300000, ty: 'Advance', by: 'Aditi Rao', s: 'Pending' }],
      rec: 'Review'
    }
  ]);

  const [tasks, setTasks] = useState([
    { t: 'Venue walkthrough — Rajmahal', c: 'Venue', w: 0, o: 'Naina Kapoor', p: 'High', st: 'Completed' },
    { t: 'Finalise sangeet decor mood board', c: 'Decoration', w: 0, o: 'Naina Kapoor', p: 'High', st: 'In Progress' },
    { t: 'Confirm airport transfers', c: 'Logistics', w: 0, o: 'Kabir Singh', p: 'Medium', st: 'To Do' },
    { t: 'Tasting session with caterer', c: 'Catering', w: 1, o: 'Naina Kapoor', p: 'High', st: 'Review' },
    { t: 'Collect vendor bills — Day 1', c: 'Finance', w: 0, o: 'Rohan Mehta', p: 'Medium', st: 'To Do' },
    { t: 'Artist hospitality rider', c: 'Entertainment', w: 2, o: 'Kabir Singh', p: 'Low', st: 'To Do' }
  ]);

  const [workLogs] = useState([
    { e: 'Naina Kapoor', w: 0, d: 'Site visit & layout planning', h: 6, r: 900 },
    { e: 'Kabir Singh', w: 2, d: 'Vendor negotiation', h: 4, r: 800 },
    { e: 'Naina Kapoor', w: 1, d: 'Client meeting', h: 3, r: 900 }
  ]);

  const [events] = useState([
    { n: 'Welcome Dinner', w: 0, d: 'Day 1 · 12 Dec', t: '19:00–23:00', v: 'Rajmahal Lawns', c: 'Kabir Singh' },
    { n: 'Haldi & Mehendi', w: 0, d: 'Day 2 · 13 Dec', t: '10:00–17:00', v: 'Courtyard', c: 'Naina Kapoor' },
    { n: 'Sangeet', w: 0, d: 'Day 2 · 13 Dec', t: '20:00–01:00', v: 'Grand Hall', c: 'Naina Kapoor' },
    { n: 'Wedding Ceremony', w: 0, d: 'Day 3 · 14 Dec', t: '16:00–20:00', v: 'Mandap Garden', c: 'Naina Kapoor' },
    { n: 'Reception', w: 0, d: 'Day 3 · 14 Dec', t: '21:00–01:00', v: 'Lake Terrace', c: 'Kabir Singh' }
  ]);

  const [guests] = useState([
    { n: 'Rajesh Mehra', st: 'Confirmed', p: 3, a: '10 Dec', d: '15 Dec', ac: 'Rambagh — Suite' },
    { n: 'Sunita Kapoor', st: 'Confirmed', p: 2, a: '11 Dec', d: '15 Dec', ac: 'Rambagh — Deluxe' },
    { n: 'Dr. Anil Iyer', st: 'Pending', p: 2, a: '12 Dec', d: '14 Dec', ac: 'TBD' },
    { n: 'Neha Bansal', st: 'Declined', p: 0, a: '-', d: '-', ac: '-' },
    { n: 'Farhan Ali', st: 'Invited', p: 1, a: '12 Dec', d: '14 Dec', ac: 'Hotel Narain' }
  ]);

  const [activityFeed, setActivityFeed] = useState([
    'Vendor quotation received — Royal Frames Studio',
    'Client payment recorded — INV-102',
    'Task completed — Venue walkthrough, Jaipur',
    'Wedding project created — The Sharma Wedding',
    'Vendor RFQ sent — Catering (380 guests)'
  ]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const logActivity = (msg: string) => {
    setActivityFeed((prev) => [msg, ...prev]);
  };

  // Derived Finance calculations
  const invoicePaid = (inv: (typeof invoices)[0]) =>
    inv.p.filter((x) => x.s === 'Cleared').reduce((acc, x) => acc + x.a, 0);
  const invoicePending = (inv: (typeof invoices)[0]) =>
    inv.p.filter((x) => x.s === 'Pending').reduce((acc, x) => acc + x.a, 0);
  const invoiceStatus = (inv: (typeof invoices)[0]) => {
    const paid = invoicePaid(inv);
    if (paid >= inv.a) return 'Paid';
    if (new Date(inv.due) < new Date('2026-10-31')) return 'Overdue';
    return paid > 0 ? 'Partially Paid' : 'Pending';
  };

  const billCalc = (b: (typeof vendorBills)[0]) => {
    const approvedAdditions = b.ch.filter((c) => c.ap).reduce((acc, c) => acc + c.a, 0);
    const total = b.ag + approvedAdditions;
    const paid = b.p.filter((x) => x.s === 'Cleared').reduce((acc, x) => acc + x.a, 0);
    const pending = b.p.filter((x) => x.s === 'Pending').reduce((acc, x) => acc + x.a, 0);
    const submittedTotal = b.ag + b.ch.reduce((acc, c) => acc + c.a, 0);
    return {
      approvedAdditions,
      total,
      paid,
      remaining: total - paid,
      submittedTotal,
      pending
    };
  };

  // Derived Attention Required list
  const attentionItems = useMemo(() => {
    const alerts: string[] = [];
    invoices
      .filter((i) => invoiceStatus(i) === 'Overdue')
      .forEach((i) => {
        const wName = weddings[i.w]?.n || 'Wedding';
        alerts.push(`Overdue: ${i.id} · ${wName} · ${inr(i.a - invoicePaid(i))}`);
      });

    const pendingClientPayments = invoices.flatMap((i) => i.p.filter((p) => p.s === 'Pending'));
    const pendingVendorPayments = vendorBills.flatMap((b) => b.p.filter((p) => p.s === 'Pending'));
    [...pendingClientPayments, ...pendingVendorPayments].forEach((p) => {
      alerts.push(`Payment ${p.r} awaiting approval · ${inr(p.a)}`);
    });

    rfqs
      .filter((r) => r.st === 'Quotes Received' || r.st === 'Under Review')
      .forEach((r) => {
        alerts.push(`${r.id} quotations awaiting review`);
      });

    vendorBills
      .filter((b) => b.rec !== 'Reconciled')
      .forEach((b) => {
        alerts.push(`${b.id} unreconciled — ${b.v}`);
      });

    return alerts;
  }, [invoices, vendorBills, rfqs, weddings]);

  // Unified Sorting / Filtering Table Builder
  const renderTable = (
    tableId: string,
    cols: string[],
    rows: Array<Array<React.ReactNode>>,
    sortable: boolean = true
  ) => {
    const q = searchQuery.toLowerCase().trim();
    let filtered = rows.filter((r) => {
      if (!q) return true;
      const rowText = r
        .map((cell) => (typeof cell === 'string' || typeof cell === 'number' ? String(cell) : ''))
        .join(' ')
        .toLowerCase();
      return rowText.includes(q);
    });

    const sortConfig = sortState[tableId];
    if (sortConfig) {
      filtered = [...filtered].sort((a, b) => {
        const cellA = String(a[sortConfig.i] || '').replace(/[₹,]/g, '');
        const cellB = String(b[sortConfig.i] || '').replace(/[₹,]/g, '');
        return cellA.localeCompare(cellB, undefined, { numeric: true }) * sortConfig.d;
      });
    }

    const handleSort = (colIdx: number) => {
      if (!sortable) return;
      const current = sortState[tableId];
      setSortState((prev) => ({
        ...prev,
        [tableId]: {
          i: colIdx,
          d: current && current.i === colIdx ? -current.d : 1
        }
      }));
    };

    return (
      <div className="tw">
        <table className="rk-table">
          <thead>
            <tr>
              {cols.map((col, idx) => (
                <th key={idx} onClick={() => handleSort(idx)}>
                  {col}
                  {sortConfig && sortConfig.i === idx ? (sortConfig.d > 0 ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{cell}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={cols.length} style={{ textAlign: 'center', padding: '2rem', color: 'var(--tp)' }}>
                  Nothing matches “{searchQuery}”. Clear the search to see all records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // Payment Maker-Checker Action Cell
  const renderPaymentApprovalAction = (payment: { r: string; a: number; by: string; s: string }) => {
    if (payment.s !== 'Pending') return <span>—</span>;
    const isMine = payment.by.toLowerCase() === (user?.name || '').toLowerCase();
    const canApprove =
      (user?.role === 'ADMIN' || user?.role === 'FOUNDER' || user?.role === 'FINANCE_DIRECTOR') && !isMine;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
        <button
          className="rk-btn s"
          disabled={!canApprove}
          onClick={() => {
            // Approve payment
            setInvoices((prev) =>
              prev.map((inv) => ({
                ...inv,
                p: inv.p.map((p) => (p.r === payment.r ? { ...p, s: 'Cleared' } : p))
              }))
            );
            setVendorBills((prev) =>
              prev.map((bill) => ({
                ...bill,
                p: bill.p.map((p) => (p.r === payment.r ? { ...p, s: 'Cleared' } : p))
              }))
            );
            logActivity(`Payment ${payment.r} approved by ${user?.name}`);
            triggerToast(`Payment ${payment.r} cleared`);
          }}
          title={isMine ? 'You created this payment — a different user must approve (Maker-Checker)' : 'Approve payment'}
        >
          Approve
        </button>
        <button
          className="rk-btn o s"
          disabled={!canApprove}
          onClick={() => {
            setInvoices((prev) =>
              prev.map((inv) => ({
                ...inv,
                p: inv.p.map((p) => (p.r === payment.r ? { ...p, s: 'Rejected' } : p))
              }))
            );
            setVendorBills((prev) =>
              prev.map((bill) => ({
                ...bill,
                p: bill.p.map((p) => (p.r === payment.r ? { ...p, s: 'Rejected' } : p))
              }))
            );
            logActivity(`Payment ${payment.r} rejected by ${user?.name}`);
            triggerToast(`Payment ${payment.r} rejected`);
          }}
        >
          Reject
        </button>
        {isMine && <span style={{ fontSize: '.72rem', color: 'var(--tp)' }}>Needs different approver</span>}
      </div>
    );
  };

  // Convert Enquiry to Wedding handler
  const handleConvertEnquiry = (enquiryIdx: number) => {
    const enq = enquiries[enquiryIdx];
    if (!enq) return;
    const coupleSurname = enq.n.includes('&') ? enq.n.split('&')[1].trim().split(' ').pop() : 'Royal';
    const newWedding = {
      id: weddings.length,
      n: `The ${coupleSurname} Wedding`,
      d: enq.d,
      dt: enq.dt,
      dd: '2027-03-01',
      g: enq.g,
      days: 3,
      c: 25000000,
      b: 16000000,
      pl: enq.pl,
      st: 'Active',
      pr: 0,
      v: []
    };
    setWeddings((prev) => [...prev, newWedding]);
    setEnquiries((prev) =>
      prev.map((e, idx) => (idx === enquiryIdx ? { ...e, st: 'Converted' } : e))
    );
    logActivity(`Enquiry converted — ${enq.n}`);
    triggerToast(`Enquiry converted &bull; Created ${newWedding.n}`);
  };

  // Function to export visible table data to CSV
  const exportTableToCsv = (filename: string, headers: string[], rows: any[][]) => {
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((val) => {
            const str = String(val ?? '').replace(/"/g, '""');
            return `"${str}"`;
          })
          .join(',')
      )
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast(`Exported ${filename}.csv`);
  };

  // Asynchronous live loader pulling real records from Prisma database
  const fetchLiveDatabaseRecords = useCallback(async () => {
    if (!user) return;
    setIsLiveSyncing(true);
    try {
      // 1. Fetch live Weddings
      const wedRes = await apiFetch('/api/weddings').catch(() => null);
      if (wedRes && wedRes.ok) {
        const body = await wedRes.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          const liveWeddings = body.data.map((w: any, idx: number) => {
            const start = new Date(w.startDate);
            const end = new Date(w.endDate);
            const dtStr = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
            const budgetRupees = Number(w.totalBudgetPaise || 0) / 100;
            const tasksList = w.tasks || [];
            const doneTasks = tasksList.filter((t: any) => t.stage === 'DONE').length;
            const progress = tasksList.length ? Math.round((doneTasks / tasksList.length) * 100) : 50;

            return {
              id: idx,
              dbId: w.id,
              n: w.title,
              d: w.primaryCity || 'Jaipur',
              dt: dtStr,
              dd: w.startDate ? String(w.startDate).slice(0, 10) : '2026-12-15',
              g: w.targetGuestCount || 400,
              days: w.days?.length || 3,
              c: budgetRupees,
              b: Math.round(budgetRupees * 0.7),
              pl: 'Naina Kapoor',
              st: 'Active',
              pr: progress,
              v: [
                ['Royal Frames Studio', 'Photography', 200000],
                ['The Grand Table', 'Catering', 1800000],
                ['Velvet Blooms', 'Decoration', 950000]
              ]
            };
          });
          setWeddings(liveWeddings);
        }
      }

      // 2. Fetch live Enquiries
      const enqRes = await apiFetch('/api/crm/enquiries').catch(() => null);
      if (enqRes && enqRes.ok) {
        const body = await enqRes.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          const liveEnquiries = body.data.map((e: any) => ({
            id: e.id,
            n: e.coupleNames?.trim() || 'Unnamed enquiry',
            d: 'Jaipur',
            dt: e.roughDate ? new Date(e.roughDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : 'Upcoming',
            g: e.estimatedGuests || 350,
            b: Number(e.budgetCeilingPaise || 0) > 0 ? inr(Number(e.budgetCeilingPaise) / 100) : 'Not provided',
            s: e.source,
            st: e.status === 'NEW' ? 'New' : e.status === 'CONVERTED' ? 'Converted' : e.status === 'CONSULTATION_SCHEDULED' ? 'Consultation' : 'Qualified',
            pl: 'Naina Kapoor'
          }));
          setEnquiries(liveEnquiries);
        }
      }

      // 3. Fetch live Couples for Wedding Creation Modal
      const couplesRes = await apiFetch('/api/crm/couples').catch(() => null);
      if (couplesRes && couplesRes.ok) {
        const body = await couplesRes.json();
        if (body.success && Array.isArray(body.data)) {
          setLiveCouples(body.data);
        }
      }

      // 4. Fetch team members for Task Assignment Modal
      const teamRes = await apiFetch('/api/weddings/team/members').catch(() => null);
      if (teamRes && teamRes.ok) {
        const body = await teamRes.json();
        if (body.success && Array.isArray(body.data)) {
          setTeamMembers(body.data);
        }
      }

      // 5. Fetch live Vendors
      const venRes = await apiFetch('/api/vendors').catch(() => null);
      if (venRes && venRes.ok) {
        const body = await venRes.json();
        if (body.success && Array.isArray(body.data) && body.data.length > 0) {
          const liveVendors = body.data.map((v: any) => ({
            id: v.id,
            n: v.businessName,
            c: v.category,
            ct: v.city,
            p: v.contactPerson,
            ph: v.phone,
            st: 'Active'
          }));
          setVendors(liveVendors);
        }
      }
    } catch (e) {
      console.warn('Backend live sync notice:', e);
    } finally {
      setIsLiveSyncing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLiveDatabaseRecords();
  }, [fetchLiveDatabaseRecords]);

  // Quick Create Modal Dispatcher
  const handleQuickCreate = (type: string) => {
    if (type === 'Enquiry' || type === 'Wedding' || type === 'Vendor' || type === 'RFQ' || type === 'Task') {
      setActiveCreateModal(type as any);
    }
  };

  // Calculate totals for RFQ quotes
  const quoteTotal = (q: { base: number; tax: number; ex: number }) => q.base + q.tax + q.ex;

  return (
    <AppShell
      currentTab={currentTab}
      onSelectTab={(tab) => {
        setCurrentTab(tab);
        setSelectedWeddingId(null);
        setSelectedRfqIndex(null);
        setSelectedBillIndex(null);
      }}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      onQuickCreate={handleQuickCreate}
      attentionItems={attentionItems}
    >
      {/* Toast Notification Pill */}
      <div className={`toast-pill ${toastMessage ? 'on' : ''}`}>
        {toastMessage}
      </div>

      {/* RBAC Guard: Block unauthorized tabs unconditionally */}
      {RESTRICTED_TAB_PERMISSIONS[currentTab] && !hasPermission(RESTRICTED_TAB_PERMISSIONS[currentTab].perm as any) ? (
        <AccessRestrictedView
          label={RESTRICTED_TAB_PERMISSIONS[currentTab].label}
          perm={RESTRICTED_TAB_PERMISSIONS[currentTab].perm}
          userRole={user?.role}
        />
      ) : (
        <>
          {/* VIEW: DASHBOARD */}
          {currentTab === 'dash' && (
            <div style={{ display: 'grid', gap: '1.2rem' }}>
              <div>
                <div className="cr">The Royal Knot / Dashboard</div>
                <h1 style={{ marginTop: '.2rem' }}>
                  Good morning, {user?.name ? user.name.split(' ')[0] : 'Member'}
                </h1>
                <div style={{ color: 'var(--tp)', fontSize: '.82rem', marginTop: '.2rem' }}>
                  Here’s what’s happening across your wedding operations. &bull; Season 2026–27 &bull; Real Operational Database
                </div>
              </div>

              {/* Quick Action Pill Buttons */}
              <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                <button className="rk-btn o s" onClick={() => setCurrentTab('enq')}>
                  Create Enquiry
                </button>
                <button className="rk-btn o s" onClick={() => setCurrentTab('wed')}>
                  Create Wedding
                </button>
                <button className="rk-btn o s" onClick={() => setCurrentTab('ven')}>
                  Add Vendor
                </button>
                {hasPermission('procurement:rfq:read') && (
                  <button className="rk-btn o s" onClick={() => setCurrentTab('rfq')}>
                    Create RFQ
                  </button>
                )}
                {hasPermission('finance:invoice:read') && (
                  <button className="rk-btn o s" onClick={() => setCurrentTab('inv')}>
                    Record Client Payment
                  </button>
                )}
                {hasPermission('finance:vendor_bill:read') && (
                  <button className="rk-btn o s" onClick={() => setCurrentTab('vb')}>
                    Record Vendor Payment
                  </button>
                )}
                <button
                  className="rk-btn o s"
                  onClick={() => setContingencyModalOpen(true)}
                  style={{ borderColor: 'var(--er)', color: 'var(--er)', fontWeight: 600 }}
                >
                  ⚡ Contingency Protocols
                </button>
                {hasPermission('finance:ledger:read') && (
                  <button
                    className="rk-btn o s"
                    onClick={() => setBudgetSimulatorOpen(true)}
                    style={{ borderColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }}
                  >
                    💰 Budget Simulator
                  </button>
                )}
                <button
                  className="rk-btn o s"
                  onClick={() => setPreviewPortalToken('demo-luxury-portal')}
                  style={{ borderColor: 'var(--gold)', color: 'var(--gold)', fontWeight: 600 }}
                >
                  ✦ Guest Concierge Portal
                </button>
              </div>

              {/* SPECIAL FEATURES SHOWCASE CAROUSEL */}
              <FeatureShowcaseCarousel
                onOpenRadar={() => {
                  const el = document.getElementById('readiness-radar-anchor');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                onOpenBudgetSimulator={() => setBudgetSimulatorOpen(true)}
                onOpenContingency={() => setContingencyModalOpen(true)}
                onOpenVendorReliability={() => {
                  setSelectedReliabilityVendor({
                    id: 'v-test-floral-01',
                    name: 'Royal Rajputana Florals'
                  });
                }}
                onOpenGuestPortal={() => {
                  setPreviewPortalToken('demo-luxury-portal');
                }}
              />

              {/* FEATURE 1: WEDDING READINESS & RISK RADAR COCKPIT */}
              <div id="readiness-radar-anchor">
                <ReadinessRadarWidget
                  weddingId={
                    ((weddings[selectedWeddingId ?? 0] as any)?.dbId && (weddings[selectedWeddingId ?? 0] as any)?.dbId !== 'wed-demo-01')
                      ? (weddings[selectedWeddingId ?? 0] as any).dbId
                      : ((weddings.find((w: any) => !!w.dbId && w.dbId !== 'wed-demo-01') as any)?.dbId || '')
                  }
                  onOpenContingency={() => setContingencyModalOpen(true)}
                />
              </div>

          {/* 8 Primary KPI Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Active Weddings</span>
              <b>{weddings.length}</b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>Rajasthan luxury portfolio</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Enquiries</span>
              <b>{enquiries.length}</b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>this season</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Upcoming Weddings</span>
              <b>{weddings.filter((w) => new Date(w.dd) > new Date('2026-10-31')).length}</b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>winter calendar</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Expected Revenue</span>
              <b>{cr(weddings.reduce((acc, w) => acc + w.c, 0))}</b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>contract value</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Client Payments Received</span>
              <b>{cr(invoices.reduce((acc, i) => acc + invoicePaid(i), 0))}</b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>cleared in ledger</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Outstanding Receivables</span>
              <b>
                {cr(
                  invoices.reduce((acc, i) => acc + i.a, 0) -
                    invoices.reduce((acc, i) => acc + invoicePaid(i), 0)
                )}
              </b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>invoiced &minus; cleared</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Vendor Payments Pending</span>
              <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).pending, 0))}</b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>awaiting approval</span>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Estimated Profit</span>
              <b>
                {cr(
                  invoices.reduce((acc, i) => acc + invoicePaid(i), 0) -
                    vendorBills.reduce((acc, b) => acc + billCalc(b).paid, 0) -
                    workLogs.reduce((acc, l) => acc + l.h * l.r, 0)
                )}
              </b>
              <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>cleared in &minus; cleared out</span>
            </div>
          </div>

          {/* Revenue vs Expenses CSS Bar Chart & Collection Bar */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.8rem' }}>
                Revenue vs Expenses (₹ Lakhs)
              </h3>
              <div className="col-chart">
                {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => {
                  const revVals = [18, 32, 44, 36, 52, 60];
                  const expVals = [12, 20, 31, 28, 38, 41];
                  const maxVal = 60;
                  return (
                    <div key={month}>
                      <i
                        title={`${month} Revenue: ${revVals[idx]}L`}
                        style={{ height: `${(revVals[idx] / maxVal) * 100}%`, background: 'var(--gold)' }}
                      />
                      <i
                        title={`${month} Expenses: ${expVals[idx]}L`}
                        style={{ height: `${(expVals[idx] / maxVal) * 100}%`, background: 'var(--tp)' }}
                      />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', color: 'var(--tp)', fontSize: '.75rem', marginTop: '.4rem' }}>
                {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                  <span key={m} style={{ flex: 1, textAlign: 'center' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.8rem' }}>
                Payment Collection Status
              </h3>
              <div style={{ display: 'grid', gap: '.8rem', marginTop: '.5rem' }}>
                {(() => {
                  const totalInv = invoices.reduce((acc, i) => acc + i.a, 0);
                  const received = invoices.reduce((acc, i) => acc + invoicePaid(i), 0);
                  const pending = invoices.reduce((acc, i) => acc + invoicePending(i), 0);
                  const overdue = invoices
                    .filter((i) => invoiceStatus(i) === 'Overdue')
                    .reduce((acc, i) => acc + (i.a - invoicePaid(i)), 0);

                  return [
                    { label: 'Received (Cleared)', val: received, color: '#4F7A57' },
                    { label: 'Pending Approval', val: pending, color: '#B9791B' },
                    { label: 'Overdue Milestones', val: overdue, color: '#A5403F' }
                  ].map((x) => (
                    <div key={x.label} style={{ display: 'flex', alignItems: 'center', gap: '.8rem' }}>
                      <span style={{ width: '140px', fontSize: '.82rem' }}>{x.label}</span>
                      <div className="rk-bar" style={{ flex: 1 }}>
                        <i style={{ width: `${Math.min(100, (x.val / (totalInv || 1)) * 100)}%`, background: x.color }} />
                      </div>
                      <b style={{ fontSize: '.85rem' }}>{cr(x.val)}</b>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Live Visual Analytics: Destination Footprint & Enquiry Channels */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="rk-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
                <h3 className="sf" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Rajasthan Destination Portfolio
                </h3>
                <span className="bd b-ok" style={{ fontSize: '.7rem' }}>Live {weddings.length} Weddings</span>
              </div>
              <div style={{ display: 'grid', gap: '.65rem' }}>
                {['Udaipur', 'Jaipur', 'Jodhpur'].map((city) => {
                  const count = weddings.filter((w) => (w.d || '').toLowerCase().includes(city.toLowerCase())).length;
                  const pct = weddings.length ? Math.round((count / weddings.length) * 100) : 0;
                  return (
                    <div key={city} style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('wed')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.25rem' }}>
                        <b>{city}</b>
                        <span style={{ color: 'var(--tp)' }}>{count} celebrations ({pct}%) ›</span>
                      </div>
                      <div style={{ height: '7px', background: '#FAF6EE', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)', borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rk-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.8rem' }}>
                <h3 className="sf" style={{ fontSize: '1.2rem', margin: 0 }}>
                  Enquiry Acquisition Channels
                </h3>
                <span className="bd b-ok" style={{ fontSize: '.7rem' }}>Live {enquiries.length} Enquiries</span>
              </div>
              <div style={{ display: 'grid', gap: '.65rem' }}>
                {['Referral', 'Instagram', 'Wedding fair', 'Website'].map((src) => {
                  const count = enquiries.filter((e) => (e.s || '').toLowerCase().includes(src.toLowerCase())).length;
                  const pct = enquiries.length ? Math.round((count / enquiries.length) * 100) : 0;
                  return (
                    <div key={src} style={{ cursor: 'pointer' }} onClick={() => setCurrentTab('enq')}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.25rem' }}>
                        <b>{src}</b>
                        <span style={{ color: 'var(--tp)' }}>{count} inquiries ({pct}%) ›</span>
                      </div>
                      <div style={{ height: '7px', background: '#FAF6EE', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#4F7A57', borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Attention Required & Upcoming Events */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.6rem' }}>
                Attention Required
              </h3>
              {attentionItems.length > 0 ? (
                attentionItems.slice(0, 5).map((alert, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '.45rem 0',
                      borderBottom: '1px solid #F1EBDF',
                      fontSize: '.82rem',
                      color: 'var(--ink)'
                    }}
                  >
                    ⚠ {alert}
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>All clear. No operational bottlenecks.</div>
              )}
            </div>

            <div className="rk-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.6rem' }}>
                <h3 className="sf" style={{ fontSize: '1.25rem', margin: 0 }}>
                  Upcoming Celebrations
                </h3>
                <span className="bd b-in" style={{ fontSize: '.68rem' }}>
                  {weddings.length} Active Portfolio
                </span>
              </div>
              <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '.4rem' }}>
                {weddings.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '.45rem 0',
                      borderBottom: '1px solid #F1EBDF'
                    }}
                  >
                    <div>
                      <b style={{ fontSize: '.88rem' }}>{w.n}</b>
                      <div style={{ color: 'var(--tp)', fontSize: '.75rem' }}>
                        {w.d} &bull; {w.pl}
                      </div>
                    </div>
                    <span className="bd b-in">
                      {Math.max(
                        0,
                        Math.ceil((new Date(w.dd).getTime() - new Date('2026-10-31').getTime()) / 864e5)
                      )}{' '}
                      days
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Pending Tasks & Recent Activity */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.6rem' }}>
                High Priority Tasks
              </h3>
              <div style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '.4rem' }}>
                {tasks
                  .filter((t) => t.st !== 'Completed')
                  .slice(0, 8)
                  .map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '.45rem 0',
                      borderBottom: '1px solid #F1EBDF'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '.85rem' }}>{t.t}</div>
                      <div style={{ color: 'var(--tp)', fontSize: '.75rem' }}>
                        {weddings[t.w]?.n} &bull; {t.o}
                      </div>
                    </div>
                    {renderBadge(t.p === 'High' ? 'Overdue' : 'Pending')}
                  </div>
                ))}
              </div>
            </div>

            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.6rem' }}>
                Recent Operational Activity
              </h3>
              {activityFeed.slice(0, 5).map((act, idx) => (
                <div
                  key={idx}
                  style={{ padding: '.4rem 0', fontSize: '.8rem', color: 'var(--tp)', borderBottom: '1px solid #F1EBDF' }}
                >
                  &bull; {act}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: ENQUIRIES */}
      {currentTab === 'enq' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.8rem' }}>
            <div>
              <div className="cr">The Royal Knot / Enquiries</div>
              <h1 style={{ marginTop: '.2rem' }}>Enquiries Hub</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                Capture, qualify, and convert luxury wedding client inquiries.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              <button
                className="rk-btn g s"
                onClick={() => setActiveCreateModal('Enquiry')}
              >
                + New Enquiry
              </button>
              <button
                className="rk-btn o s"
                onClick={() =>
                  exportTableToCsv(
                    'client_enquiries',
                    ['Couple', 'Destination', 'Date', 'Guests', 'Budget', 'Source', 'Status', 'Planner'],
                    enquiries.map((e) => [e.n || 'Unnamed enquiry', e.d, e.dt, e.g, e.b, e.s, e.st, e.pl])
                  )
                }
              >
                Export CSV ↓
              </button>
              <button
                className="rk-btn o s"
                onClick={() => setCurrentTab('crm_full')}
                title="Switch to detailed dossier view"
              >
                Open Full CRM Dossiers &rarr;
              </button>
            </div>
          </div>

          {/* Status Metric Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            {['New', 'Qualified', 'Proposal Sent', 'Converted'].map((s) => (
              <div key={s} className="rk-card kpi hov">
                <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>{s}</span>
                <b>{enquiries.filter((e) => e.st === s).length}</b>
              </div>
            ))}
          </div>

          {/* Status Filter Pills */}
          <div style={{ display: 'flex', gap: '.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '.78rem', color: 'var(--tp)', marginRight: '.2rem' }}>Filter by Status:</span>
            {['All', 'New', 'Qualified', 'Proposal Sent', 'Converted'].map((st) => (
              <button
                key={st}
                className={`rk-btn s ${enquiryStatusFilter === st ? 'g' : 'o'}`}
                onClick={() => setEnquiryStatusFilter(st)}
              >
                {st} {st !== 'All' ? `(${enquiries.filter((e) => e.st === st).length})` : `(${enquiries.length})`}
              </button>
            ))}
          </div>

          {renderTable(
            'enq',
            ['Couple', 'Destination', 'Date', 'Guests', 'Budget', 'Source', 'Status', 'Planner', 'Actions'],
            enquiries
              .filter((e) => enquiryStatusFilter === 'All' || e.st === enquiryStatusFilter)
              .map((e, idx) => [
                <b>{e.n || 'Unnamed enquiry'}</b>,
                e.d || 'Rajasthan',
                e.dt || 'Upcoming',
                e.g || '—',
                e.b || 'Not provided',
                e.s || 'Direct',
                renderBadge(e.st || 'New'),
                e.pl || 'Unassigned',
                e.st === 'Converted' ? (
                  <span>&mdash;</span>
                ) : (
                  <button
                    className="rk-btn s"
                    onClick={() => handleConvertEnquiry(idx)}
                  >
                    Convert to Wedding
                  </button>
                )
              ])
          )}
        </div>
      )}

      {/* VIEW: FULL CRM DOSSIERS (preserves existing CrmModule) */}
      {currentTab === 'crm_full' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="rk-btn o s" onClick={() => setCurrentTab('enq')}>
              &larr; Back to Enquiries Table
            </button>
          </div>
          <CrmModule />
        </div>
      )}

      {/* VIEW: CLIENTS / COUPLES */}
      {currentTab === 'cli' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Clients</div>
            <h1 style={{ marginTop: '.2rem' }}>Couples & Clients</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Client records linked to active destination wedding projects.
            </div>
          </div>

          {renderTable(
            'cli',
            ['Couple', 'Wedding', 'Contract Value', 'Paid (Cleared)', 'Payment Status', 'Relationship Manager'],
            weddings.map((w) => {
              const ivs = invoices.filter((i) => i.w === w.id);
              const paid = ivs.reduce((acc, i) => acc + invoicePaid(i), 0);
              const billed = ivs.reduce((acc, i) => acc + i.a, 0);
              const isOverdue = ivs.some((i) => invoiceStatus(i) === 'Overdue');
              const status = paid >= billed && billed > 0 ? 'Paid' : isOverdue ? 'Overdue' : 'Partially Paid';
              return [
                <b>{w.n.replace('The ', '').replace(' Wedding', '')} family</b>,
                w.n,
                inr(w.c),
                inr(paid),
                renderBadge(status),
                w.pl
              ];
            })
          )}
        </div>
      )}

      {/* VIEW: WEDDING PROJECTS & WORKSPACE */}
      {currentTab === 'wed' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          {selectedWeddingId !== null ? (
            // Dedicated Wedding Workspace
            (() => {
              const w = weddings[selectedWeddingId];
              if (!w) return null;
              const wInvoices = invoices.filter((i) => i.w === w.id);
              const wBills = vendorBills.filter((b) => b.w === w.id);
              const vendorPaid = wBills.reduce((acc, b) => acc + billCalc(b).paid, 0);
              const vendorPlanned = w.v.reduce((acc, v) => acc + Number(v[2]), 0);
              const clientPaid = wInvoices.reduce((acc, i) => acc + invoicePaid(i), 0);
              const clientBilled = wInvoices.reduce((acc, i) => acc + i.a, 0);

              const subTabs = ['Overview', 'Tasks', 'Vendors', 'Schedule', 'Guests', 'Budget', 'Payments', 'Documents'];

              return (
                <div>
                  <div className="cr">
                    <a
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setSelectedWeddingId(null)}
                    >
                      Wedding Projects
                    </a>{' '}
                    / {w.n}
                  </div>

                  {/* Wedding Header Card */}
                  <div
                    className="rk-card"
                    style={{
                      background: 'linear-gradient(120deg, #292321, #5a2f2a)',
                      color: '#F5EBDD',
                      margin: '.8rem 0',
                      padding: '1.4rem'
                    }}
                  >
                    <h1 className="sf" style={{ fontSize: '2.2rem', color: '#FAF6EE' }}>
                      {w.n.toUpperCase()}
                    </h1>
                    <div style={{ fontSize: '.9rem', marginTop: '.3rem', opacity: 0.9 }}>
                      {w.d}, Rajasthan &bull; {w.dt} &bull; {w.g} guests &bull; {w.days} event days
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
                      {renderBadge(w.st)}
                      <div className="rk-bar" style={{ flex: 1 }}>
                        <i style={{ width: `${w.pr}%` }} />
                      </div>
                      <b>{w.pr}% complete</b>
                    </div>
                  </div>

                  {/* Workspace Tabs */}
                  <div className="tabs-rk">
                    {subTabs.map((tab) => (
                      <button
                        key={tab}
                        className={weddingTab === tab ? 'on' : ''}
                        onClick={() => setWeddingTab(tab)}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Tab: Overview */}
                  {weddingTab === 'Overview' && (
                    <div style={{ display: 'grid', gap: '1.2rem' }}>
                      {/* Special Operations Actions */}
                      <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
                        <button
                          className="rk-btn o s"
                          onClick={() => setContingencyModalOpen(true)}
                          style={{ borderColor: 'var(--er)', color: 'var(--er)', fontWeight: 600 }}
                        >
                          ⚡ Contingency & Emergency Protocols
                        </button>
                        <button
                          className="rk-btn o s"
                          onClick={() => setBudgetSimulatorOpen(true)}
                          style={{ borderColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }}
                        >
                          💰 Run What-If Budget Simulator
                        </button>
                      </div>

                      {/* WEDDING READINESS RADAR */}
                      <ReadinessRadarWidget
                        weddingId={
                          ((w as any)?.dbId && (w as any)?.dbId !== 'wed-demo-01')
                            ? (w as any).dbId
                            : ((weddings.find((item: any) => !!item.dbId && item.dbId !== 'wed-demo-01') as any)?.dbId || '')
                        }
                        onOpenContingency={() => setContingencyModalOpen(true)}
                      />

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div className="rk-card kpi">
                          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Budget</span>
                          <b>{cr(w.b)}</b>
                        </div>
                        <div className="rk-card kpi">
                          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Committed Vendors</span>
                          <b>{cr(vendorPlanned)}</b>
                        </div>
                        <div className="rk-card kpi">
                          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Vendor Paid</span>
                          <b>{cr(vendorPaid)}</b>
                        </div>
                        <div className="rk-card kpi">
                          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Remaining Budget</span>
                          <b>{cr(w.b - vendorPlanned)}</b>
                        </div>
                        <div className="rk-card kpi">
                          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Vendors Assigned</span>
                          <b>{w.v.length}</b>
                        </div>
                        <div className="rk-card kpi">
                          <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Client Paid</span>
                          <b>{cr(clientPaid)}</b>
                          <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>of {cr(clientBilled)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab: Tasks Kanban */}
                  {weddingTab === 'Tasks' && (
                    <div className="kb">
                      {['To Do', 'In Progress', 'Review', 'Completed'].map((col) => (
                        <div key={col}>
                          <b>
                            {col}{' '}
                            <span style={{ color: 'var(--tp)', fontSize: '.8rem' }}>
                              ({tasks.filter((t) => t.w === w.id && t.st === col).length})
                            </span>
                          </b>
                          {tasks
                            .filter((t) => t.w === w.id && t.st === col)
                            .map((t, tIdx) => (
                              <div key={tIdx} className="rk-card">
                                <b>{t.t}</b>
                                <div style={{ color: 'var(--tp)', fontSize: '.75rem', marginTop: '.3rem' }}>
                                  {t.c} &bull; {t.o} &bull; {t.p}
                                </div>
                                {col !== 'Completed' && (
                                  <button
                                    className="rk-btn o s"
                                    style={{ marginTop: '.5rem' }}
                                    onClick={() => {
                                      const order = ['To Do', 'In Progress', 'Review', 'Completed'];
                                      const nextStatus = order[order.indexOf(t.st) + 1];
                                      setTasks((prev) =>
                                        prev.map((item) =>
                                          item === t ? { ...item, st: nextStatus } : item
                                        )
                                      );
                                      triggerToast(`Task moved to ${nextStatus}`);
                                    }}
                                  >
                                    Move &rarr;
                                  </button>
                                )}
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Tab: Vendors */}
                  {weddingTab === 'Vendors' &&
                    renderTable(
                      `wv-${w.id}`,
                      ['Vendor', 'Category', 'Agreed Amount', 'Paid (Cleared)', 'Outstanding'],
                      w.v.map((v) => {
                        const paid = wBills
                          .filter((b) => b.v === v[0])
                          .reduce((acc, b) => acc + billCalc(b).paid, 0);
                        const agreed = Number(v[2]);
                        return [<b>{v[0]}</b>, v[1], inr(agreed), inr(paid), inr(agreed - paid)];
                      }),
                      false
                    )}

                  {/* Tab: Schedule */}
                  {weddingTab === 'Schedule' && (
                    <div style={{ borderLeft: '2px solid var(--gold)', marginLeft: '.5rem', paddingLeft: '1.2rem' }}>
                      {events
                        .filter((e) => e.w === w.id)
                        .map((e, idx) => (
                          <div key={idx} style={{ marginBottom: '1.2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
                              <b>{e.n}</b>
                              {renderBadge(e.d)}
                            </div>
                            <div style={{ color: 'var(--tp)', fontSize: '.8rem', marginTop: '.2rem' }}>
                              {e.t} &bull; {e.v} &bull; Coordinator: {e.c}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Tab: Guests */}
                  {weddingTab === 'Guests' && (
                    <div style={{ display: 'grid', gap: '1rem' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          background: '#fff',
                          padding: '1rem 1.2rem',
                          borderRadius: '8px',
                          border: '1px solid var(--bd)',
                          flexWrap: 'wrap',
                          gap: '.6rem'
                        }}
                      >
                        <div>
                          <b style={{ fontSize: '.95rem' }}>Guest Concierge & Public QR Portal</b>
                          <div style={{ fontSize: '.78rem', color: 'var(--tp)' }}>
                            Share digital palace invitation, live schedule, and receive instant RSVP confirmations.
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '.6rem' }}>
                          <button
                            className="rk-btn g s"
                            onClick={async () => {
                              try {
                                const weddingDbId = (w as any).dbId || (weddings.find((item: any) => !!item.dbId) as any)?.dbId;
                                if (!weddingDbId) {
                                  alert('Please select an active wedding synchronized with database.');
                                  return;
                                }
                                const res = await apiFetch(`/api/weddings/${weddingDbId}/portal-token`, {
                                  method: 'POST',
                                  body: JSON.stringify({
                                    welcomeMessage: `Welcome to the royal celebrations of ${w.n}!`
                                  })
                                });
                                if (res.ok) {
                                  const json = await res.json();
                                  if (json.data?.token) {
                                    setPreviewPortalToken(json.data.token);
                                  }
                                }
                              } catch (err: any) {
                                alert('Failed to generate portal link: ' + err.message);
                              }
                            }}
                          >
                            🔗 Launch Guest QR Portal
                          </button>

                          <button
                            className="rk-btn o s"
                            onClick={() => {
                              const weddingDbId = (w as any).dbId || (weddings.find((item: any) => !!item.dbId) as any)?.dbId;
                              if (!weddingDbId) {
                                alert('Please select an active wedding synchronized with database.');
                                return;
                              }
                              window.open(`http://localhost:5000/api/weddings/${weddingDbId}/guests/export`, '_blank');
                            }}
                          >
                            📥 Export Guests to CSV
                          </button>
                        </div>
                      </div>

                      {renderTable(
                        'wg',
                        ['Guest', 'RSVP', 'Party Size', 'Accommodation'],
                        guests.map((g) => [<b>{g.n}</b>, renderBadge(g.st), g.p, g.ac]),
                        false
                      )}
                    </div>
                  )}

                  {/* Tab: Budget Allocation Bars */}
                  {weddingTab === 'Budget' && (
                    <div className="rk-card">
                      <h3 className="sf" style={{ fontSize: '1.3rem', marginBottom: '1rem' }}>
                        Category Budget Allocations vs Spend
                      </h3>
                      {[
                        'Venue',
                        'Catering',
                        'Decoration',
                        'Photography',
                        'Entertainment',
                        'Accommodation',
                        'Transportation',
                        'Team / Labour'
                      ].map((cat, idx) => {
                        const pct = [18, 30, 12, 6, 8, 12, 6, 8][idx];
                        const budget = (pct * w.b) / 100;
                        const actual = budget * (0.55 + idx * 0.05);
                        return (
                          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '.6rem 0' }}>
                            <span style={{ width: '130px', fontSize: '.85rem' }}>{cat}</span>
                            <div className="rk-bar" style={{ flex: 1 }}>
                              <i style={{ width: `${Math.min(100, (actual / budget) * 100)}%` }} />
                            </div>
                            <span style={{ width: '180px', textAlign: 'right', fontSize: '.8rem', color: 'var(--tp)' }}>
                              {cr(actual)} / {cr(budget)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tab: Payments */}
                  {weddingTab === 'Payments' &&
                    renderTable(
                      'wp',
                      ['Invoice', 'Milestone', 'Due Date', 'Amount', 'Received', 'Status'],
                      wInvoices.map((i) => [
                        i.id,
                        i.t,
                        i.due,
                        inr(i.a),
                        inr(invoicePaid(i)),
                        renderBadge(invoiceStatus(i))
                      ]),
                      false
                    )}

                  {/* Tab: Documents */}
                  {weddingTab === 'Documents' &&
                    renderTable(
                      'wd',
                      ['File Name', 'Category', 'Uploaded Date', 'Party'],
                      [
                        ['Event Contract — signed.pdf', 'Contracts', '02 Aug', 'Client'],
                        ['Photography Quotes & Breakdown.xlsx', 'Quotations', '28 Oct', 'Vendors'],
                        ['Run of Show v3 — Day-of.pdf', 'Event Plans', '25 Oct', 'Internal']
                      ],
                      false
                    )}
                </div>
              );
            })()
          ) : (
            // Projects Grid View
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '.6rem' }}>
                <div>
                  <div className="cr">The Royal Knot / Wedding Projects</div>
                  <h1 style={{ marginTop: '.2rem' }}>Destination Wedding Projects</h1>
                  <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                    Select a wedding project to access its dedicated multi-tab workspace.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="rk-btn g s"
                    onClick={() => setActiveCreateModal('Wedding')}
                  >
                    + New Wedding Project
                  </button>
                  <button
                    className="rk-btn o s"
                    onClick={() =>
                      exportTableToCsv(
                        'wedding_projects',
                        ['Wedding Name', 'Destination', 'Dates', 'Guests', 'Days', 'Contract', 'Budget', 'Progress'],
                        weddings.map((w) => [w.n, w.d, w.dt, w.g, w.days, w.c, w.b, `${w.pr}%`])
                      )
                    }
                  >
                    Export CSV ↓
                  </button>
                  <button
                    className="rk-btn o s"
                    onClick={() => setCurrentTab('wed_full')}
                  >
                    Open Full Tasks Manager &rarr;
                  </button>
                  <button
                    className={`rk-btn s ${weddingsViewMode === 'carousel' ? 'g' : 'o'}`}
                    onClick={() => setWeddingsViewMode('carousel')}
                    title="Carousel Track View"
                  >
                    ▤ Carousel Track
                  </button>
                  <button
                    className={`rk-btn s ${weddingsViewMode === 'grid' ? 'g' : 'o'}`}
                    onClick={() => setWeddingsViewMode('grid')}
                    title="Grid View"
                  >
                    ▦ Grid View
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: weddingsViewMode === 'carousel' ? 'flex' : 'grid',
                  gridTemplateColumns: weddingsViewMode === 'grid' ? 'repeat(auto-fit, minmax(340px, 1fr))' : undefined,
                  gap: '1.2rem',
                  overflowX: weddingsViewMode === 'carousel' ? 'auto' : undefined,
                  paddingBottom: weddingsViewMode === 'carousel' ? '1rem' : undefined,
                  scrollSnapType: weddingsViewMode === 'carousel' ? 'x mandatory' : undefined,
                  scrollbarWidth: 'thin'
                }}
              >
                {weddings.map((w) => {
                  const sp = vendorBills
                    .filter((b) => b.w === w.id)
                    .reduce((acc, b) => acc + billCalc(b).paid, 0);
                  return (
                    <div
                      key={w.id}
                      className="rk-card hov"
                      style={{
                        cursor: 'pointer',
                        minWidth: weddingsViewMode === 'carousel' ? '340px' : undefined,
                        maxWidth: weddingsViewMode === 'carousel' ? '380px' : undefined,
                        flex: weddingsViewMode === 'carousel' ? '0 0 auto' : undefined,
                        scrollSnapAlign: weddingsViewMode === 'carousel' ? 'start' : undefined
                      }}
                      onClick={() => {
                        setSelectedWeddingId(w.id);
                        setWeddingTab('Overview');
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 className="sf" style={{ fontSize: '1.6rem' }}>
                          {w.n}
                        </h3>
                        {renderBadge(w.st)}
                      </div>
                      <div style={{ color: 'var(--tp)', fontSize: '.8rem', marginTop: '.2rem' }}>
                        {w.d} &bull; {w.dt} &bull; {w.g} guests &bull; {w.days} days
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', margin: '.8rem 0' }}>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>Contract</span>
                          <br />
                          <b>{cr(w.c)}</b>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>Budget</span>
                          <br />
                          <b>{cr(w.b)}</b>
                        </div>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: 'var(--tp)', fontSize: '.75rem' }}>Vendor Paid</span>
                          <br />
                          <b>{cr(sp)}</b>
                        </div>
                      </div>
                      <div className="rk-bar">
                        <i style={{ width: `${w.pr}%` }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--tp)', fontSize: '.75rem', marginTop: '.4rem' }}>
                        <span>{w.pr}% complete</span>
                        <span>Planner: {w.pl}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: FULL WEDDINGS TASK PIPELINE (preserves existing WeddingModule) */}
      {currentTab === 'wed_full' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="rk-btn o s" onClick={() => setCurrentTab('wed')}>
              &larr; Back to Wedding Projects
            </button>
          </div>
          <WeddingModule />
        </div>
      )}

      {/* VIEW: VENDOR DIRECTORY */}
      {currentTab === 'ven' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.6rem' }}>
            <div>
              <div className="cr">The Royal Knot / Procurement</div>
              <h1 style={{ marginTop: '.2rem' }}>Master Vendor Directory</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                Curated royal luxury vendor network across Rajasthan.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button
                className="rk-btn g s"
                onClick={() => setActiveCreateModal('Vendor')}
              >
                + Register Vendor
              </button>
              <button
                className="rk-btn o s"
                onClick={() =>
                  exportTableToCsv(
                    'vendor_directory',
                    ['Vendor Name', 'Category', 'City', 'Contact Person', 'Phone', 'Status'],
                    vendors.map((v) => [v.n, v.c, v.ct, v.p, v.ph, v.st])
                  )
                }
              >
                Export CSV ↓
              </button>
              <button className="rk-btn o s" onClick={() => setCurrentTab('ven_full')}>
                Open Full Vendor Module &rarr;
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Vendors</span>
              <b>{vendors.length}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Active Status</span>
              <b>{vendors.filter((v) => v.st === 'Active').length}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Categories</span>
              <b>{new Set(vendors.map((v) => v.c)).size}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Cities</span>
              <b>{new Set(vendors.map((v) => v.ct)).size}</b>
            </div>
          </div>

          {renderTable(
            'ven',
            ['Vendor', 'Category', 'City', 'Contact Person', 'Phone', 'Status', 'Active Assignments', 'Intelligence'],
            vendors.map((v) => [
              <b>{v.n}</b>,
              v.c,
              v.ct,
              v.p,
              v.ph,
              renderBadge(v.st === 'Active' ? 'Active' : 'Pending'),
              weddings.filter((w) => w.v.some((x) => x[0] === v.n)).length,
              <button
                className="rk-btn o s"
                onClick={() => setSelectedReliabilityVendor({ id: (v as any).id || (v as any).dbId || 'v-123', name: v.n })}
                style={{ fontSize: '.75rem', borderColor: 'var(--gold)', color: 'var(--ink)', fontWeight: 600 }}
              >
                ★ Reliability Scorecard
              </button>
            ])
          )}
        </div>
      )}

      {/* VIEW: FULL VENDOR PROCURMENT (preserves existing VendorDirectoryPage) */}
      {currentTab === 'ven_full' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="rk-btn o s" onClick={() => setCurrentTab('ven')}>
              &larr; Back to Master Vendor Directory
            </button>
          </div>
          <VendorDirectoryPage />
        </div>
      )}

      {/* VIEW: RFQS & QUOTATION COMPARISON */}
      {currentTab === 'rfq' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          {selectedRfqIndex !== null ? (
            // Side-by-Side RFQ Comparison Matrix
            (() => {
              const r = rfqs[selectedRfqIndex];
              if (!r) return null;
              const lowestTotal = r.q.length > 0 ? Math.min(...r.q.map(quoteTotal)) : 0;
              const isAwarded = r.win !== null;

              return (
                <div>
                  <div className="cr">
                    <a
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setSelectedRfqIndex(null)}
                    >
                      RFQs
                    </a>{' '}
                    / {r.id}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '.6rem 0' }}>
                    <h1 style={{ fontSize: '2rem' }}>{r.t}</h1>
                    {renderBadge(r.st)}
                  </div>
                  <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                    {weddings[r.w]?.n} &bull; {r.cat} &bull; Deadline: {r.dl}
                  </div>

                  {r.q.length > 0 ? (
                    <div>
                      <h3 className="sf" style={{ fontSize: '1.3rem', margin: '1rem 0 .5rem' }}>
                        Side-by-side Comparative Bidding Matrix
                      </h3>
                      <div className="tw">
                        <table className="rk-table">
                          <thead>
                            <tr>
                              <th>Quotation Metric</th>
                              {r.q.map((q, idx) => (
                                <th key={idx} style={{ background: r.win === idx ? '#dcebdd' : undefined }}>
                                  {q.v}
                                  {quoteTotal(q) === lowestTotal ? ' · Lowest' : ''}
                                  {r.win === idx ? ' · Awarded Winner' : ''}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ['Base Price', (q: (typeof r.q)[0]) => inr(q.base)],
                              ['Tax (18% GST)', (q: (typeof r.q)[0]) => inr(q.tax)],
                              ['Additional Charges', (q: (typeof r.q)[0]) => inr(q.ex)],
                              ['Total Cost', (q: (typeof r.q)[0]) => <b>{inr(quoteTotal(q))}</b>],
                              ['Services Included', (q: (typeof r.q)[0]) => q.inc],
                              ['Validity', (q: (typeof r.q)[0]) => q.val],
                              ['Payment Terms', (q: (typeof r.q)[0]) => q.pay]
                            ].map(([label, accessor]: any, rIdx) => (
                              <tr key={rIdx}>
                                <td>
                                  <b>{label}</b>
                                </td>
                                {r.q.map((q, qIdx) => (
                                  <td
                                    key={qIdx}
                                    className={label === 'Total Cost' && quoteTotal(q) === lowestTotal ? 'hl' : ''}
                                  >
                                    {accessor(q)}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            <tr>
                              <td>
                                <b>Award Decision</b>
                              </td>
                              {r.q.map((q, qIdx) => (
                                <td key={qIdx}>
                                  {isAwarded ? (
                                    r.win === qIdx ? renderBadge('Awarded') : renderBadge('Rejected')
                                  ) : (
                                    <button
                                      className="rk-btn g s"
                                      onClick={() => {
                                        setRfqs((prev) =>
                                          prev.map((item, idx) =>
                                            idx === selectedRfqIndex
                                              ? { ...item, win: qIdx, st: 'Awarded' }
                                              : item
                                          )
                                        );
                                        // Add to wedding assignments
                                        setWeddings((prev) =>
                                          prev.map((w, wIdx) =>
                                            wIdx === r.w
                                              ? { ...w, v: [...w.v, [q.v, r.cat, quoteTotal(q)]] }
                                              : w
                                          )
                                        );
                                        logActivity(`Vendor awarded — ${q.v} (${r.id})`);
                                        triggerToast(`Vendor awarded &bull; Added to ${weddings[r.w]?.n}`);
                                      }}
                                    >
                                      Award Vendor
                                    </button>
                                  )}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="rk-card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--tp)', marginTop: '1rem' }}>
                      No quotations received yet. Vendors have been notified.
                    </div>
                  )}

                  {!isAwarded && (
                    <button
                      className="rk-btn o s"
                      style={{ marginTop: '1rem' }}
                      onClick={() => {
                        const newQuote = {
                          v: 'Velvet Blooms',
                          base: 160000,
                          tax: 28800,
                          ex: 0,
                          inc: 'Full coverage package (demo)',
                          val: '30 days',
                          pay: '30% advance'
                        };
                        setRfqs((prev) =>
                          prev.map((item, idx) =>
                            idx === selectedRfqIndex
                              ? { ...item, q: [...item.q, newQuote], st: 'Quotes Received' }
                              : item
                          )
                        );
                        triggerToast('Demo quotation added to comparison');
                      }}
                    >
                      + Add Quotation (Simulate)
                    </button>
                  )}
                </div>
              );
            })()
          ) : (
            // RFQ Overview List
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '.6rem' }}>
                <div>
                  <div className="cr">The Royal Knot / RFQs</div>
                  <h1 style={{ marginTop: '.2rem' }}>RFQs & Quotations</h1>
                  <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                    Competitive 3-vendor RFQ procurement and side-by-side bidding comparison.
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="rk-btn g s"
                    onClick={() => setActiveCreateModal('RFQ')}
                  >
                    + New RFQ Tender
                  </button>
                  <button
                    className="rk-btn o s"
                    onClick={() =>
                      exportTableToCsv(
                        'rfq_tenders',
                        ['RFQ ID', 'Requirement', 'Wedding', 'Quotes Count', 'Deadline', 'Status'],
                        rfqs.map((r) => [r.id, r.t, weddings[r.w]?.n || 'General', r.q.length, r.dl, r.st])
                      )
                    }
                  >
                    Export CSV ↓
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                {['Sent', 'Quotes Received', 'Under Review', 'Awarded'].map((s) => (
                  <div key={s} className="rk-card kpi hov">
                    <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>{s}</span>
                    <b>{rfqs.filter((r) => r.st === s).length}</b>
                  </div>
                ))}
              </div>

              {renderTable(
                'rfq',
                ['RFQ ID', 'Requirement', 'Wedding', 'Quotes', 'Lowest Price', 'Deadline', 'Status', ''],
                rfqs.map((r, idx) => [
                  r.id,
                  <b>{r.t}</b>,
                  weddings[r.w]?.n,
                  r.q.length,
                  r.q.length > 0 ? inr(Math.min(...r.q.map(quoteTotal))) : '—',
                  r.dl,
                  renderBadge(r.st),
                  <button className="rk-btn o s" onClick={() => setSelectedRfqIndex(idx)}>
                    Open Matrix
                  </button>
                ])
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: VENDOR AGREEMENTS */}
      {currentTab === 'agr' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Agreements</div>
            <h1 style={{ marginTop: '.2rem' }}>Vendor Agreements</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Executed digital service contracts and signature tracking.
            </div>
          </div>

          {renderTable(
            'agr',
            ['Agreement ID', 'Vendor', 'Wedding Project', 'Agreed Baseline', 'Digital Signature'],
            weddings.flatMap((w) =>
              w.v.map((v, idx) => [
                `AG-${w.id}${idx + 1}`,
                v[0],
                w.n,
                inr(Number(v[2])),
                renderBadge(idx % 2 === 0 ? 'Signed' : 'Awaiting Signature')
              ])
            )
          )}
        </div>
      )}

      {/* VIEW: TASKS & PLANNING KANBAN */}
      {currentTab === 'task' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="cr">The Royal Knot / Tasks</div>
              <h1 style={{ marginTop: '.2rem' }}>Tasks & Planning Pipeline</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                Full-scale 4-column milestone pipeline across all destination weddings.
              </div>
            </div>
          </div>

          <div className="kb">
            {['To Do', 'In Progress', 'Review', 'Completed'].map((col) => {
              const colTasks = tasks.filter((t) => {
                if (t.st !== col) return false;
                if (!searchQuery) return true;
                return t.t.toLowerCase().includes(searchQuery.toLowerCase());
              });
              return (
                <div key={col}>
                  <b>
                    {col}{' '}
                    <span style={{ color: 'var(--tp)', fontSize: '.8rem' }}>
                      ({colTasks.length})
                    </span>
                  </b>
                  {colTasks.map((t, idx) => (
                    <div key={idx} className="rk-card">
                      <b>{t.t}</b>
                      <div style={{ color: 'var(--tp)', fontSize: '.75rem', marginTop: '.3rem' }}>
                        {weddings[t.w]?.n} &bull; {t.c} &bull; {t.o}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '.5rem' }}>
                        {renderBadge(t.p === 'High' ? 'Overdue' : 'Pending')}
                        {col !== 'Completed' && (
                          <button
                            className="rk-btn o s"
                            onClick={() => {
                              const order = ['To Do', 'In Progress', 'Review', 'Completed'];
                              const nextStatus = order[order.indexOf(t.st) + 1];
                              setTasks((prev) =>
                                prev.map((item) =>
                                  item === t ? { ...item, st: nextStatus } : item
                                )
                              );
                              triggerToast(`Task moved to ${nextStatus}`);
                            }}
                          >
                            Move &rarr;
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: EVENT SCHEDULE */}
      {currentTab === 'sch' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="cr">The Royal Knot / Schedule</div>
              <h1 style={{ marginTop: '.2rem' }}>Event Ceremony Schedule</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                Day-by-day ceremony timeline across active wedding projects.
              </div>
            </div>
            <button className="rk-btn o s" onClick={() => setCurrentTab('timeline_full')}>
              Open Live Operations Cockpit &rarr;
            </button>
          </div>

          {renderTable(
            'sch',
            ['Event Ceremony', 'Wedding', 'Day', 'Time Range', 'Venue', 'On-Site Coordinator'],
            events.map((e) => [
              <b>{e.n}</b>,
              weddings[e.w]?.n,
              renderBadge(e.d),
              e.t,
              e.v,
              e.c
            ])
          )}
        </div>
      )}

      {/* VIEW: FULL OPERATIONS DASHBOARD (preserves existing OperationsDashboard) */}
      {currentTab === 'timeline_full' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="rk-btn o s" onClick={() => setCurrentTab('sch')}>
              &larr; Back to Ceremony Schedule
            </button>
          </div>
          <OperationsDashboard />
        </div>
      )}

      {/* VIEW: GUEST MANAGEMENT */}
      {currentTab === 'gst' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Guests</div>
            <h1 style={{ marginTop: '.2rem' }}>Guest Management & RSVP</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Headcount confirmation, transit scheduling, and palace suite allocation.
            </div>
          </div>

          {renderTable(
            'gst',
            ['Guest Name', 'RSVP Status', 'Party Count', 'Arrival', 'Departure', 'Palace Accommodation'],
            guests.map((g) => [
              <b>{g.n}</b>,
              renderBadge(g.st),
              g.p,
              g.a,
              g.d,
              g.ac
            ])
          )}
        </div>
      )}

      {/* VIEW: CLIENT BILLING */}
      {currentTab === 'inv' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="cr">The Royal Knot / Finance</div>
              <h1 style={{ marginTop: '.2rem' }}>Client Billing & Invoicing</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                Contract milestone invoicing, cleared payments, and Maker-Checker approval workflow.
              </div>
            </div>
            <button className="rk-btn o s" onClick={() => setCurrentTab('finance_full')}>
              Open Audited Ledger Engine &rarr;
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Invoiced</span>
              <b>{cr(invoices.reduce((acc, i) => acc + i.a, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Received (Cleared)</span>
              <b>{cr(invoices.reduce((acc, i) => acc + invoicePaid(i), 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Outstanding</span>
              <b>
                {cr(
                  invoices.reduce((acc, i) => acc + i.a, 0) -
                    invoices.reduce((acc, i) => acc + invoicePaid(i), 0)
                )}
              </b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Pending Approval</span>
              <b>{cr(invoices.reduce((acc, i) => acc + invoicePending(i), 0))}</b>
            </div>
          </div>

          <h3 className="sf" style={{ fontSize: '1.3rem', marginTop: '.5rem' }}>
            Milestone Invoices
          </h3>
          {renderTable(
            'inv',
            ['Invoice', 'Wedding', 'Milestone Description', 'Due Date', 'Amount', 'Received', 'Balance', 'Status'],
            invoices.map((i) => [
              i.id,
              weddings[i.w]?.n,
              i.t,
              i.due,
              inr(i.a),
              inr(invoicePaid(i)),
              inr(i.a - invoicePaid(i)),
              renderBadge(invoiceStatus(i))
            ])
          )}

          <h3 className="sf" style={{ fontSize: '1.3rem', marginTop: '.8rem' }}>
            Client Payment Approvals (Maker-Checker Rule)
          </h3>
          <div style={{ color: 'var(--tp)', fontSize: '.8rem', marginBottom: '.4rem' }}>
            A payment remains in Pending status until an authorized user other than the creator approves it.
          </div>
          {renderTable(
            'pay',
            ['Reference', 'Invoice', 'Amount', 'Recorded By', 'Status', 'Action'],
            invoices.flatMap((i) =>
              i.p.map((p) => [p.r, i.id, inr(p.a), p.by, renderBadge(p.s), renderPaymentApprovalAction(p)])
            ),
            false
          )}
        </div>
      )}

      {/* VIEW: VENDOR BILLS & SETTLEMENTS */}
      {currentTab === 'vb' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          {selectedBillIndex !== null ? (
            // Dedicated Bill Reconciliation View
            (() => {
              const b = vendorBills[selectedBillIndex];
              if (!b) return null;
              const calc = billCalc(b);

              return (
                <div>
                  <div className="cr">
                    <a
                      style={{ cursor: 'pointer', textDecoration: 'underline' }}
                      onClick={() => setSelectedBillIndex(null)}
                    >
                      Vendor Bills
                    </a>{' '}
                    / {b.id}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '.6rem 0' }}>
                    <h1 style={{ fontSize: '2rem' }}>Bill Reconciliation — {b.v}</h1>
                    {renderBadge(b.rec)}
                  </div>
                  <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                    {weddings[b.w]?.n} &bull; Delivery Reconciliation & Dispute Management
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', margin: '1rem 0' }}>
                    <div className="rk-card">
                      <h3 className="sf" style={{ fontSize: '1.25rem' }}>
                        Original Agreement Baseline
                      </h3>
                      <div className="sf" style={{ fontSize: '2rem', color: 'var(--ink)', margin: '.4rem 0' }}>
                        {inr(b.ag)}
                      </div>
                      <div style={{ color: 'var(--tp)', fontSize: '.78rem' }}>
                        Quotation baseline agreed at award contract
                      </div>
                    </div>

                    <div className="rk-card">
                      <h3 className="sf" style={{ fontSize: '1.25rem' }}>
                        Submitted Final Vendor Bill
                      </h3>
                      <div className="sf" style={{ fontSize: '2rem', color: 'var(--ink)', margin: '.4rem 0' }}>
                        {inr(calc.submittedTotal)}
                      </div>
                      {b.ch.length > 0 ? (
                        b.ch.map((charge, cIdx) => (
                          <div
                            key={cIdx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '.4rem 0',
                              borderBottom: '1px solid #F1EBDF'
                            }}
                          >
                            <div>
                              <div style={{ fontSize: '.85rem' }}>{charge.d}</div>
                              <div style={{ color: 'var(--tp)', fontSize: '.78rem' }}>{inr(charge.a)}</div>
                            </div>
                            {charge.ap ? (
                              renderBadge('Approved')
                            ) : (
                              <button
                                className="rk-btn s"
                                onClick={() => {
                                  setVendorBills((prev) =>
                                    prev.map((item, idx) =>
                                      idx === selectedBillIndex
                                        ? {
                                            ...item,
                                            ch: item.ch.map((c, i) => (i === cIdx ? { ...c, ap: true } : c))
                                          }
                                        : item
                                    )
                                  );
                                  logActivity(`Additional charge approved on ${b.id}`);
                                  triggerToast('Additional charge approved (counted once)');
                                }}
                              >
                                Approve
                              </button>
                            )}
                          </div>
                        ))
                      ) : (
                        <div style={{ color: 'var(--tp)', fontSize: '.8rem' }}>No additional charges submitted</div>
                      )}
                    </div>
                  </div>

                  {/* Reconciliation Result */}
                  <div className="rk-card">
                    <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.6rem' }}>
                      Reconciliation Result
                    </h3>
                    {[
                      ['Agreed Baseline Amount', inr(b.ag)],
                      ['Approved Additions', inr(calc.approvedAdditions)],
                      ['Total Authorized Payable', inr(calc.total)],
                      ['Paid (Cleared)', inr(calc.paid)],
                      ['Remaining Payable Balance', <b>{inr(calc.remaining)}</b>]
                    ].map(([label, val]: any, rIdx) => (
                      <div
                        key={rIdx}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          padding: '.45rem 0',
                          borderBottom: '1px solid #F1EBDF',
                          fontSize: '.85rem'
                        }}
                      >
                        <span>{label}</span>
                        <span>{val}</span>
                      </div>
                    ))}

                    <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.2rem' }}>
                      <button
                        className="rk-btn"
                        disabled={b.rec === 'Reconciled'}
                        onClick={() => {
                          setVendorBills((prev) =>
                            prev.map((item, idx) =>
                              idx === selectedBillIndex ? { ...item, rec: 'Reconciled' } : item
                            )
                          );
                          logActivity(`Bill ${b.id} marked reconciled`);
                          triggerToast(`Bill ${b.id} marked reconciled`);
                        }}
                      >
                        Mark Reconciled
                      </button>
                      <button
                        className="rk-btn o"
                        onClick={() => {
                          setVendorBills((prev) =>
                            prev.map((item, idx) =>
                              idx === selectedBillIndex ? { ...item, rec: 'Flagged' } : item
                            )
                          );
                          logActivity(`Discrepancy flagged on bill ${b.id}`);
                          triggerToast(`Discrepancy flagged on bill ${b.id}`);
                        }}
                      >
                        Flag Discrepancy
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            // Vendor Bills Table
            <div>
              <div className="cr">The Royal Knot / Procurement</div>
              <h1 style={{ marginTop: '.2rem' }}>Vendor Bills & Settlements</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem', marginBottom: '1rem' }}>
                Delivery reconciliation, additional charge verification, and vendor settlements.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div className="rk-card kpi hov">
                  <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Commitments</span>
                  <b>{cr(vendorBills.reduce((acc, b) => acc + b.ag, 0))}</b>
                </div>
                <div className="rk-card kpi hov">
                  <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Advances Paid</span>
                  <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).paid, 0))}</b>
                </div>
                <div className="rk-card kpi hov">
                  <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Outstanding Payables</span>
                  <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).remaining, 0))}</b>
                </div>
                <div className="rk-card kpi hov">
                  <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Pending Approval</span>
                  <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).pending, 0))}</b>
                </div>
              </div>

              {renderTable(
                'vb',
                ['Bill ID', 'Vendor', 'Wedding', 'Agreed Baseline', 'Add. Charges (Approved)', 'Paid (Cleared)', 'Balance', 'Status', ''],
                vendorBills.map((b, idx) => {
                  const calc = billCalc(b);
                  return [
                    b.id,
                    <b>{b.v}</b>,
                    weddings[b.w]?.n,
                    inr(b.ag),
                    inr(calc.approvedAdditions),
                    inr(calc.paid),
                    inr(calc.remaining),
                    renderBadge(b.rec),
                    <button className="rk-btn o s" onClick={() => setSelectedBillIndex(idx)}>
                      Reconcile
                    </button>
                  ];
                })
              )}

              <h3 className="sf" style={{ fontSize: '1.3rem', marginTop: '1.2rem' }}>
                Vendor Payment Approvals (Maker-Checker Rule)
              </h3>
              {renderTable(
                'vpa',
                ['Reference', 'Bill ID', 'Payment Type', 'Amount', 'Created By', 'Status', 'Action'],
                vendorBills.flatMap((b) =>
                  b.p.map((p) => [p.r, b.id, p.ty, inr(p.a), p.by, renderBadge(p.s), renderPaymentApprovalAction(p)])
                ),
                false
              )}
            </div>
          )}
        </div>
      )}

      {/* VIEW: EXPENSE LEDGER */}
      {currentTab === 'led' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Finance</div>
            <h1 style={{ marginTop: '.2rem' }}>Authoritative Expense Ledger</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Double-entry audited cash movements with strict cleared vs accrual distinction.
            </div>
          </div>

          {(() => {
            const rows = [
              ...invoices.flatMap((i) =>
                i.p.map((p) => ({
                  d: i.due,
                  r: p.r,
                  w: weddings[i.w]?.n,
                  t: 'Client Payment',
                  x: i.t,
                  pa: weddings[i.w]?.n.replace('The ', ''),
                  in: p.a,
                  out: 0,
                  s: p.s,
                  by: p.by
                }))
              ),
              ...vendorBills.flatMap((b) =>
                b.p.map((p) => ({
                  d: '2026-10-24',
                  r: p.r,
                  w: weddings[b.w]?.n,
                  t: 'Vendor ' + p.ty,
                  x: b.id,
                  pa: b.v,
                  in: 0,
                  out: p.a,
                  s: p.s,
                  by: p.by
                }))
              ),
              ...workLogs.map((l, idx) => ({
                d: '2026-10-28',
                r: `WL-${idx + 1}`,
                w: weddings[l.w]?.n,
                t: 'Direct Labor',
                x: l.d,
                pa: l.e,
                in: 0,
                out: l.h * l.r,
                s: 'Cleared',
                by: l.e
              }))
            ];

            const clearedRows = rows.filter((r) => r.s === 'Cleared');

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div className="rk-card kpi hov">
                    <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Money In (Cleared)</span>
                    <b>{cr(clearedRows.reduce((acc, r) => acc + r.in, 0))}</b>
                  </div>
                  <div className="rk-card kpi hov">
                    <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Money Out (Cleared)</span>
                    <b>{cr(clearedRows.reduce((acc, r) => acc + r.out, 0))}</b>
                  </div>
                  <div className="rk-card kpi hov">
                    <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Receivables</span>
                    <b>
                      {cr(
                        invoices.reduce((acc, i) => acc + i.a, 0) -
                          invoices.reduce((acc, i) => acc + invoicePaid(i), 0)
                      )}
                    </b>
                  </div>
                  <div className="rk-card kpi hov">
                    <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Payables</span>
                    <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).remaining, 0))}</b>
                  </div>
                </div>

                {renderTable(
                  'led',
                  ['Date', 'Reference', 'Wedding', 'Transaction Type', 'Description', 'Party', 'Money In', 'Money Out', 'Status', 'Recorded By'],
                  rows.map((r) => [
                    r.d,
                    r.r,
                    r.w,
                    r.t,
                    r.x,
                    r.pa,
                    r.in > 0 ? inr(r.in) : '—',
                    r.out > 0 ? inr(r.out) : '—',
                    renderBadge(r.s),
                    r.by
                  ])
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* VIEW: FULL FINANCIAL LEDGER MODULE (preserves existing FinanceLedgerPage) */}
      {currentTab === 'finance_full' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="rk-btn o s" onClick={() => setCurrentTab('inv')}>
              &larr; Back to Client Billing
            </button>
          </div>
          <FinanceLedgerPage />
        </div>
      )}

      {/* VIEW: FINANCE OVERVIEW */}
      {currentTab === 'fin' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Finance</div>
            <h1 style={{ marginTop: '.2rem' }}>Financial Executive Overview</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Consolidated treasury cash flow, contract milestones, and operating margins.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Contract Value</span>
              <b>{cr(weddings.reduce((acc, w) => acc + w.c, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Invoiced</span>
              <b>{cr(invoices.reduce((acc, i) => acc + i.a, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Collected</span>
              <b>{cr(invoices.reduce((acc, i) => acc + invoicePaid(i), 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Client Outstanding</span>
              <b>
                {cr(
                  invoices.reduce((acc, i) => acc + i.a, 0) -
                    invoices.reduce((acc, i) => acc + invoicePaid(i), 0)
                )}
              </b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Vendor Commitments</span>
              <b>{cr(vendorBills.reduce((acc, b) => acc + b.ag, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Vendor Paid</span>
              <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).paid, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Vendor Outstanding</span>
              <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).remaining, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Estimated Profit</span>
              <b>
                {cr(
                  invoices.reduce((acc, i) => acc + invoicePaid(i), 0) -
                    vendorBills.reduce((acc, b) => acc + billCalc(b).paid, 0)
                )}
              </b>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TEAM WORK LOGS */}
      {currentTab === 'wl' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Analytics</div>
            <h1 style={{ marginTop: '.2rem' }}>Team Work Logs & Labour Costs</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Coordinators and planners hourly logged time and internal cost absorption.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Logged Hours</span>
              <b>{workLogs.reduce((acc, l) => acc + l.h, 0)} hrs</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Total Labour Cost</span>
              <b>{inr(workLogs.reduce((acc, l) => acc + l.h * l.r, 0))}</b>
            </div>
          </div>

          {renderTable(
            'wl',
            ['Team Member', 'Wedding Project', 'Task Description', 'Hours Logged', 'Hourly Rate', 'Total Cost'],
            workLogs.map((l) => [
              <b>{l.e}</b>,
              weddings[l.w]?.n,
              l.d,
              `${l.h} hrs`,
              inr(l.r) + '/hr',
              <b>{inr(l.h * l.r)}</b>
            ])
          )}
        </div>
      )}

      {/* VIEW: FOUNDER STRATEGIC ANALYTICS */}
      {currentTab === 'fa' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div className="cr">The Royal Knot / Founder Analytics</div>
              <h1 style={{ marginTop: '.2rem' }}>Strategic Season Review</h1>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
                Executive intelligence, anomalies radar, and per-wedding profitability margins.
              </div>
            </div>
            <button className="rk-btn o s" onClick={() => setCurrentTab('founder_full')}>
              Open Full Founder Analytics Engine &rarr;
            </button>
          </div>

          {/* KPI Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Season Revenue (Cleared)</span>
              <b>{cr(invoices.reduce((acc, i) => acc + invoicePaid(i), 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Receivables Due</span>
              <b>
                {cr(
                  invoices.reduce((acc, i) => acc + i.a, 0) -
                    invoices.reduce((acc, i) => acc + invoicePaid(i), 0)
                )}
              </b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Payables Due</span>
              <b>{cr(vendorBills.reduce((acc, b) => acc + billCalc(b).remaining, 0))}</b>
            </div>
            <div className="rk-card kpi hov">
              <span style={{ color: 'var(--tp)', fontSize: '.78rem' }}>Average Wedding Value</span>
              <b>{cr(weddings.reduce((acc, w) => acc + w.c, 0) / (weddings.length || 1))}</b>
            </div>
          </div>

          {/* Profit Trend & Anomalies */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.8rem' }}>
                Monthly Profit Trend (₹ Lakhs)
              </h3>
              <div className="col-chart">
                {[6, 12, 13, 8, 14, 19].map((profit, idx) => (
                  <div key={idx}>
                    <i
                      title={`Month ${idx + 1} Profit: ${profit}L`}
                      style={{ height: `${(profit / 20) * 100}%`, background: '#4F7A57' }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', color: 'var(--tp)', fontSize: '.75rem', marginTop: '.4rem' }}>
                {['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m) => (
                  <span key={m} style={{ flex: 1, textAlign: 'center' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>

            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.25rem', marginBottom: '.8rem' }}>
                Anomalies & Discrepancies Radar
              </h3>
              {attentionItems.filter((a) => /unreconciled|Overdue|Discrepancy/i.test(a)).length > 0 ? (
                attentionItems
                  .filter((a) => /unreconciled|Overdue|Discrepancy/i.test(a))
                  .map((alert, idx) => (
                    <div
                      key={idx}
                      style={{ padding: '.4rem 0', borderBottom: '1px solid #F1EBDF', fontSize: '.8rem' }}
                    >
                      ⚠ {alert}
                    </div>
                  ))
              ) : (
                <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>No financial anomalies detected.</div>
              )}
            </div>
          </div>

          {/* Visual Data Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {/* Destination Cities Distribution */}
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>
                Destination Portfolio by City
              </h3>
              <div style={{ display: 'grid', gap: '.6rem' }}>
                {['Udaipur', 'Jaipur', 'Jodhpur'].map((city) => {
                  const count = weddings.filter((w) => (w.d || '').toLowerCase().includes(city.toLowerCase())).length;
                  const pct = weddings.length ? Math.round((count / weddings.length) * 100) : 0;
                  return (
                    <div key={city}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.2rem' }}>
                        <b>{city}</b>
                        <span style={{ color: 'var(--tp)' }}>{count} celebrations ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: '#FAF6EE', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'var(--gold)' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Enquiry Pipeline Distribution */}
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.2rem', marginBottom: '.6rem' }}>
                Enquiry Acquisition Channel
              </h3>
              <div style={{ display: 'grid', gap: '.6rem' }}>
                {['Referral', 'Instagram', 'Wedding fair', 'Website'].map((src) => {
                  const count = enquiries.filter((e) => (e.s || '').toLowerCase().includes(src.toLowerCase())).length;
                  const pct = enquiries.length ? Math.round((count / enquiries.length) * 100) : 0;
                  return (
                    <div key={src}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.8rem', marginBottom: '.2rem' }}>
                        <b>{src}</b>
                        <span style={{ color: 'var(--tp)' }}>{count} leads ({pct}%)</span>
                      </div>
                      <div style={{ height: '6px', background: '#FAF6EE', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#4F7A57' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <h3 className="sf" style={{ fontSize: '1.3rem', marginTop: '.8rem' }}>
            Per-Wedding Profitability & Margin Analysis
          </h3>
          {renderTable(
            'fa',
            ['Wedding Project', 'City', 'Contract Value', 'Cleared Revenue', 'Vendor Costs', 'Labour Costs', 'Estimated Profit', 'Net Margin'],
            weddings.map((w) => {
              const vc = vendorBills
                .filter((b) => b.w === w.id)
                .reduce((acc, b) => acc + billCalc(b).total, 0);
              const lc = workLogs
                .filter((l) => l.w === w.id)
                .reduce((acc, l) => acc + l.h * l.r, 0);
              const rv = invoices
                .filter((i) => i.w === w.id)
                .reduce((acc, i) => acc + invoicePaid(i), 0);
              const pr = rv - vc - lc;
              const margin = rv > 0 ? Math.round((pr / rv) * 100) + '%' : '—';
              return [
                <b>{w.n}</b>,
                w.d,
                inr(w.c),
                inr(rv),
                inr(vc),
                inr(lc),
                <b>{inr(pr)}</b>,
                <span className={`bd ${pr >= 0 ? 'b-ok' : 'b-er'}`}>{margin}</span>
              ];
            })
          )}
        </div>
      )}

      {/* VIEW: FULL FOUNDER ANALYTICS (preserves existing FounderAnalyticsPage) */}
      {currentTab === 'founder_full' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="rk-btn o s" onClick={() => setCurrentTab('fa')}>
              &larr; Back to Strategic Season Review
            </button>
          </div>
          <FounderAnalyticsPage />
        </div>
      )}

      {/* VIEW: TEAM & USERS */}
      {currentTab === 'usr' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Administration</div>
            <h1 style={{ marginTop: '.2rem' }}>Team & Users</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Active planners, coordinators, and corporate administrators.
            </div>
          </div>

          {renderTable(
            'usr',
            ['Name', 'Assigned Role', 'Department', 'Account Status', 'Last Activity'],
            [
              [<b>Aditi Rao</b>, 'Founder', 'Executive Office', renderBadge('Active'), 'Today'],
              [<b>Rohan Mehta</b>, 'Finance Director', 'Finance & Audit', renderBadge('Active'), 'Today'],
              [<b>Kabir Singh</b>, 'Procurement Coordinator', 'Operations & Logistics', renderBadge('Active'), 'Today'],
              [<b>Naina Kapoor</b>, 'Lead Planner', 'Client & Venue Planning', renderBadge('Active'), 'Today'],
              [<b>System Administrator</b>, 'Admin', 'Information Systems', renderBadge('Active'), 'Today']
            ]
          )}
        </div>
      )}

      {/* VIEW: ROLES & PERMISSIONS */}
      {currentTab === 'rol' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Administration</div>
            <h1 style={{ marginTop: '.2rem' }}>Roles & RBAC Permissions Matrix</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              Cryptographically verified RBAC permissions across all five system roles.
            </div>
          </div>

          {renderTable(
            'rol',
            ['Permission Key', 'Founder', 'Admin', 'Finance', 'Procurement', 'Planner'],
            [
              [<code>crm:enquiry:create</code>, '✓', '✓', '—', '✓', '✓'],
              [<code>weddings:wedding:create</code>, '✓', '✓', '—', '✓', '✓'],
              [<code>procurement:vendor:create</code>, '✓', '✓', '—', '✓', '—'],
              [<code>procurement:rfq:award</code>, '✓', '✓', '—', '✓', '—'],
              [<code>finance:payment:record</code>, '✓', '✓', '✓', '—', '—'],
              [<code>finance:payment:approve</code>, '✓', '✓', '✓', '—', '—'],
              [<code>finance:ledger:read</code>, '✓', '✓', '✓', '—', '—'],
              [<code>finance:anomalies:read</code>, '✓', '—', '✓', '—', '—'],
              [<code>analytics:treasury:read</code>, '✓', '✓', '—', '—', '—']
            ],
            false
          )}
        </div>
      )}

      {/* VIEW: SETTINGS */}
      {currentTab === 'set' && (
        <div style={{ display: 'grid', gap: '1.2rem' }}>
          <div>
            <div className="cr">The Royal Knot / Administration</div>
            <h1 style={{ marginTop: '.2rem' }}>Agency Settings</h1>
            <div style={{ color: 'var(--tp)', fontSize: '.82rem' }}>
              System parameters, financial formatting preferences, and notifications.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.2rem' }}>
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.3rem' }}>Agency Profile</h3>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem', marginTop: '.3rem' }}>
                The Royal Knot Weddings &bull; Jaipur, Udaipur, Jodhpur &bull; Rajputana Luxury Hospitality Group
              </div>
            </div>
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.3rem' }}>Wedding Seasons</h3>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem', marginTop: '.3rem' }}>
                Active Season: 2026–2027 &bull; Oct–Mar Peak Royal Calendar
              </div>
            </div>
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.3rem' }}>Currency & Precision</h3>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem', marginTop: '.3rem' }}>
                Currency: INR (₹) &bull; Lakh / Crore Indian Numeral System &bull; Integer BigInt Paise
              </div>
            </div>
            <div className="rk-card">
              <h3 className="sf" style={{ fontSize: '1.3rem' }}>Maker-Checker Dual Control</h3>
              <div style={{ color: 'var(--tp)', fontSize: '.82rem', marginTop: '.3rem' }}>
                Active &bull; Requires distinct user approval on client payments and vendor settlements.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: DEMO DATA EXPLORER */}
      {currentTab === 'explorer' && (
        <DemoDataExplorer onNavigateTab={(tab) => setCurrentTab(tab)} />
      )}
    </>
  )}

      {/* Quick Create Modals */}
      {activeCreateModal === 'Enquiry' && (
        <EnquiryModal
          isOpen={true}
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => {
            setActiveCreateModal(null);
            fetchLiveDatabaseRecords();
            triggerToast('Client enquiry successfully registered in database!');
          }}
        />
      )}

      {activeCreateModal === 'Wedding' && (
        <WeddingCreationModal
          isOpen={true}
          couples={liveCouples}
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => {
            setActiveCreateModal(null);
            fetchLiveDatabaseRecords();
            triggerToast('Luxury wedding project created with milestone checklist!');
          }}
        />
      )}

      {activeCreateModal === 'Vendor' && (
        <CreateVendorModal
          isOpen={true}
          onClose={() => setActiveCreateModal(null)}
          onVendorCreated={() => {
            setActiveCreateModal(null);
            fetchLiveDatabaseRecords();
            triggerToast('Vendor profile registered in procurement directory!');
          }}
        />
      )}

      {activeCreateModal === 'RFQ' && (
        <CreateRfqModal
          isOpen={true}
          weddings={weddings.map((w) => ({
            id: (w as any).dbId || String(w.id),
            title: w.n,
            targetGuestCount: w.g
          }))}
          vendors={vendors.map((v) => ({
            id: (v as any).id || v.n,
            businessName: v.n,
            category: (v.c as any) || 'CATERING',
            city: v.ct
          }))}
          onClose={() => setActiveCreateModal(null)}
          onRfqCreated={() => {
            setActiveCreateModal(null);
            fetchLiveDatabaseRecords();
            triggerToast('RFQ Package successfully issued to vendors!');
          }}
        />
      )}

      {activeCreateModal === 'Task' && (
        <CustomTaskModal
          isOpen={true}
          weddingId={(weddings[selectedWeddingId ?? 0] as any)?.dbId || (weddings.find((item: any) => !!item.dbId) as any)?.dbId || ''}
          weddingTitle={weddings[selectedWeddingId ?? 0]?.n || 'The Royal Knot Wedding'}
          teamMembers={teamMembers}
          onClose={() => setActiveCreateModal(null)}
          onSuccess={() => {
            setActiveCreateModal(null);
            fetchLiveDatabaseRecords();
            triggerToast('Operational milestone task assigned and logged!');
          }}
        />
      )}

      {/* FEATURE 2: BUDGET IMPACT SIMULATOR DRAWER */}
      <BudgetSimulatorDrawer
        weddingId={(weddings[selectedWeddingId ?? 0] as any)?.dbId || (weddings.find((item: any) => !!item.dbId) as any)?.dbId || ''}
        weddingTitle={weddings[selectedWeddingId ?? 0]?.n || 'The Royal Knot Wedding'}
        isOpen={budgetSimulatorOpen}
        onClose={() => setBudgetSimulatorOpen(false)}
      />

      {/* FEATURE 4: CONTINGENCY & BACKUP PLANNER MODAL */}
      <ContingencyPlannerModal
        weddingId={
          ((weddings[selectedWeddingId ?? 0] as any)?.dbId && (weddings[selectedWeddingId ?? 0] as any)?.dbId !== 'wed-demo-01')
            ? (weddings[selectedWeddingId ?? 0] as any).dbId
            : ((weddings.find((item: any) => !!item.dbId && item.dbId !== 'wed-demo-01') as any)?.dbId || (weddings[0] as any)?.dbId || '')
        }
        weddingTitle={weddings[selectedWeddingId ?? 0]?.n || 'The Royal Knot Wedding'}
        isOpen={contingencyModalOpen}
        onClose={() => setContingencyModalOpen(false)}
        teamMembers={teamMembers}
        vendors={vendors}
        onContingencyChanged={() => fetchLiveDatabaseRecords()}
      />

      {/* FEATURE 5: VENDOR RELIABILITY INTELLIGENCE MODAL */}
      {selectedReliabilityVendor && (
        <VendorReliabilityModal
          vendorId={selectedReliabilityVendor.id}
          vendorName={selectedReliabilityVendor.name}
          isOpen={true}
          onClose={() => setSelectedReliabilityVendor(null)}
        />
      )}

      {/* FEATURE 3: GUEST CONCIERGE QR PORTAL PREVIEW MODAL */}
      {previewPortalToken && (
        <div id="guest-portal-overlay-container" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#FAF6EE', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <GuestPortalPage
            token={previewPortalToken}
            onBackToApp={() => setPreviewPortalToken(null)}
          />
        </div>
      )}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    </QueryClientProvider>
  );
};

const AuthConsumer: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'var(--gold)',
            display: 'grid',
            placeItems: 'center',
            color: '#fff',
            fontSize: '1.4rem',
            marginBottom: '1rem'
          }}
        >
          ◈
        </div>
        <div className="sf" style={{ fontSize: '1.8rem', color: 'var(--ink)' }}>
          The Royal Knot
        </div>
        <div style={{ color: 'var(--tp)', fontSize: '.75rem', letterSpacing: '.2em', textTransform: 'uppercase', marginTop: '.3rem' }}>
          Initializing Luxury Operations System...
        </div>
      </div>
    );
  }

  // Check if viewing public guest portal via QR URL path /portal/:token
  const path = window.location.pathname;
  if (path.startsWith('/portal/')) {
    const token = path.replace('/portal/', '');
    return <GuestPortalPage token={token} onBackToApp={() => { window.location.pathname = '/'; }} />;
  }

  // When unauthenticated, show the full scroll-driven landing page
  if (!user) {
    return <LandingPage />;
  }

  // When authenticated, render the full workspace
  return <MainDashboard />;
};

export default App;

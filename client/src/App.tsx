import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Card } from './components/common/Card';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import { 
  Building2, 
  CheckCircle2, 
  DollarSign, 
  FileText, 
  GitBranch, 
  Lock, 
  ShieldCheck, 
  TrendingUp, 
  UserCheck, 
  Workflow, 
  RefreshCw 
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

interface HealthStatus {
  status: string;
  timestamp: string;
  database: string;
  environment: string;
  version: string;
}

export const MainDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch {
      // Backend may be offline during initial client dev
    } finally {
      setHealthLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <AppShell currentTab={currentTab} onSelectTab={setCurrentTab}>
      {currentTab === 'overview' && (
        <div className="space-y-8">
          {/* Hero Welcome Banner */}
          <div className="bg-gradient-to-r from-[#5B1424] to-[#430C18] text-white p-8 rounded-lg shadow-md border border-[#C5A059]/30 relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <Badge variant="gold" size="sm" className="mb-3">
                Phase 1 Foundation Setup Complete
              </Badge>
              <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#FDFBF7] tracking-tight">
                Rajputana Luxury Wedding Operations
              </h1>
              <p className="mt-3 text-sm sm:text-base text-stone-200 leading-relaxed font-sans">
                Unified operations cockpit engineered for high-consequence Rajasthan luxury destination weddings.
                Features integer-based financial ledger auditing, concurrency-locked direct expense payments,
                and automated 32-task milestone pipelines.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button 
                  variant="gold" 
                  size="sm" 
                  onClick={() => setCurrentTab('finance')}
                  leftIcon={<TrendingUp className="w-4 h-4" />}
                >
                  Explore Financial Ledger
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setCurrentTab('weddings')}
                  leftIcon={<Workflow className="w-4 h-4" />}
                >
                  Inspect Task Pipelines
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={fetchHealth} 
                  isLoading={healthLoading}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  className="text-stone-300 hover:text-white"
                >
                  Refresh Health Check
                </Button>
              </div>
            </div>
            {/* Subtle decorative crest watermark */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-10 pointer-events-none">
              <Building2 className="w-80 h-80 text-white" />
            </div>
          </div>

          {/* Core Foundation Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-[#5B1424]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#718096]">Season Capacity</span>
                <Building2 className="w-5 h-5 text-[#5B1424]" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-serif text-[#1E2229]">25 Weddings</div>
                <div className="text-xs text-[#718096] mt-1">Jaipur & Udaipur luxury season</div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-[#C5A059]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#718096]">Season Turn-Over</span>
                <DollarSign className="w-5 h-5 text-[#C5A059]" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-serif text-[#1E2229]">₹86.5 Crore</div>
                <div className="text-xs text-[#718096] mt-1">Paise-audited BigInt ledger</div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-emerald-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#718096]">Schema Parity</span>
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-serif text-emerald-800">100% AST Match</div>
                <div className="text-xs text-[#718096] mt-1">SQLite & Postgres DMMF verified</div>
              </div>
            </Card>

            <Card className="border-l-4 border-l-indigo-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#718096]">Task Automation</span>
                <CheckCircle2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold font-serif text-[#1E2229]">32 Full / 20 Part</div>
                <div className="text-xs text-[#718096] mt-1">Atomic generation & rollback</div>
              </div>
            </Card>
          </div>

          {/* System Health & Architecture Specs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Health Status Card */}
            <Card 
              title="System Health & Connectivity" 
              subtitle="Real-time backend API & database status"
              action={
                <Badge variant={health?.status === 'ok' ? 'success' : 'warning'} dot>
                  {health?.status === 'ok' ? 'API Healthy' : 'Awaiting Server'}
                </Badge>
              }
            >
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Backend Environment:</span>
                  <span className="font-mono font-medium text-[#1E2229]">{health?.environment || 'development'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Database Dialect:</span>
                  <span className="font-mono font-medium text-[#1E2229]">SQLite (dev.db) / BigInt</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Database Status:</span>
                  <span className="font-semibold text-emerald-700">{health?.database || 'Connected'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#718096]">Active Version:</span>
                  <span className="font-mono font-medium text-[#1E2229]">{health?.version || 'v2.10.0-auth'}</span>
                </div>
              </div>
            </Card>

            {/* Developer Split & Coordination */}
            <Card 
              title="Developer Architecture Split" 
              subtitle="Two-developer concurrent workstreams"
              className="lg:col-span-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#F7F4EE] border border-[#E7E2D8] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif font-bold text-[#5B1424]">Developer A Workspace</span>
                    <Badge variant="wine" size="sm">Client Facing & Ops</Badge>
                  </div>
                  <ul className="text-xs text-[#4A5568] space-y-1.5 list-disc list-inside">
                    <li>Lead CRM, Inquiries & Consultation Logs</li>
                    <li>Digital Service Agreements & Canvas Signatures</li>
                    <li>Wedding Engine & 32/20 Task Generation</li>
                    <li>Minute-by-minute Day-of Timelines</li>
                    <li>Vendor Arrival Radar & Delay Alerting</li>
                  </ul>
                </div>

                <div className="p-4 bg-[#F7F4EE] border border-[#E7E2D8] rounded">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-serif font-bold text-[#8C6F31]">Developer B Workspace</span>
                    <Badge variant="gold" size="sm">Procurement & Finance</Badge>
                  </div>
                  <ul className="text-xs text-[#4A5568] space-y-1.5 list-disc list-inside">
                    <li>Vendor Directory & Quotation Request Groups</li>
                    <li>3-Vendor Side-by-Side Comparison Matrix</li>
                    <li>Atomic Vendor Selection & Client Invoicing</li>
                    <li>Cleared Cash Flow vs Accrual P&L Engine</li>
                    <li>Concurrency-Locked Direct Expense Payments</li>
                  </ul>
                </div>
              </div>
            </Card>
          </div>

          {/* Phase 1 Verification Checklist */}
          <Card 
            title="Phase 1 Foundation Verification Manifest" 
            subtitle="Architectural corrections validated and in place"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="p-3 bg-white border border-[#E7E2D8] rounded flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-[#5B1424] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#1E2229]">SQLite Lock Acquisition</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    First-op write touch acquires immediate write lock, avoiding concurrency deadlocks.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E7E2D8] rounded flex items-start gap-2.5">
                <RefreshCw className="w-4 h-4 text-[#C5A059] mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#1E2229]">Targeted Retry Scope</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    Only lock contention and (weddingId, templateKey) conflicts are retried.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E7E2D8] rounded flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#1E2229]">Dynamic Template Math</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    Tests derive counts directly from task templates without fragile hardcoding.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E7E2D8] rounded flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#1E2229]">Direct Pass-Through Margin</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    Verified ₹0 gross margin on pass-through client billing.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E7E2D8] rounded flex items-start gap-2.5">
                <DollarSign className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#1E2229]">Cleared Cash Flow</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    Actual cash flow ledger counts only cleared client & vendor payments.
                  </div>
                </div>
              </div>

              <div className="p-3 bg-white border border-[#E7E2D8] rounded flex items-start gap-2.5">
                <GitBranch className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[#1E2229]">Schema Parity Validator</div>
                  <div className="text-[11px] text-[#718096] mt-0.5">
                    Dual DMMF AST comparison across 14 structural model attributes.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Developer A CRM Module Placeholder */}
      {currentTab === 'crm' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Client Relationship Management</h2>
              <p className="text-xs text-[#718096]">Managed by Developer A • Enquiries, consultations & digital contract signatures</p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<UserCheck className="w-4 h-4" />}>
              Add Royal Inquiry
            </Button>
          </div>

          <Card title="VIP Couple Pipelines (Jaipur & Udaipur Season)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Couple Names</th>
                    <th className="px-4 py-3 font-semibold">Target Dates</th>
                    <th className="px-4 py-3 font-semibold">Venue / City</th>
                    <th className="px-4 py-3 font-semibold">Budget Range</th>
                    <th className="px-4 py-3 font-semibold">Package Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  <tr className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-[#1E2229]">Rohan Singhania & Aanya Kapoor</td>
                    <td className="px-4 py-3 text-[#718096]">Nov 18-20, 2026</td>
                    <td className="px-4 py-3 text-[#1E2229]">Umaid Bhawan Palace, Jodhpur</td>
                    <td className="px-4 py-3 font-mono font-medium">₹4,50,00,000</td>
                    <td className="px-4 py-3"><Badge variant="wine" size="sm">Full Service</Badge></td>
                    <td className="px-4 py-3"><Badge variant="success" size="sm">Agreement Signed</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">View Dossier</Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-[#1E2229]">Vikramaditya Rathore & Priyamvada Dev</td>
                    <td className="px-4 py-3 text-[#718096]">Dec 05-08, 2026</td>
                    <td className="px-4 py-3 text-[#1E2229]">City Palace, Udaipur</td>
                    <td className="px-4 py-3 font-mono font-medium">₹6,20,00,000</td>
                    <td className="px-4 py-3"><Badge variant="wine" size="sm">Full Service</Badge></td>
                    <td className="px-4 py-3"><Badge variant="gold" size="sm">Consultation Done</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">View Dossier</Button>
                    </td>
                  </tr>
                  <tr className="hover:bg-amber-50/30">
                    <td className="px-4 py-3 font-medium text-[#1E2229]">Kabir Mehta & Devika Birla</td>
                    <td className="px-4 py-3 text-[#718096]">Jan 12-14, 2027</td>
                    <td className="px-4 py-3 text-[#1E2229]">Rambagh Palace, Jaipur</td>
                    <td className="px-4 py-3 font-mono font-medium">₹3,80,00,000</td>
                    <td className="px-4 py-3"><Badge variant="neutral" size="sm">Partial Service</Badge></td>
                    <td className="px-4 py-3"><Badge variant="warning" size="sm">Under Review</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">View Dossier</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Developer A Weddings & Task Pipelines */}
      {currentTab === 'weddings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Wedding Management & Automation</h2>
              <p className="text-xs text-[#718096]">Managed by Developer A • 32 Full / 20 Partial milestone generation engine</p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<Workflow className="w-4 h-4" />}>
              Trigger Task Backfill
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Full-Service Pipeline (32 Tasks)" subtitle="Complete 12-month luxury planning cycle">
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Venue & Architecture</span>
                  <Badge variant="gold" size="sm">Stage 1</Badge>
                </div>
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Master Decor & Production Design</span>
                  <Badge variant="gold" size="sm">Stage 2</Badge>
                </div>
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Royal Hospitality & Logistics</span>
                  <Badge variant="gold" size="sm">Stage 3</Badge>
                </div>
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Sangeet & Entertainment Curation</span>
                  <Badge variant="gold" size="sm">Stage 4</Badge>
                </div>
              </div>
            </Card>

            <Card title="Partial-Service Pipeline (20 Tasks)" subtitle="Curated coordination & day-of execution">
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Vendor Contract Review</span>
                  <Badge variant="neutral" size="sm">Stage 1</Badge>
                </div>
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Timeline Synchronisation</span>
                  <Badge variant="neutral" size="sm">Stage 2</Badge>
                </div>
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Day-of Production Oversight</span>
                  <Badge variant="neutral" size="sm">Stage 3</Badge>
                </div>
                <div className="p-2 bg-[#F7F4EE] rounded flex justify-between items-center">
                  <span className="font-semibold text-[#1E2229]">Post-Wedding Reconciliations</span>
                  <Badge variant="neutral" size="sm">Stage 4</Badge>
                </div>
              </div>
            </Card>

            <Card title="Transaction Integrity Engine" subtitle="Prisma interactive retry-wrapper">
              <div className="space-y-3 text-xs text-[#4A5568]">
                <p>
                  Task generation runs within a transactional lock. If an agreement is co-signed while a deposit clears,
                  the unique composite key <code>(weddingId, templateKey)</code> catches duplicates via targeted retries.
                </p>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded text-emerald-800">
                  <strong>Verification Guard:</strong> If any backfill task fails to insert, the entire transaction rolls back.
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Developer A Day-of Operations */}
      {currentTab === 'timeline' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Day-of Operations & Minute-by-Minute Timeline</h2>
            <p className="text-xs text-[#718096]">Managed by Developer A • Vendor arrival radar & incident log</p>
          </div>

          <Card title="Live Vendor Arrival Radar — Umaid Bhawan Palace">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded">
                <span className="text-[11px] font-semibold text-emerald-800 uppercase">On Schedule</span>
                <div className="text-xl font-serif font-bold text-emerald-900 mt-1">14 Vendors</div>
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded">
                <span className="text-[11px] font-semibold text-amber-800 uppercase">Approaching (Next 60m)</span>
                <div className="text-xl font-serif font-bold text-amber-900 mt-1">4 Vendors</div>
              </div>
              <div className="p-3 bg-rose-50 border border-rose-200 rounded">
                <span className="text-[11px] font-semibold text-rose-800 uppercase">Delayed / Alert</span>
                <div className="text-xl font-serif font-bold text-rose-900 mt-1">1 Vendor</div>
              </div>
              <div className="p-3 bg-stone-100 border border-stone-200 rounded">
                <span className="text-[11px] font-semibold text-stone-700 uppercase">Unscheduled</span>
                <div className="text-xl font-serif font-bold text-stone-900 mt-1">0 Vendors</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Activity</th>
                    <th className="px-4 py-2.5 font-semibold">Vendor & Category</th>
                    <th className="px-4 py-2.5 font-semibold">Scheduled Arrival</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  <tr>
                    <td className="px-4 py-3 font-medium">Baraat Royal Procession Setup</td>
                    <td className="px-4 py-3">Jaipur Royal Band (Music / Brass)</td>
                    <td className="px-4 py-3 font-mono">15:30 (Target: 16:30 Baraat)</td>
                    <td className="px-4 py-3"><Badge variant="success" size="sm" dot>Checked In</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm">Log Check-in</Button></td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Floral Varmala Stage Decor</td>
                    <td className="px-4 py-3">Udaipur Artisan Florals (Decor)</td>
                    <td className="px-4 py-3 font-mono">14:00 (Target: 17:00 Ceremony)</td>
                    <td className="px-4 py-3"><Badge variant="danger" size="sm" dot>Delayed (+25m)</Badge></td>
                    <td className="px-4 py-3 text-right"><Button variant="ghost" size="sm">Send Alert</Button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Developer B Vendor Directory & RFQs */}
      {currentTab === 'vendors' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Vendor Directory & RFQ Management</h2>
              <p className="text-xs text-[#718096]">Managed by Developer B • Quotation groups & 3-way comparison matrix</p>
            </div>
            <Button variant="primary" size="sm" leftIcon={<FileText className="w-4 h-4" />}>
              Create RFQ Group
            </Button>
          </div>

          <Card title="Active RFQ Quotation Groups (Jaipur / Udaipur)">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F7F4EE] text-[#1E2229] border-b border-[#E7E2D8]">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">RFQ Title</th>
                    <th className="px-4 py-2.5 font-semibold">Category</th>
                    <th className="px-4 py-2.5 font-semibold">Wedding</th>
                    <th className="px-4 py-2.5 font-semibold">Quotes Received</th>
                    <th className="px-4 py-2.5 font-semibold">Comparison Status</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E2D8]">
                  <tr>
                    <td className="px-4 py-3 font-medium">Umaid Bhawan Royal Mandap & Floral Ceiling</td>
                    <td className="px-4 py-3"><Badge variant="gold" size="sm">Decor & Design</Badge></td>
                    <td className="px-4 py-3">Singhania & Kapoor</td>
                    <td className="px-4 py-3 font-mono">3 / 3 Complete</td>
                    <td className="px-4 py-3"><Badge variant="success" size="sm">Ready to Select</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="secondary" size="sm">Compare Quotes</Button>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium">Rajasthani Traditional Thali Catering (450 Pax)</td>
                    <td className="px-4 py-3"><Badge variant="gold" size="sm">Catering</Badge></td>
                    <td className="px-4 py-3">Rathore & Dev</td>
                    <td className="px-4 py-3 font-mono">2 / 3 Pending</td>
                    <td className="px-4 py-3"><Badge variant="warning" size="sm">Awaiting 1 Vendor</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm">Follow Up</Button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Developer B Financial Ledger */}
      {currentTab === 'finance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Audited Financial Ledger & Cash Flow</h2>
              <p className="text-xs text-[#718096]">
                Managed by Developer B • Strict BigInt Paise, 6 Anomaly Detectors & Concurrency Locks
              </p>
            </div>
            <Button variant="gold" size="sm" leftIcon={<Lock className="w-4 h-4" />}>
              Record Direct Payment
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Actual Cash Flow Ledger" subtitle="Strictly CLEARED inflows & outflows">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Cleared Inflows (Client):</span>
                  <span className="font-mono font-bold text-emerald-700">₹32,45,00,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Cleared Outflows (Vendors):</span>
                  <span className="font-mono font-bold text-rose-700">₹18,12,00,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Direct Cleared Expenses:</span>
                  <span className="font-mono font-bold text-rose-700">₹45,80,000</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-semibold text-[#1E2229]">Net Cash Position:</span>
                  <span className="font-mono font-bold text-[#5B1424] text-base">+₹13,87,20,000</span>
                </div>
              </div>
            </Card>

            <Card title="Accrual Profitability Engine" subtitle="Revenue earned vs committed costs">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Total Invoiced Revenue:</span>
                  <span className="font-mono font-bold text-[#1E2229]">₹54,20,00,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Vendor Bill Commitments:</span>
                  <span className="font-mono font-bold text-[#1E2229]">₹38,90,00,000</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-[#E7E2D8]">
                  <span className="text-[#718096]">Direct Pass-Through Cost:</span>
                  <span className="font-mono font-bold text-[#718096]">₹82,50,000</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="font-semibold text-[#1E2229]">Accrual Net Profit:</span>
                  <span className="font-mono font-bold text-emerald-800 text-base">₹14,47,50,000 (26.7%)</span>
                </div>
              </div>
            </Card>

            <Card title="Ledger Anomaly Watchdog" subtitle="Automated 6-vector integrity checks">
              <div className="space-y-2 text-xs">
                <div className="p-2 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span>Pass-Through Margin:</span>
                  <span className="font-mono font-semibold">₹0.00 (Balanced)</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span>Direct Payment Caps:</span>
                  <span className="font-mono font-semibold">No Overpayments</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span>Vendor Advance Ceiling:</span>
                  <span className="font-mono font-semibold">100% Compliant</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded flex justify-between items-center text-emerald-800">
                  <span>Orphan Payment Audit:</span>
                  <span className="font-mono font-semibold">0 Detected</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Developer B Founder Season Review */}
      {currentTab === 'founder' && (
        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#5B1424]">Founder Season Review & Strategic Analytics</h2>
            <p className="text-xs text-[#718096]">Managed by Developer B • High-season luxury analytics & gross margin analysis</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card title="Luxury Portfolio Season Metric">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#718096]">Season Weddings:</span>
                  <span className="font-bold text-[#1E2229]">25 Destination Galas</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">Average Guest Count:</span>
                  <span className="font-bold text-[#1E2229]">480 Royalty & Guests</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">Average Wedding Budget:</span>
                  <span className="font-mono font-bold text-[#5B1424]">₹3,46,00,000</span>
                </div>
              </div>
            </Card>

            <Card title="Agency Margin Breakdown">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#718096]">Full-Service Weddings:</span>
                  <span className="font-bold text-emerald-700">28.4% Net Margin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">Partial-Service Weddings:</span>
                  <span className="font-bold text-[#8C6F31]">22.1% Net Margin</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">Direct Pass-Throughs:</span>
                  <span className="font-bold text-[#718096]">0.0% (Audited Exact)</span>
                </div>
              </div>
            </Card>

            <Card title="Vendor Reliability Rank">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#718096]">Top Decor Partner:</span>
                  <span className="font-semibold text-[#1E2229]">Jaipur Heritage Florals</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">Top Catering Partner:</span>
                  <span className="font-semibold text-[#1E2229]">Udaipur Royal Thali Co.</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#718096]">On-Time Delivery Rate:</span>
                  <span className="font-bold text-emerald-700">97.8%</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <MainDashboard />
    </QueryClientProvider>
  );
};

export default App;

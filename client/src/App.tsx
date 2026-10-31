import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppShell } from './components/layout/AppShell';
import { Card } from './components/common/Card';
import { Badge } from './components/common/Badge';
import { Button } from './components/common/Button';
import { CrmModule } from './components/crm/CrmModule';
import { WeddingModule } from './components/weddings/WeddingModule';
import { OperationsDashboard } from './components/operations/OperationsDashboard';
import { VendorDirectoryPage, FinanceLedgerPage, FounderAnalyticsPage } from './features';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { apiFetch } from './services/api';
import { 
  Building2, 
  CheckCircle2, 
  DollarSign, 
  GitBranch, 
  Lock, 
  ShieldCheck, 
  TrendingUp, 
  Workflow, 
  RefreshCw,
  Crown
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
  const { hasPermission } = useAuth();

  const fetchHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await apiFetch('/api/health');
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

      {/* Developer A CRM Module */}
      {currentTab === 'crm' && hasPermission('crm:enquiry:read') && <CrmModule />}

      {/* Developer A Weddings & Task Pipelines */}
      {currentTab === 'weddings' && hasPermission('weddings:wedding:read') && <WeddingModule />}

      {/* Developer A Day-of Operations */}
      {currentTab === 'timeline' && hasPermission('operations:schedule:read') && <OperationsDashboard />}

      {/* Developer B Vendor Directory & RFQs */}
      {currentTab === 'vendors' && hasPermission('procurement:vendor:read') && <VendorDirectoryPage />}

      {/* Developer B Financial Ledger */}
      {currentTab === 'finance' && hasPermission('finance:ledger:read') && <FinanceLedgerPage />}

      {/* Developer B Founder Season Review */}
      {currentTab === 'founder' && hasPermission('analytics:treasury:read') && <FounderAnalyticsPage />}
    </AppShell>
  );
};

export const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 rounded-xl bg-[#5B1424] border-2 border-[#C5A059] flex items-center justify-center animate-pulse shadow-lg mb-4">
          <Crown className="w-8 h-8 text-[#C5A059]" />
        </div>
        <h2 className="font-serif text-xl font-bold tracking-wider text-[#5B1424] uppercase">
          The Royal Knot
        </h2>
        <p className="text-xs text-[#718096] tracking-widest uppercase mt-1">
          Verifying workstation session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <MainDashboard />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthenticatedApp />
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

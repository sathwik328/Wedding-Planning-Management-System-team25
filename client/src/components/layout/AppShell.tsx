import React from 'react';
import { 
  Crown, 
  Users, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  ReceiptIndianRupee, 
  TrendingUp, 
  Layers,
  Database
} from 'lucide-react';
import { Badge } from '../common/Badge';

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  children
}) => {
  const navigationItems = [
    { id: 'overview', label: 'Executive Overview', icon: Crown },
    { id: 'crm', label: 'CRM & Consultations', icon: Users, devBadge: 'Dev A' },
    { id: 'weddings', label: 'Weddings & Tasks', icon: Calendar, devBadge: 'Dev A' },
    { id: 'timeline', label: 'Day-of Operations', icon: Clock, devBadge: 'Dev A' },
    { id: 'vendors', label: 'Vendor Directory & RFQs', icon: FileSpreadsheet, devBadge: 'Dev B' },
    { id: 'finance', label: 'Financial Ledger & Cash Flow', icon: ReceiptIndianRupee, devBadge: 'Dev B' },
    { id: 'founder', label: 'Founder Season Review', icon: TrendingUp, devBadge: 'Dev B' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-royal-ivory text-royal-charcoal">
      {/* Persistent Demo Data Notice Banner */}
      <aside aria-label="Demo notice" className="bg-[#5B1424] text-[#FDFBF7] px-4 py-2 text-xs flex items-center justify-between border-b border-[#C5A059]/40 tracking-wide shadow-xs">
        <div className="flex items-center gap-2 max-w-5xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse" />
            <span className="font-semibold uppercase tracking-wider text-[#C5A059]">Demo Mode Active</span>
            <span className="hidden md:inline text-stone-200">
              | 25 Synthetic Royal Weddings initialized for Jaipur & Udaipur luxury season (₹1.5Cr – ₹8Cr budgets).
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-stone-300 font-mono text-[11px] hidden sm:inline">Prisma SQLite / BigInt Paise</span>
            <Badge variant="gold" size="sm">Phase 1 Foundation</Badge>
          </div>
        </div>
      </aside>

      {/* Main Royal Knot Header */}
      <header className="bg-white border-b border-[#E7E2D8] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onSelectTab('overview')}>
              <div className="w-12 h-12 rounded bg-[#5B1424] border border-[#C5A059] flex items-center justify-center shadow-inner">
                <Crown className="w-7 h-7 text-[#C5A059]" />
              </div>
              <div>
                <span className="font-serif text-2xl font-bold tracking-wider text-[#5B1424] uppercase block leading-none">
                  The Royal Knot
                </span>
                <span className="text-[10px] tracking-[0.2em] font-medium text-[#C5A059] uppercase block mt-1">
                  Luxury Wedding Operations System
                </span>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="hidden lg:flex items-center gap-4 text-xs text-[#718096]">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F4EE] border border-[#E7E2D8]">
                <Database className="w-3.5 h-3.5 text-[#C5A059]" />
                <span className="font-medium text-[#1E2229]">DB Ledger:</span>
                <span className="text-emerald-700 font-semibold">Active & Audited</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#F7F4EE] border border-[#E7E2D8]">
                <Layers className="w-3.5 h-3.5 text-[#5B1424]" />
                <span className="font-medium text-[#1E2229]">Workspaces:</span>
                <span className="text-stone-700">Client / Server / Shared</span>
              </div>
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto py-2 -mb-px border-t border-[#F7F4EE]">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-[#5B1424] text-white shadow-xs'
                      : 'text-[#4A5568] hover:text-[#1E2229] hover:bg-[#F7F4EE]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#C5A059]' : 'text-[#718096]'}`} />
                  <span>{item.label}</span>
                  {item.devBadge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold ${
                        isActive
                          ? 'bg-[#C5A059] text-[#1E2229]'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {item.devBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Luxury Footer */}
      <footer className="bg-white border-t border-[#E7E2D8] py-6 mt-12 text-xs text-[#718096]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-sm text-[#5B1424]">The Royal Knot</span>
            <span>&copy; {new Date().getFullYear()} Rajputana Hospitality Management. Built for 2-Developer Distributed Hackathon.</span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Branch: <strong className="text-[#5B1424]">develop</strong></span>
            <span>|</span>
            <span>Architecture: <strong className="text-[#1E2229]">Prisma + BigInt + Express + Vite</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

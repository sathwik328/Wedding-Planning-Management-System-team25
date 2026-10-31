import React from 'react';
import { 
  Crown, 
  Users, 
  Calendar, 
  Clock, 
  FileSpreadsheet, 
  ReceiptIndianRupee, 
  TrendingUp, 
  LogOut
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { BadgeVariant } from '../../theme/tokens';
import { useAuth } from '../../contexts/AuthContext';
import { PermissionKey } from 'shared';

export interface AppShellProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  children: React.ReactNode;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  devBadge?: string;
  requiredPermission?: PermissionKey;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentTab,
  onSelectTab,
  children
}) => {
  const { user, logout, hasPermission } = useAuth();

  const allNavigationItems: NavItem[] = [
    { id: 'overview', label: 'Executive Overview', icon: Crown },
    { id: 'crm', label: 'CRM & Consultations', icon: Users, devBadge: 'Dev A', requiredPermission: 'crm:enquiry:read' },
    { id: 'weddings', label: 'Weddings & Tasks', icon: Calendar, devBadge: 'Dev A', requiredPermission: 'weddings:wedding:read' },
    { id: 'timeline', label: 'Day-of Operations', icon: Clock, devBadge: 'Dev A', requiredPermission: 'operations:schedule:read' },
    { id: 'vendors', label: 'Vendor Directory & RFQs', icon: FileSpreadsheet, devBadge: 'Dev B', requiredPermission: 'procurement:vendor:read' },
    { id: 'finance', label: 'Financial Ledger & Cash Flow', icon: ReceiptIndianRupee, devBadge: 'Dev B', requiredPermission: 'finance:ledger:read' },
    { id: 'founder', label: 'Founder Season Review', icon: TrendingUp, devBadge: 'Dev B', requiredPermission: 'analytics:treasury:read' }
  ];

  // Role-gated navigation tabs: filter based on permissions
  const visibleNavigationItems = allNavigationItems.filter((item) => {
    if (!item.requiredPermission) return true;
    return hasPermission(item.requiredPermission);
  });

  const getRoleBadgeVariant = (role?: string): BadgeVariant => {
    switch (role) {
      case "FOUNDER":
      case "ADMIN":
        return "gold";
      case "LEAD_PLANNER":
        return "wine";
      case "COORDINATOR":
        return "info";
      case "FINANCE_DIRECTOR":
        return "success";
      default:
        return "neutral";
    }
  };

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
            <Badge variant="gold" size="sm">Phase 4 RBAC Active</Badge>
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

            {/* User Profile & Logout Action */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="flex items-center gap-3 bg-[#F7F4EE] border border-[#E7E2D8] rounded-lg px-3 py-1.5">
                  <div className="w-8 h-8 rounded-full bg-[#5B1424] text-[#C5A059] flex items-center justify-center font-bold text-xs border border-[#C5A059]">
                    {user.name.charAt(0)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-[#1E2229] leading-tight flex items-center gap-1">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-mono font-medium text-[#718096] uppercase">
                      {user.role}
                    </span>
                  </div>
                  <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                    {user.role}
                  </Badge>
                  <button
                    onClick={() => logout()}
                    title="Sign Out"
                    className="ml-2 text-stone-500 hover:text-red-700 transition-colors p-1 rounded hover:bg-stone-200 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Bar */}
          <nav className="flex space-x-1 overflow-x-auto py-2 -mb-px border-t border-[#F7F4EE]">
            {visibleNavigationItems.map((item) => {
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
            <span>Branch: <strong className="text-[#5B1424]">feature/dev-a-crm-ops</strong></span>
            <span>|</span>
            <span>Architecture: <strong className="text-[#1E2229]">Prisma + Scrypt + Express + Vite + RBAC</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};

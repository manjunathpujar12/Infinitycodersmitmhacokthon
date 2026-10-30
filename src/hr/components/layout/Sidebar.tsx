import React from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Briefcase,
  Sliders,
  MapPin,
  Users2,
  Share2,
  Calendar,
  UserCheck2,
  UserX2,
  Plane,
  Home,
  Receipt,
  CreditCard,
  History,
  Sparkles,
  ShieldAlert,
  Compass
} from 'lucide-react';
import { UserRole } from '../../types';
import { ROLE_LABELS } from '../../lib/utils';

export type DashboardViewId =
  | 'overview'
  | 'demand-capacity'
  | 'hiring-drives'
  | 'job-roles'
  | 'city-vacancies'
  | 'candidate-allocation'
  | 'overflow-management'
  | 'interview-slots'
  | 'waitlist-recovery'
  | 'candidate-attendance'
  | 'absence-review'
  | 'travel-policy'
  | 'relocation-policy'
  | 'expense-claims'
  | 'payroll-tracking'
  | 'audit-history';

export interface SidebarProps {
  currentView: DashboardViewId;
  onSelectView: (view: DashboardViewId) => void;
  currentRole: UserRole | null;
  badgeCounts?: {
    overflow?: number;
    waitlist?: number;
    pendingAbsence?: number;
    pendingClaims?: number;
    blockedCandidates?: number;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  currentRole,
  badgeCounts = {},
}) => {
  const currentRoleMeta = currentRole
    ? ROLE_LABELS[currentRole]
    : { label: 'No Role Selected', description: 'Select a role from the top bar to proceed.', badgeClass: 'bg-gray-100 text-gray-600 border-gray-300' };

  return (
    <aside className="w-64 bg-sidebar border-r border-border h-screen flex flex-col justify-between shrink-0 sticky top-0 select-none overflow-y-auto">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sage-500 text-white flex items-center justify-center font-bold shadow-warm">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-bold text-text-main font-sans tracking-tight flex items-center gap-1.5">
                HireSlot <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-sage-200 text-sage-800">HR</span>
              </h1>
              <p className="text-[11px] text-text-muted font-medium">Enterprise Allocation Engine</p>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-5">
          {/* SECTION: OVERVIEW */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted/80 mb-1.5">
              Overview & Analytics
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => onSelectView('overview')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'overview'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Recruitment Overview</span>
              </button>

              <button
                onClick={() => onSelectView('demand-capacity')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'demand-capacity'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Demand vs Capacity</span>
              </button>
            </div>
          </div>

          {/* SECTION: WORKFLOW 1 - JOB ALLOCATION */}
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted/80">
                Workflow 1: Job Allocation
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-terracotta-100 text-terracotta-700">
                Phase A
              </span>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => onSelectView('hiring-drives')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'hiring-drives'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <Compass className="w-4 h-4" />
                <span>Hiring Drives</span>
              </button>

              <button
                onClick={() => onSelectView('job-roles')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'job-roles'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <Sliders className="w-4 h-4" />
                <span>Roles & Skills Setup</span>
              </button>

              <button
                onClick={() => onSelectView('city-vacancies')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'city-vacancies'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <MapPin className="w-4 h-4" />
                <span>City-wise Vacancies</span>
              </button>

              <button
                onClick={() => onSelectView('candidate-allocation')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'candidate-allocation'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Users2 className="w-4 h-4" />
                  <span>Candidate Allocation</span>
                </div>
                {badgeCounts.blockedCandidates ? (
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                    {badgeCounts.blockedCandidates} Blocked
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => onSelectView('overflow-management')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'overflow-management'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Share2 className="w-4 h-4" />
                  <span>Overflow & Alt Offers</span>
                </div>
                {badgeCounts.overflow ? (
                  <span className="text-[10px] bg-terracotta-100 text-terracotta-700 font-bold px-1.5 py-0.5 rounded-full">
                    {badgeCounts.overflow}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {/* SECTION: WORKFLOW 2 - INTERVIEW SCHEDULING */}
          <div>
            <div className="px-3 mb-1.5 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted/80">
                Workflow 2: Scheduling & Drive
              </p>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sage-200 text-sage-800">
                Phase B
              </span>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => onSelectView('interview-slots')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'interview-slots'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Slots & Calendar</span>
              </button>

              <button
                onClick={() => onSelectView('waitlist-recovery')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'waitlist-recovery'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Waitlist & Recovery</span>
                </div>
                {badgeCounts.waitlist ? (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                    {badgeCounts.waitlist}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => onSelectView('candidate-attendance')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'candidate-attendance'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <UserCheck2 className="w-4 h-4" />
                <span>Drive Attendance Desk</span>
              </button>

              <button
                onClick={() => onSelectView('absence-review')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'absence-review'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <UserX2 className="w-4 h-4" />
                  <span>Absence Reason & Decisions</span>
                </div>
                {badgeCounts.pendingAbsence ? (
                  <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-1.5 py-0.5 rounded-full">
                    {badgeCounts.pendingAbsence}
                  </span>
                ) : null}
              </button>
            </div>
          </div>

          {/* SECTION: POLICIES & FINANCE */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted/80 mb-1.5">
              Policies & Finance
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => onSelectView('travel-policy')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'travel-policy'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <Plane className="w-4 h-4" />
                <span>Travel Policy</span>
              </button>

              <button
                onClick={() => onSelectView('relocation-policy')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'relocation-policy'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <Home className="w-4 h-4" />
                <span>Relocation Policy</span>
              </button>

              <button
                onClick={() => onSelectView('expense-claims')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'expense-claims'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <div className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4" />
                  <span>Expense Claims</span>
                </div>
                {badgeCounts.pendingClaims ? (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-full">
                    {badgeCounts.pendingClaims}
                  </span>
                ) : null}
              </button>

              <button
                onClick={() => onSelectView('payroll-tracking')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'payroll-tracking'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Payroll Disbursements</span>
              </button>
            </div>
          </div>

          {/* SECTION: AUDIT & GOVERNANCE */}
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-text-muted/80 mb-1.5">
              Governance
            </p>
            <div className="space-y-0.5">
              <button
                onClick={() => onSelectView('audit-history')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${currentView === 'audit-history'
                    ? 'bg-sage-500 text-white shadow-warm'
                    : 'text-text-main hover:bg-white/60'
                  }`}
              >
                <History className="w-4 h-4" />
                <span>Audit History</span>
              </button>
            </div>
          </div>
        </nav>
      </div>

      {/* Role Footer */}
      <div className="p-4 border-t border-border bg-sidebar/90">
        <div className="p-3 rounded-xl bg-card border border-border shadow-warm-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Current Role</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentRoleMeta.badgeClass}`}>
              {currentRoleMeta.label}
            </span>
          </div>
          <p className="text-[11px] text-text-muted leading-tight mt-1">
            {currentRoleMeta.description}
          </p>
        </div>
      </div>
    </aside>
  );
};

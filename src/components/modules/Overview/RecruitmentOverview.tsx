import React from 'react';
import { 
  Building2, 
  MapPin, 
  Users2, 
  Calendar, 
  UserCheck2, 
  AlertCircle, 
  Receipt, 
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Share2
} from 'lucide-react';
import { DashboardKPIs, HiringDrive, AuditLog } from '../../../types';
import { StatCard } from '../../common/StatCard';
import { Badge } from '../../common/Badge';
import { formatCurrency, formatDateTime } from '../../../lib/utils';
import { DashboardViewId } from '../../layout/Sidebar';

export interface RecruitmentOverviewProps {
  kpis: DashboardKPIs;
  drives: HiringDrive[];
  selectedDriveId: string;
  auditLogs: AuditLog[];
  onNavigate: (view: DashboardViewId) => void;
  onOpenRulesDrawer: () => void;
}

export const RecruitmentOverview: React.FC<RecruitmentOverviewProps> = ({
  kpis,
  drives,
  selectedDriveId,
  auditLogs,
  onNavigate,
  onOpenRulesDrawer,
}) => {
  const activeDrive = drives.find(d => d.id === selectedDriveId) || drives[0];

  return (
    <div className="space-y-6">
      {/* Top Banner: Active Drive Context & Health */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <Badge variant="sage" size="md">
              <span className="w-1.5 h-1.5 rounded-full bg-sage-600 animate-pulse" />
              Live Drive Pipeline
            </Badge>
            <span className="text-xs text-text-muted font-medium">
              {activeDrive ? activeDrive.code : 'Consolidated Enterprise View'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            {activeDrive ? activeDrive.title : 'All Hiring Drives Executive Overview'}
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            {activeDrive
              ? activeDrive.description
              : 'Holistic performance overview across engineering, product and leadership hiring tracks.'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('candidate-allocation')}
            className="px-3.5 py-2 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all"
          >
            <Users2 className="w-3.5 h-3.5" />
            Allocate Candidates
          </button>
          <button
            onClick={onOpenRulesDrawer}
            className="px-3.5 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-1.5 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
            Configure Ranking Rules
          </button>
          <button
            onClick={() => onNavigate('waitlist-recovery')}
            className="px-3.5 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-1.5 transition-all"
          >
            <Clock className="w-3.5 h-3.5 text-terracotta-600" />
            Fast-Fill Recovery ({kpis.waitlistCount})
          </button>
        </div>
      </div>

      {/* Dynamic Enterprise KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Drives & Scope"
          value={kpis.totalActiveDrives}
          subtitle={`${kpis.totalOpenVacancies} Total Vacancy Target`}
          icon={Building2}
          accentColor="sage"
          onClick={() => onNavigate('hiring-drives')}
        />

        <StatCard
          title="Candidate Pipeline"
          value={kpis.totalCandidates}
          subtitle={`${kpis.totalAllocated} Allocated • ${kpis.overflowCount} Overflow`}
          icon={Users2}
          accentColor="sage"
          trend={{ value: `${Math.round((kpis.totalAllocated / (kpis.totalCandidates || 1)) * 100)}% filled`, isPositive: true }}
          onClick={() => onNavigate('candidate-allocation')}
        />

        <StatCard
          title="Interview Slots Capacity"
          value={`${kpis.slotsBooked} / ${kpis.totalInterviewSlots}`}
          subtitle={`${kpis.totalInterviewSlots - kpis.slotsBooked} Open Slots Available`}
          icon={Calendar}
          accentColor="terracotta"
          onClick={() => onNavigate('interview-slots')}
        />

        <StatCard
          title="Drive Attendance Rate"
          value={`${kpis.attendanceRate}%`}
          subtitle={`${kpis.pendingAbsenceReviews} Pending Absence Reviews`}
          icon={UserCheck2}
          accentColor="neutral"
          onClick={() => onNavigate('candidate-attendance')}
        />
      </div>

      {/* Second Row: Secondary Metrics & Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div 
          onClick={() => onNavigate('overflow-management')}
          className="bg-card rounded-xl p-4 border border-border shadow-warm hover:border-terracotta-300 transition-colors cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Overflow & Alt Offers</p>
            <h4 className="text-xl font-bold text-terracotta-700 mt-1">{kpis.overflowCount} Candidates</h4>
            <p className="text-[11px] text-text-muted mt-0.5">Awaiting alternative city assignment</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-terracotta-50 text-terracotta-600 border border-terracotta-200 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('waitlist-recovery')}
          className="bg-card rounded-xl p-4 border border-border shadow-warm hover:border-sage-300 transition-colors cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Interview Waitlist</p>
            <h4 className="text-xl font-bold text-sage-700 mt-1">{kpis.waitlistCount} In Queue</h4>
            <p className="text-[11px] text-text-muted mt-0.5">Automated slot recycling enabled</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sage-50 text-sage-600 border border-sage-200 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div 
          onClick={() => onNavigate('expense-claims')}
          className="bg-card rounded-xl p-4 border border-border shadow-warm hover:border-border transition-colors cursor-pointer flex items-center justify-between"
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Pending Reimbursements</p>
            <h4 className="text-xl font-bold text-text-main mt-1">{formatCurrency(kpis.pendingExpenseClaimsTotal)}</h4>
            <p className="text-[11px] text-text-muted mt-0.5">{kpis.claimsCount} candidate claims awaiting HR review</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sidebar text-text-muted border border-border flex items-center justify-center">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Section: Drive Progress Cards & Live Audit Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Drive Progress & Key Workflows (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card rounded-2xl p-6 border border-border shadow-warm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-text-main font-sans uppercase tracking-wider">
                  Two-Phase Enterprise Workflow Separation
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Job allocation and interview scheduling are decoupled into distinct operational phases.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phase 1 Box */}
              <div className="p-4 rounded-xl border border-border bg-[#FBFBFA] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-terracotta-700 bg-terracotta-50 px-2 py-0.5 rounded border border-terracotta-200">
                      Phase 1: Job Allocation
                    </span>
                    <span className="text-[11px] text-text-muted font-medium">Step 1 to 5</span>
                  </div>
                  <h4 className="text-sm font-bold text-text-main">Role & Location Matching</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Evaluates candidates against configured ranking rules, calculates recommendation transparency scores, manages location buffers, and handles overflow routing.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-main">
                    {kpis.totalAllocated} Allocated
                  </span>
                  <button
                    onClick={() => onNavigate('candidate-allocation')}
                    className="text-xs font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-1"
                  >
                    Manage Allocation <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Phase 2 Box */}
              <div className="p-4 rounded-xl border border-border bg-[#FBFBFA] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-sage-700 bg-sage-50 px-2 py-0.5 rounded border border-sage-200">
                      Phase 2: Interview Scheduling
                    </span>
                    <span className="text-[11px] text-text-muted font-medium">Step 6 to 10</span>
                  </div>
                  <h4 className="text-sm font-bold text-text-main">Slot Operations & Drive Desk</h4>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">
                    Schedules interviewer calendar suites, manages waitlist queue, recycles cancelled slots via Fast-Fill recovery, and manages candidate check-in attendance.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-text-main">
                    {kpis.slotsBooked} Slots Scheduled
                  </span>
                  <button
                    onClick={() => onNavigate('interview-slots')}
                    className="text-xs font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-1"
                  >
                    Open Calendar <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Hiring Drives Snapshot */}
          <div className="bg-card rounded-2xl p-6 border border-border shadow-warm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-main font-sans uppercase tracking-wider">
                Hiring Drives Portfolio
              </h3>
              <button
                onClick={() => onNavigate('hiring-drives')}
                className="text-xs font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-1"
              >
                View all drives <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {drives.map((drive) => (
                <div
                  key={drive.id}
                  className="p-3.5 rounded-xl border border-border hover:border-sage-300 bg-white transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-sidebar border border-border flex items-center justify-center text-text-main font-bold text-xs">
                      {drive.code.slice(4, 8)}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-main">{drive.title}</h4>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-text-muted">
                        <span>{drive.code}</span>
                        <span>•</span>
                        <span>Target: {drive.totalTargetHeadcount} positions</span>
                        <span>•</span>
                        <span>Mode: {drive.mode}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <Badge variant={drive.status === 'ACTIVE' ? 'sage' : drive.status === 'DRAFT' ? 'warning' : 'neutral'} size="sm">
                      {drive.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Governance & Audit Stream (1 col) */}
        <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-main font-sans uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sage-600" />
                Audit Trail Stream
              </h3>
              <button
                onClick={() => onNavigate('audit-history')}
                className="text-[11px] font-semibold text-sage-600 hover:text-sage-700"
              >
                Full Log
              </button>
            </div>

            <div className="space-y-3.5">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="text-xs pb-3 border-b border-border-subtle last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                    <span className="font-semibold text-text-main">{log.actorName}</span>
                    <span>{formatDateTime(log.timestamp)}</span>
                  </div>
                  <p className="text-text-muted leading-relaxed">
                    {log.description}
                  </p>
                  <span className="inline-block mt-1 font-mono text-[10px] text-text-subtle bg-sidebar px-1.5 py-0.2 rounded">
                    {log.action}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-border mt-6">
            <div className="p-3 rounded-xl bg-sage-50 border border-sage-200 text-xs text-sage-800 flex items-center justify-between">
              <div>
                <p className="font-bold">Enterprise Guard Active</p>
                <p className="text-[11px] text-sage-700">All actions cryptographically logged</p>
              </div>
              <CheckCircle2 className="w-4 h-4 text-sage-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

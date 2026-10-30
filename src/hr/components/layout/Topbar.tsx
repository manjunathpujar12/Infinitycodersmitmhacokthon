import React from 'react';
import {
  Building2,
  ShieldCheck,
  Database,
  RotateCw,
  CheckCircle2,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { HiringDrive, UserRole } from '../../types';
import { ROLE_LABELS } from '../../lib/utils';
import { isSupabaseConfigured } from '../../lib/supabase';

export interface TopbarProps {
  drives: HiringDrive[];
  selectedDriveId: string;
  onSelectDrive: (driveId: string) => void;
  currentRole: UserRole | null;
  onChangeRole?: (role: UserRole | null) => void;
  onRefresh: () => void;
  onOpenSupabaseModal: () => void;
  isRefreshing?: boolean;
  /** When provided, a logout button is rendered next to the user avatar. */
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  drives,
  selectedDriveId,
  onSelectDrive,
  currentRole,
  onChangeRole,
  onRefresh,
  onOpenSupabaseModal,
  isRefreshing = false,
  onLogout,
}) => {
  const currentRoleMeta = currentRole ? ROLE_LABELS[currentRole] : null;

  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between sticky top-0 z-30 shadow-warm-sm">
      {/* Left: Active Hiring Drive Switcher */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-text-muted">
          <Building2 className="w-4 h-4 text-sage-600" />
          <span className="text-xs font-semibold uppercase tracking-wider hidden sm:inline">Active Drive:</span>
        </div>

        <div className="relative">
          <select
            value={selectedDriveId}
            onChange={(e) => onSelectDrive(e.target.value)}
            className="appearance-none bg-sidebar hover:bg-sidebar/80 text-text-main text-xs font-semibold py-1.5 pl-3 pr-8 rounded-lg border border-border cursor-pointer focus:outline-none focus:ring-1 focus:ring-sage-500 transition-colors shadow-warm-sm"
          >
            <option value="ALL">All Hiring Drives (Consolidated)</option>
            {drives.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} • {d.title} ({d.status})
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh live data"
          className="p-1.5 rounded-lg border border-border text-text-muted hover:text-text-main hover:bg-sidebar transition-all"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-sage-600' : ''}`} />
        </button>
      </div>

      {/* Right Controls: Supabase status, Role-based persona switcher, logout */}
      <div className="flex items-center gap-3">
        {/* Supabase status indicator pill */}
        <button
          onClick={onOpenSupabaseModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-sidebar hover:bg-[#E8EAE3] text-xs transition-colors shadow-warm-sm"
          title="Supabase Database Configuration"
        >
          <Database className="w-3.5 h-3.5 text-sage-600" />
          <span className="text-text-main font-medium hidden md:inline">Supabase:</span>
          {isSupabaseConfigured ? (
            <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
              <CheckCircle2 className="w-3 h-3" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-terracotta-700 font-medium">
              Local DB + Sync
            </span>
          )}
        </button>

        {/* Authenticated Role Badge (Trusted, Read-Only, Server-Derived) */}
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="flex items-center gap-1.5 text-xs text-text-muted hidden lg:flex">
            <ShieldCheck className="w-3.5 h-3.5 text-sage-600" />
            <span className="text-[11px] font-medium uppercase tracking-wider">Role:</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-warm-sm text-xs font-semibold bg-sage-50 border-sage-300 text-sage-800">
            <span>{currentRoleMeta?.label || 'Unassigned Role'}</span>
          </div>
        </div>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-sage-500 text-white flex items-center justify-center text-xs font-bold border border-sage-600 shadow-warm-sm">
          {currentRole === 'HR_ADMIN' ? 'SR' : currentRole === 'HR_RECRUITER' ? 'AD' : currentRole === 'INTERVIEW_COORDINATOR' ? 'PK' : currentRole === 'FINANCE_OFFICER' ? 'FO' : '?'}
        </div>

        {/* Logout button — only rendered when a logout handler is provided */}
        {onLogout && (
          <button
            onClick={onLogout}
            title="Sign out of HireSlot"
            className="p-1.5 rounded-lg border border-border text-text-muted hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </header>
  );
};

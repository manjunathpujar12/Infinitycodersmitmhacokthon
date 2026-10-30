import React from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { UserRole } from '../../types';
import { ROLE_LABELS } from '../../lib/utils';

export interface RoleGuardProps {
  currentRole: UserRole | null;
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallbackMessage?: string;
  allowReadOnly?: boolean;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  currentRole,
  allowedRoles,
  children,
  fallbackMessage,
  allowReadOnly = true,
}) => {
  const isAllowed = currentRole !== null && allowedRoles.includes(currentRole);

  if (isAllowed) {
    return <>{children}</>;
  }

  const roleMeta = currentRole
    ? ROLE_LABELS[currentRole]
    : { label: 'No Role Selected', badgeClass: 'bg-gray-100 text-gray-600 border-gray-300' };
  const allowedNames = allowedRoles.map(r => ROLE_LABELS[r].label).join(', ');

  if (allowReadOnly) {
    return (
      <div>
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-amber-900 shadow-warm-sm">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
            <p className="text-xs">
              <span className="font-bold">Read-Only Mode:</span> Signed in as{' '}
              <span className="font-semibold">{roleMeta.label}</span>. Editing this module is reserved for{' '}
              <span className="font-semibold">{allowedNames}</span>. Use the Role Switcher in the topbar to test administrative permissions.
            </p>
          </div>
        </div>
        <div className="pointer-events-none opacity-90">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="p-12 text-center bg-card rounded-2xl border border-border max-w-lg mx-auto my-12 shadow-warm">
      <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center mx-auto mb-4">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-text-main font-sans">
        Restricted Access Area
      </h3>
      <p className="text-xs text-text-muted mt-2 leading-relaxed">
        {fallbackMessage || `You are currently viewing as ${roleMeta.label}. This workflow requires ${allowedNames} authorization.`}
      </p>
      <div className="mt-5 p-3 rounded-lg bg-sidebar text-[11px] text-text-muted border border-border">
        💡 Switch to <strong>HR Admin</strong> or <strong>{allowedRoles[0] ? ROLE_LABELS[allowedRoles[0]].label : 'Authorized Role'}</strong> from the role menu in the top bar to proceed.
      </div>
    </div>
  );
};

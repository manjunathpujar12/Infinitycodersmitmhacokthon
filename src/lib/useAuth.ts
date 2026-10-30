/**
 * useAuth – Session management hook for HireSlot HR Dashboard.
 *
 * Responsibilities:
 *  - Restore an existing Supabase session on mount (page refresh persistence).
 *  - Resolve the authenticated user's role from `app_metadata.role`.
 *  - Expose a typed `logout` function that clears the session and returns the
 *    app to the login screen.
 *  - Never allow client-side role escalation — role is always read from the
 *    server-authoritative `app_metadata` field, not from any client state.
 *
 * When Supabase is not configured the hook stays in the
 * `{ status: 'unauthenticated' }` state so the rest of the UI can still render
 * the login page without crashing.
 */

import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { UserRole } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AuthStatus = 'initialising' | 'authenticated' | 'unauthenticated';

export interface AuthState {
  status: AuthStatus;
  /** Resolved role of the signed-in user. Null when unauthenticated. */
  role: UserRole | null;
  /** Display name pulled from user_metadata or email prefix. */
  displayName: string | null;
  /** User e-mail address from the active session. */
  email: string | null;
  /** Call to sign the current user out and clear all session data. */
  logout: () => Promise<void>;
}

// ─── Role resolution ──────────────────────────────────────────────────────────

const VALID_ROLES: readonly UserRole[] = [
  'HR_ADMIN',
  'HR_RECRUITER',
  'INTERVIEW_COORDINATOR',
  'FINANCE_OFFICER',
];

function resolveRole(user: { app_metadata?: Record<string, unknown>; user_metadata?: Record<string, unknown> } | null): UserRole | null {
  if (!user) return null;
  const raw = user.app_metadata?.role ?? user.user_metadata?.role;
  if (typeof raw === 'string' && (VALID_ROLES as string[]).includes(raw)) {
    return raw as UserRole;
  }
  // Role not set or invalid — deny access rather than silently elevating.
  return null;
}

function resolveDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  const fromMeta = user.user_metadata?.full_name ?? user.user_metadata?.name;
  if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
  if (user.email) return user.email.split('@')[0];
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthState {
  const [status, setStatus] = useState<AuthStatus>('initialising');
  const [role, setRole] = useState<UserRole | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // Helper: apply a Supabase User object to local state.
  const applyUser = useCallback((user: Parameters<typeof resolveRole>[0]) => {
    const resolvedRole = resolveRole(user);
    setRole(resolvedRole);
    setDisplayName(resolveDisplayName(user));
    setEmail((user as { email?: string | null } | null)?.email ?? null);
    // A user without a valid role is authenticated with Supabase but must not
    // access protected modules.  We still mark them as 'authenticated' so the
    // dashboard shell renders — RoleGuard will block individual modules.
    setStatus(resolvedRole !== null ? 'authenticated' : 'unauthenticated');
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // No Supabase — skip session check, show login page immediately.
      setStatus('unauthenticated');
      return;
    }

    // 1. Restore existing session synchronously from localStorage.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        applyUser(session.user);
      } else {
        setStatus('unauthenticated');
      }
    });

    // 2. Subscribe to auth state changes (login, logout, token refresh, etc.).
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        applyUser(session.user);
      } else {
        setRole(null);
        setDisplayName(null);
        setEmail(null);
        setStatus('unauthenticated');
      }
    });

    return () => subscription.unsubscribe();
  }, [applyUser]);

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    // onAuthStateChange above will clear state; also reset here for non-Supabase path.
    setRole(null);
    setDisplayName(null);
    setEmail(null);
    setStatus('unauthenticated');
  }, []);

  return { status, role, displayName, email, logout };
}


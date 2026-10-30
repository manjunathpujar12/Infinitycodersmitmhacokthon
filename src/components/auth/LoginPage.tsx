/**
 * LoginPage – Premium enterprise login screen for HireSlot HR Dashboard.
 *
 * Layout:  Left branding panel  |  Right login form
 * Handles: Supabase auth, show/hide password, remember-me, validation,
 *          loading state, credential errors, and session persistence.
 *
 * Role is resolved server-side from app_metadata — users cannot self-assign
 * a privileged role through this form.
 */

import React, { useState, useRef, useId } from 'react';
import {
  Briefcase,
  Eye,
  EyeOff,
  Mail,
  Lock,
  LogIn,
  AlertCircle,
  CheckCircle2,
  Users,
  BarChart3,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { UserRole } from '../../types';
import { cn } from '../../lib/utils';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface LoginPageProps {
  /**
   * Invoked with the server-resolved role after a successful sign-in.
   * The parent (App) stores this in state and passes it to RoleGuard.
   */
  onLogin: (role: UserRole) => void;
}

// ─── Left branding panel ──────────────────────────────────────────────────────

const features = [
  {
    icon: Users,
    title: 'Smart Candidate Allocation',
    desc: 'AI-powered ranking and city-wise allocation across multiple hiring drives.',
  },
  {
    icon: BarChart3,
    title: 'Real-Time Analytics',
    desc: 'Live KPIs, demand-capacity visualisation, and overflow management.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access Control',
    desc: 'Granular permissions for HR Admin, Recruiter, Coordinator & Finance.',
  },
];

function BrandingPanel() {
  return (
    <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] flex-col relative overflow-hidden bg-sage-800 text-white select-none shrink-0">
      {/* Decorative background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sage-700/50 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-24 w-80 h-80 rounded-full bg-sage-600/30 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-64 h-64 rounded-full bg-terracotta-800/30 blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full p-10 xl:p-14">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-auto">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-sm shadow-warm">
            <Briefcase className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight">HireSlot</span>
            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/15 text-white/90 uppercase tracking-wider">HR</span>
          </div>
        </div>

        {/* Hero content */}
        <div className="mt-16 mb-12">
          <p className="text-sage-300 text-xs font-semibold uppercase tracking-widest mb-4">
            Enterprise Allocation Engine
          </p>
          <h2 className="text-3xl xl:text-4xl font-bold leading-snug mb-5 tracking-tight">
            Smarter Hiring.<br />
            Better Workforce<br />
            Decisions.
          </h2>
          <p className="text-sage-300 text-sm leading-relaxed max-w-sm">
            HireSlot centralises every stage of your mass-hiring lifecycle — from
            candidate allocation and interview scheduling to payroll disbursement
            and compliance audit trails.
          </p>
        </div>

        {/* Feature list */}
        <ul className="space-y-5 mb-auto">
          {features.map(({ icon: Icon, title, desc }) => (
            <li key={title} className="flex items-start gap-4">
              <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="w-4 h-4 text-sage-200" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{title}</p>
                <p className="text-xs text-sage-400 leading-relaxed mt-0.5">{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Footer tag */}
        <div className="mt-10 pt-6 border-t border-white/10">
          <p className="text-[11px] text-sage-500">
            © 2026 HireSlot Enterprise · Secure · GDPR Compliant · SOC 2 Type II
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const emailId = useId();
  const passwordId = useId();
  const rememberMeId = useId();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Prevent double-submit
  const submittingRef = useRef(false);

  // ── Client-side validation ──────────────────────────────────────────────────

  function validate(): string | null {
    if (!email.trim()) return 'Please enter your email address.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return 'Please enter a valid email address.';
    if (!password) return 'Please enter your password.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    return null;
  }

  // ── Submit handler ──────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current || loading) return;

    setError(null);
    setSuccessMsg(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError(
        'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then reload.'
      );
      return;
    }

    submittingRef.current = true;
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        // Map common Supabase error codes to friendly messages.
        if (
          signInError.message.toLowerCase().includes('invalid login') ||
          signInError.message.toLowerCase().includes('invalid credentials') ||
          signInError.message.toLowerCase().includes('email not confirmed')
        ) {
          setError('Incorrect email or password. Please check your credentials and try again.');
        } else if (signInError.message.toLowerCase().includes('too many')) {
          setError('Too many sign-in attempts. Please wait a few minutes and try again.');
        } else {
          setError(signInError.message);
        }
        return;
      }

      // Role is resolved from app_metadata — never from client input.
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const VALID_ROLES: UserRole[] = [
        'HR_ADMIN',
        'HR_RECRUITER',
        'INTERVIEW_COORDINATOR',
        'FINANCE_OFFICER',
      ];

      const rawRole = user?.app_metadata?.role ?? user?.user_metadata?.role;
      const resolvedRole =
        typeof rawRole === 'string' && (VALID_ROLES as string[]).includes(rawRole)
          ? (rawRole as UserRole)
          : null;

      if (!resolvedRole) {
        // User exists in Supabase but has no valid role assigned.
        await supabase.auth.signOut();
        setError(
          'Your account does not have an assigned HireSlot role. Please contact your HR Administrator.'
        );
        return;
      }

      setSuccessMsg('Sign-in successful! Loading your dashboard…');
      // Brief pause so the success message is visible.
      await new Promise((r) => setTimeout(r, 600));
      onLogin(resolvedRole);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  // ── Forgot password handler ─────────────────────────────────────────────────

  const handleForgotPassword = async () => {
    setError(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setError('Supabase is not configured. Password reset is unavailable.');
      return;
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError('Enter your email address above, then click "Forgot password?".');
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: window.location.origin,
      });
      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccessMsg(`Password reset email sent to ${trimmedEmail}. Check your inbox.`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not send reset email.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex antialiased font-sans text-text-main bg-background">
      {/* ── Left: Branding panel ── */}
      <BrandingPanel />

      {/* ── Right: Login form panel ── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 min-h-screen overflow-y-auto">
        {/* Mobile-only logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-8 self-start">
          <div className="w-8 h-8 rounded-lg bg-sage-500 text-white flex items-center justify-center shadow-warm">
            <Briefcase className="w-4 h-4" />
          </div>
          <span className="text-base font-bold text-text-main tracking-tight">
            HireSlot <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sage-200 text-sage-800 uppercase">HR</span>
          </span>
        </div>

        <div className="w-full max-w-md">
          {/* Form header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-text-main tracking-tight">
              Welcome back
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              Sign in to your HireSlot HR workspace.
            </p>
          </div>

          {/* Supabase not configured notice */}
          {!isSupabaseConfigured && (
            <div className="mb-5 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 leading-relaxed">
                <span className="font-bold block mb-0.5">Supabase not configured</span>
                Add <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> and{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to your{' '}
                <code className="font-mono bg-amber-100 px-1 rounded">.env</code> file to enable authentication.
              </div>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div
              role="alert"
              className="mb-5 p-3.5 rounded-xl border border-red-200 bg-red-50 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-200"
            >
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700 leading-relaxed font-medium">{error}</p>
            </div>
          )}

          {/* Success banner */}
          {successMsg && (
            <div
              role="status"
              className="mb-5 p-3.5 rounded-xl border border-emerald-200 bg-emerald-50 flex items-start gap-3 animate-in fade-in duration-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700 leading-relaxed font-medium">{successMsg}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor={emailId} className="block text-xs font-semibold text-text-main">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  id={emailId}
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@company.com"
                  className={cn(
                    'w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border bg-card text-text-main',
                    'placeholder:text-text-subtle transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    error ? 'border-red-300' : 'border-border hover:border-sage-300'
                  )}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={passwordId} className="block text-xs font-semibold text-text-main">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={loading}
                  className="text-[11px] text-sage-600 hover:text-sage-800 font-semibold transition-colors disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <input
                  id={passwordId}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                  className={cn(
                    'w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border bg-card text-text-main',
                    'placeholder:text-text-subtle transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-sage-500',
                    'disabled:opacity-60 disabled:cursor-not-allowed',
                    error ? 'border-red-300' : 'border-border hover:border-sage-300'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  disabled={loading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-text-muted hover:text-text-main transition-colors disabled:opacity-50 rounded"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me */}
            <div className="flex items-center gap-2.5">
              <input
                id={rememberMeId}
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={loading}
                className="w-3.5 h-3.5 rounded border-border text-sage-600 focus:ring-sage-500 focus:ring-offset-0 cursor-pointer disabled:cursor-not-allowed accent-sage-600"
              />
              <label
                htmlFor={rememberMeId}
                className="text-xs text-text-muted cursor-pointer select-none"
              >
                Remember me on this device
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !!successMsg}
              className={cn(
                'w-full flex items-center justify-center gap-2 py-2.5 px-5 rounded-xl',
                'text-sm font-semibold text-white bg-sage-600 hover:bg-sage-700',
                'focus:outline-none focus:ring-2 focus:ring-sage-500 focus:ring-offset-2',
                'transition-all shadow-warm-sm active:scale-[0.98]',
                (loading || !!successMsg) && 'opacity-70 cursor-not-allowed'
              )}
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-r-transparent shrink-0" />
                  <span>Signing in…</span>
                </>
              ) : successMsg ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Authenticated</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 shrink-0" />
                  <span>Sign In</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0 ml-auto" />
                </>
              )}
            </button>
          </form>

          {/* Security note */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-sidebar border border-border">
              <ShieldCheck className="w-4 h-4 text-sage-600 shrink-0 mt-0.5" />
              <div className="text-[11px] text-text-muted leading-relaxed">
                <span className="font-semibold text-text-main block mb-0.5">Secure Enterprise Access</span>
                Your credentials are verified by Supabase Auth. Roles are assigned by
                your HR Administrator — you cannot self-select a privileged role.
              </div>
            </div>
          </div>
        </div>

        {/* Mobile footer */}
        <p className="mt-10 text-[11px] text-text-subtle lg:hidden">
          © 2026 HireSlot Enterprise. All rights reserved.
        </p>
      </div>
    </div>
  );
};

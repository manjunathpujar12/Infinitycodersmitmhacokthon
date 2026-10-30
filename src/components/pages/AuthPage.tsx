import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { Layers, ShieldCheck, ArrowRight, Lock, Mail, User } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const { login, register, loading } = useCandidateAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!email || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must contain at least 6 characters.');
      return;
    }

    if (isRegisterMode) {
      if (!fullName.trim()) {
        setFormError('Please provide your full legal name.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
      const res = await register(fullName, email, password);
      if (!res.success) setFormError(res.message);
    } else {
      const res = await login(email, password);
      if (!res.success) setFormError(res.message);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-2xl bg-primary mx-auto flex items-center justify-center text-white shadow-card mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-extrabold text-textPrimary tracking-tight">
          HireSlot Candidate Portal
        </h2>
        <p className="mt-1 text-xs text-textMuted max-w-sm mx-auto leading-relaxed">
          Access your personalized job matches, location assignments, interview scheduling, and mobility claims
        </p>
      </div>

      {/* Auth Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-cards py-8 px-6 sm:px-10 shadow-card border border-borderMuted rounded-2xl space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex bg-sidebar p-1 rounded-xl border border-borderMuted">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(false);
                setFormError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                !isRegisterMode
                  ? 'bg-cards text-textPrimary shadow-subtle'
                  : 'text-textMuted hover:text-textPrimary'
              }`}
            >
              Candidate Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(true);
                setFormError('');
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                isRegisterMode
                  ? 'bg-cards text-textPrimary shadow-subtle'
                  : 'text-textMuted hover:text-textPrimary'
              }`}
            >
              New Registration
            </button>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sundaram"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary placeholder:text-textMuted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="email"
                  required
                  placeholder="candidate@outlook.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary placeholder:text-textMuted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary placeholder:text-textMuted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>
            </div>

            {isRegisterMode && (
              <div>
                <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary placeholder:text-textMuted/60 focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <span>Authenticating with Supabase...</span>
              ) : (
                <>
                  <span>{isRegisterMode ? 'Complete Registration' : 'Sign In to Portal'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

        </div>

        {/* Security footnote */}
        <p className="mt-4 text-center text-[11px] text-textMuted flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Row-Level Security: You only access your own applications.
        </p>
      </div>
    </div>
  );
};


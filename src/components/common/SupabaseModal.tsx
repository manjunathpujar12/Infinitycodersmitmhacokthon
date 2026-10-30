import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { Modal } from './Modal';
import { Database, CheckCircle2, AlertCircle, RefreshCw, Copy, ShieldCheck } from 'lucide-react';

export const SupabaseModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose
}) => {
  const {
    supabaseConfig,
    updateSupabaseConfig,
    testConnection,
    resetToDefaultSeedData,
    showToast
  } = useCandidateAuth();

  const [url, setUrl] = useState(supabaseConfig.supabaseUrl);
  const [anonKey, setAnonKey] = useState(supabaseConfig.supabaseAnonKey);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleTestAndSave = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(url, anonKey);
      setTestResult(res);
      updateSupabaseConfig({
        supabaseUrl: url,
        supabaseAnonKey: anonKey,
        isConnected: res.success,
        isCustomConnected: true,
        errorMessage: res.success ? undefined : res.message
      });

      if (res.success) {
        showToast('success', 'Supabase Connected', res.message);
      } else {
        showToast('error', 'Connection Failed', res.message);
      }
    } catch (err: any) {
      const msg = err.message || 'Connection test failed';
      setTestResult({ success: false, message: msg });
      showToast('error', 'Error', msg);
    } finally {
      setTesting(false);
    }
  };

  const handleCopySchemaPath = () => {
    navigator.clipboard.writeText('supabase/schema.sql');
    showToast('info', 'Path Copied', 'Schema file path copied: supabase/schema.sql');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase PostgreSQL & Auth Connectivity"
      subtitle="Connect your live Supabase cloud project or inspect persistent local synchronization"
      maxWidth="xl"
    >
      <div className="space-y-5">
        {/* Connection Status Box */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3.5 ${supabaseConfig.isConnected
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-[#FAF9F5] border-borderMuted text-textPrimary'
            }`}
        >
          <div
            className={`p-2 rounded-lg ${supabaseConfig.isConnected ? 'bg-emerald-600 text-white' : 'bg-sidebar text-primary'
              }`}
          >
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold">
                {supabaseConfig.isConnected
                  ? 'Live Supabase Cloud Connected'
                  : 'Hybrid Local Storage & Demo Engine'}
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${supabaseConfig.isConnected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-[#EEEFE8] text-textMuted'
                  }`}
              >
                {supabaseConfig.isConnected ? 'ONLINE' : 'LOCAL SYNC'}
              </span>
            </div>
            <p className="text-xs text-textMuted mt-1 leading-relaxed">
              Candidate data is seamlessly synced: you can supply real Supabase cloud credentials to
              write to your remote PostgreSQL tables, or run completely offline with browser storage.
            </p>
          </div>
        </div>

        {/* Form Inputs */}
        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
              Supabase Project URL
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourproject.supabase.co"
              className="w-full px-3 py-2 bg-[#FCFCF9] border border-borderDark rounded-lg font-mono text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1">
              Supabase Anon / Public Key
            </label>
            <input
              type="password"
              value={anonKey}
              onChange={(e) => setAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-3 py-2 bg-[#FCFCF9] border border-borderDark rounded-lg font-mono text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>

        {/* Feedback message */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${testResult.success
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* SQL Schema Copy Card */}
        <div className="bg-[#FAF9F5] p-3.5 rounded-xl border border-borderMuted flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-textPrimary">Shared PostgreSQL Schema Script</span>
          </div>
          <button
            onClick={handleCopySchemaPath}
            className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
          >
            <Copy className="w-3.5 h-3.5" /> Copy Path (supabase/schema.sql)
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-borderMuted">
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset candidate data to factory seed records?')) {
                resetToDefaultSeedData();
                onClose();
              }
            }}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 flex items-center gap-1"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Reset Demo Data
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-borderDark rounded-lg text-xs font-semibold hover:bg-sidebar"
            >
              Close
            </button>
            <button
              onClick={handleTestAndSave}
              disabled={testing}
              className="px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-hover shadow-subtle flex items-center gap-1.5 disabled:opacity-60"
            >
              {testing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Test & Save
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};


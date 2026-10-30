import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  RotateCcw, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { Modal } from './Modal';
import { isSupabaseConfigured, testSupabaseConnection } from '../../lib/supabase';
import { storageService } from '../../lib/storage';

export interface SupabaseSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetData: () => void;
}

export const SupabaseSettingsModal: React.FC<SupabaseSettingsModalProps> = ({
  isOpen,
  onClose,
  onResetData,
}) => {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testSupabaseConnection();
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDownloadSchema = () => {
    // Download schema.sql file
    const link = document.createElement('a');
    link.href = '/supabase/schema.sql';
    link.download = 'hireslot-enterprise-schema.sql';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const envSample = `VITE_SUPABASE_URL="https://your-supabase-project.supabase.co"
VITE_SUPABASE_ANON_KEY="your-anon-public-key"`;

  const handleCopyEnv = () => {
    navigator.clipboard.writeText(envSample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Supabase Enterprise Database Engine"
      subtitle="Actual Supabase live data connection status & local persistence engine."
      maxWidth="lg"
    >
      <div className="space-y-5 text-xs">
        {/* Status Box */}
        <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${
          isSupabaseConfigured 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : 'bg-[#FAF9F5] border-border text-text-main'
        }`}>
          <div className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-sage-600 shrink-0 shadow-warm-sm">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-bold font-sans">
              {isSupabaseConfigured ? 'Supabase Live Connected' : 'Local Enterprise Engine (Offline/Live-Sync Ready)'}
            </h4>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              {isSupabaseConfigured
                ? 'HireSlot is directly communicating with your real Supabase instance. RLS policies and table constraints are in effect.'
                : 'The dashboard is currently operating on an isolated in-browser Enterprise Persistence & Synchronization Engine. Full data modeling, candidate scores, allocations, calendar slots, and audit trails persist and compute dynamically!'}
            </p>
          </div>
        </div>

        {/* Test Connection Button */}
        <div>
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="px-4 py-2 bg-sage-500 hover:bg-sage-600 disabled:opacity-50 text-white rounded-lg font-semibold text-xs shadow-warm flex items-center gap-2 transition-all"
          >
            <Database className="w-3.5 h-3.5" />
            {isTesting ? 'Pinging Supabase...' : 'Test Supabase Connectivity'}
          </button>

          {testResult && (
            <div className={`mt-3 p-3 rounded-xl border text-xs ${
              testResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-600" />}
                <span>{testResult.message}</span>
              </div>
            </div>
          )}
        </div>

        {/* Environment Variable Setup */}
        <div className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-text-main uppercase tracking-wider text-[11px]">
              Connecting Your Supabase Project (.env.local)
            </h5>
            <button
              onClick={handleCopyEnv}
              className="text-[11px] font-semibold text-sage-600 hover:text-sage-700 flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied' : 'Copy Env Template'}
            </button>
          </div>
          <pre className="p-3 bg-[#2D332E] text-[#E5E6DF] rounded-xl font-mono text-[11px] overflow-x-auto leading-relaxed">
            {envSample}
          </pre>
        </div>

        {/* SQL Schema Migration Download */}
        <div className="p-4 bg-sidebar/50 rounded-xl border border-border flex items-center justify-between">
          <div>
            <h5 className="font-bold text-text-main text-xs">Download Supabase Schema Migration (SQL)</h5>
            <p className="text-[11px] text-text-muted mt-0.5">
              Contains complete table creation, enums, indexes, and RLS policies.
            </p>
          </div>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noreferrer"
            className="px-3.5 py-1.5 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg font-semibold text-xs shadow-warm-sm flex items-center gap-1.5 transition-colors"
          >
            <span>Supabase Console</span>
            <ExternalLink className="w-3 h-3 text-text-muted" />
          </a>
        </div>

        {/* Reset Data Button */}
        <div className="pt-3 border-t border-border flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            Need to reset sample drives, allocations, and candidates?
          </span>
          <button
            onClick={() => {
              if (confirm('Reset all demo data back to default enterprise state?')) {
                storageService.resetAllData();
                onResetData();
                onClose();
              }
            }}
            className="px-3 py-1.5 bg-sidebar hover:bg-rose-50 text-rose-700 border border-border rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Seed Data
          </button>
        </div>
      </div>
    </Modal>
  );
};

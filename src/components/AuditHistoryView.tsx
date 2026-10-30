import React from 'react';
import { History, ShieldCheck, User, Clock, ArrowRight } from 'lucide-react';
import { AllocationAuditLog } from '../types/allocation';
import { formatDateTime } from '../lib/utils';

interface AuditHistoryViewProps {
  logs: AllocationAuditLog[];
}

export const AuditHistoryView: React.FC<AuditHistoryViewProps> = ({ logs }) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <History className="w-4 h-4" />
            <span>Immutable Allocation Audit Trail</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Audit History & Decision Logs
          </h2>
          <p className="text-sm text-slate-600">
            Complete compliance ledger tracking every transition, actor, and explainability reason.
          </p>
        </div>
        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {logs.length} Total Audit Events
        </span>
      </div>

      {/* Audit Log Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No audit records logged yet. Run an allocation or alter offer status to populate the trail.
          </div>
        ) : (
          <div className="relative pl-6 border-l-2 border-indigo-100 space-y-8">
            {logs.map((log) => (
              <div key={log.id} className="relative group">
                {/* Dot */}
                <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-indigo-600 border-4 border-white shadow-sm" />

                <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200 hover:border-indigo-300 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">&bull;</span>
                      <span className="text-xs font-semibold text-indigo-600">
                        Actor: {log.actor}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-xs text-slate-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatDateTime(log.timestamp)}</span>
                    </div>
                  </div>

                  {/* Transition Status */}
                  <div className="flex items-center space-x-2 text-xs font-semibold text-slate-700 mb-2">
                    <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                      {log.fromStatus || 'INIT'}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                      {log.toStatus}
                    </span>
                  </div>

                  <p className="text-sm text-slate-800 font-medium">
                    {log.reason}
                  </p>

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-3 text-[11px] bg-white p-2.5 rounded-lg border border-slate-200 text-slate-600 font-mono">
                      {JSON.stringify(log.metadata)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};


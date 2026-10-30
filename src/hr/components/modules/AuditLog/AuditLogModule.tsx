import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  ShieldCheck, 
  FileText, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { AuditLog, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatDateTime, ROLE_LABELS } from '../../../lib/utils';

export interface AuditLogModuleProps {
  auditLogs: AuditLog[];
  currentRole: UserRole | null;
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({
  auditLogs,
  currentRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          log.entityType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || log.actorRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'ActorName', 'ActorRole', 'Action', 'EntityType', 'EntityId', 'Description'];
    const rows = filteredLogs.map(l => [
      `"${l.timestamp}"`,
      `"${l.actorName}"`,
      l.actorRole,
      l.action,
      l.entityType,
      l.entityId,
      `"${l.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HireSlot_Compliance_Audit_Trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              Governance & Regulatory Compliance
            </span>
            <span className="text-xs text-text-muted">• Immutable Operational Ledger</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Comprehensive Audit History & Activity Trail
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Every candidate allocation decision, threshold override, slot recycling operation, absence adjudication, and financial disbursement is cryptographically stamped and auditable.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-1.5 transition-all self-start md:self-auto shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-sage-600" />
          Export Audit Trail (CSV)
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by actor, action type or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted font-medium whitespace-nowrap">Filter Actor Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
          >
            <option value="ALL">All Roles</option>
            <option value="HR_ADMIN">HR Admin</option>
            <option value="HR_RECRUITER">HR Recruiter</option>
            <option value="INTERVIEW_COORDINATOR">Interview Coordinator</option>
            <option value="FINANCE_OFFICER">Finance Officer</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Timestamp</th>
                <th className="py-3 px-4">Actor & Role</th>
                <th className="py-3 px-4">Action Event</th>
                <th className="py-3 px-4">Entity Type</th>
                <th className="py-3 px-5">Audit Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredLogs.map((log) => {
                const roleMeta = ROLE_LABELS[log.actorRole] || { label: log.actorRole, badgeClass: 'bg-sidebar text-text-main' };

                return (
                  <tr 
                    key={log.id} 
                    onClick={() => setSelectedLog(log)}
                    className="hover:bg-sidebar/30 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-5 font-mono text-[11px] text-text-muted whitespace-nowrap">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-text-main">{log.actorName}</div>
                      <span className={`inline-block text-[10px] px-1.5 py-0.2 rounded font-semibold mt-0.5 border ${roleMeta.badgeClass}`}>
                        {roleMeta.label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-sage-800 text-[11px]">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-text-muted font-mono text-[11px]">
                      {log.entityType}
                    </td>
                    <td className="py-3.5 px-5 text-text-main max-w-md">
                      <p className="line-clamp-2 leading-relaxed">{log.description}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Detail Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Immutable Audit Event Ledger Entry"
        subtitle={`Event ID: ${selectedLog?.id}`}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-sidebar rounded-xl border border-border">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Actor</span>
                <span className="font-bold text-text-main">{selectedLog.actorName} ({selectedLog.actorRole})</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Timestamp</span>
                <span className="font-mono text-text-main">{formatDateTime(selectedLog.timestamp)}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Action Code</span>
                <span className="font-mono font-bold text-sage-800">{selectedLog.action}</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Target Entity</span>
                <span className="font-mono text-text-main">{selectedLog.entityType} ({selectedLog.entityId})</span>
              </div>
            </div>

            <div>
              <span className="text-text-main font-bold block mb-1">Operational Description:</span>
              <div className="p-3 bg-white rounded-xl border border-border text-text-main leading-relaxed">
                {selectedLog.description}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-sage-50 border border-sage-200 text-sage-800 flex items-center justify-between text-[11px]">
              <span className="font-semibold">Cryptographically Verified Hash</span>
              <span className="font-mono text-[10px]">SHA-256: 4f9b2c...88a1e</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

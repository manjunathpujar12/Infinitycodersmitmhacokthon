import React, { useState } from 'react';
import {
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  DollarSign,
  Building,
  RotateCw,
  Send
} from 'lucide-react';
import { PayrollDisbursement, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { formatCurrency, formatDateTime } from '../../../lib/utils';

export interface PayrollTrackingModuleProps {
  disbursements: PayrollDisbursement[];
  onProcessBatch: (batchCode: string) => Promise<void>;
  currentRole: UserRole | null;
}

export const PayrollTrackingModule: React.FC<PayrollTrackingModuleProps> = ({
  disbursements,
  onProcessBatch,
  currentRole,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Group by batches
  const batchCodes = Array.from(new Set(disbursements.map(d => d.batchCode)));
  const pendingQueuedCount = disbursements.filter(d => d.status === 'QUEUED' || d.status === 'PENDING').length;
  const totalQueuedAmount = disbursements
    .filter(d => d.status === 'QUEUED' || d.status === 'PENDING')
    .reduce((sum, d) => sum + d.amount, 0);

  const isAuthorizedFinance = currentRole === 'HR_ADMIN' || currentRole === 'FINANCE_OFFICER';

  const handleDisburseBatch = async (batchCode: string) => {
    if (!isAuthorizedFinance) {
      alert('Unauthorized: Only HR Admin and Finance Officers can execute payroll batch disbursements.');
      return;
    }
    setIsProcessing(true);
    try {
      await onProcessBatch(batchCode);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadManifest = (batchCode: string) => {
    const batchItems = disbursements.filter(d => d.batchCode === batchCode);
    const headers = ['BatchCode', 'CandidateName', 'MaskedAccount', 'Amount', 'Currency', 'PaymentMethod', 'Status', 'Reference'];
    const rows = batchItems.map(b => [
      b.batchCode,
      `"${b.candidateName}"`,
      b.bankAccountMasked,
      b.amount,
      b.currency,
      b.paymentMethod,
      b.status,
      b.referenceNumber || 'N/A'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HireSlot_Payment_Batch_${batchCode}.csv`);
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
              Disbursement Operations
            </span>
            <span className="text-xs text-text-muted">• NEFT / ACH Banking Gateway</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Payroll Payment Status & Batch Disbursements
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Monitor banking payment queues for candidate travel allowances, dispatch automated payment batches, and export bank-ready disbursement reconciliation manifests.
          </p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Queued Payouts</p>
          <h3 className="text-2xl font-bold text-text-main mt-1">
            {formatCurrency(totalQueuedAmount)}
          </h3>
          <p className="text-xs text-text-muted mt-1">{pendingQueuedCount} disbursements pending bank release</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Disbursed</p>
          <h3 className="text-2xl font-bold text-sage-700 mt-1">
            {formatCurrency(
              disbursements
                .filter(d => d.status === 'DISBURSED')
                .reduce((sum, d) => sum + d.amount, 0)
            )}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {disbursements.filter(d => d.status === 'DISBURSED').length} transactions completed
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Gateway Status</p>
          <div className="flex items-center gap-2 mt-1">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-800">Direct Deposit / NEFT Active</span>
          </div>
          <p className="text-xs text-text-muted mt-1">HDFC Corporate Banking Connected</p>
        </div>
      </div>

      {/* Batches Section */}
      <div className="space-y-4">
        {batchCodes.map((code) => {
          const batchItems = disbursements.filter(d => d.batchCode === code);
          const hasQueued = batchItems.some(b => b.status === 'QUEUED' || b.status === 'PENDING');
          const batchTotal = batchItems.reduce((acc, b) => acc + b.amount, 0);

          return (
            <div
              key={code}
              className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden"
            >
              {/* Batch Header Bar */}
              <div className="p-4 bg-sidebar/60 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center text-sage-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-text-main font-mono">{code}</h4>
                    <p className="text-[11px] text-text-muted">
                      {batchItems.length} Candidate Payouts • Total: <strong>{formatCurrency(batchTotal)}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadManifest(code)}
                    className="px-3 py-1.5 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Manifest (CSV)
                  </button>

                  {hasQueued && isAuthorizedFinance && (
                    <button
                      onClick={() => handleDisburseBatch(code)}
                      disabled={isProcessing}
                      className="px-3.5 py-1.5 bg-sage-500 hover:bg-sage-600 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      Disburse Batch Now
                    </button>
                  )}
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sidebar/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    <tr>
                      <th className="py-2.5 px-5">Candidate</th>
                      <th className="py-2.5 px-4">Bank Account</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Method</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-5 text-right">Reference / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {batchItems.map((item) => (
                      <tr key={item.id} className="hover:bg-sidebar/20 transition-colors">
                        <td className="py-3 px-5 font-bold text-text-main">
                          {item.candidateName}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-text-muted">
                          {isAuthorizedFinance ? item.bankAccountMasked : '•••••••• (Restricted)'}
                        </td>
                        <td className="py-3 px-4 font-bold text-text-main">
                          {formatCurrency(item.amount, item.currency)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-text-main bg-sidebar px-2 py-0.5 rounded border border-border text-[11px]">
                            {item.paymentMethod}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={item.status === 'DISBURSED' ? 'success' : 'warning'}
                            size="sm"
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-5 text-right font-mono text-[11px] text-text-muted">
                          {item.referenceNumber ? (
                            <div>
                              <span className="font-semibold text-sage-800">{item.referenceNumber}</span>
                              <span className="block text-[10px] text-text-subtle">{formatDateTime(item.disbursedAt || '')}</span>
                            </div>
                          ) : (
                            <span className="italic text-text-subtle">Queued for Gateway Execution</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

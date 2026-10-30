import React, { useState } from 'react';
import { 
  Receipt, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  DollarSign,
  Filter,
  Search,
  Sparkles
} from 'lucide-react';
import { ExpenseClaim, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatCurrency, formatDate } from '../../../lib/utils';
import { storageService } from '../../../lib/storage';

export interface ExpenseClaimsModuleProps {
  claims: ExpenseClaim[];
  onDecideClaim: (
    claimId: string, 
    action: 'APPROVE' | 'ADJUST' | 'REJECT', 
    approvedAmount?: number, 
    notes?: string
  ) => Promise<void>;
  currentRole: UserRole | null;
}

export const ExpenseClaimsModule: React.FC<ExpenseClaimsModuleProps> = ({
  claims,
  onDecideClaim,
  currentRole,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reviewingClaim, setReviewingClaim] = useState<ExpenseClaim | null>(null);
  const [decisionAction, setDecisionAction] = useState<'APPROVE' | 'ADJUST' | 'REJECT'>('APPROVE');
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [previewReceipt, setPreviewReceipt] = useState<{ url: string; name: string } | null>(null);

  const handleViewReceipt = async (claim: ExpenseClaim) => {
    const signedUrl = await storageService.getReceiptSignedUrl(claim.receiptUrl || claim.receiptName);
    if (signedUrl) {
      setPreviewReceipt({ url: signedUrl, name: claim.receiptName });
    } else {
      alert(`Receipt document "${claim.receiptName}" is stored in Supabase Storage.`);
    }
  };

  const filteredClaims = claims.filter(c => {
    const matchesSearch = c.candidateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.receiptName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleOpenReview = (claim: ExpenseClaim, action: 'APPROVE' | 'ADJUST' | 'REJECT') => {
    setReviewingClaim(claim);
    setDecisionAction(action);
    setAdjustedAmount(claim.approvedAmount || claim.claimedAmount);
    if (action === 'APPROVE') {
      setReviewNotes('Approved in full accordance with Corporate Candidate Travel Reimbursement Policy.');
    } else if (action === 'ADJUST') {
      setReviewNotes('Adjusted claimed amount to meet standard policy daily lodging/transit caps.');
    } else {
      setReviewNotes('Claim does not meet reimbursement prerequisites or lacks verifiable receipt.');
    }
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewingClaim) return;
    await onDecideClaim(reviewingClaim.id, decisionAction, adjustedAmount, reviewNotes);
    setReviewingClaim(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              Finance & Reimbursements
            </span>
            <span className="text-xs text-text-muted">• Candidate Claims Audit</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Expense Claim Review & Policy Compliance
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Audit candidate outstation flight, train, hotel, and local commute expense receipts against corporate travel policies. Approved claims automatically route to the Payroll disbursement queue.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by candidate name or receipt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
          >
            <option value="ALL">All Claims</option>
            <option value="SUBMITTED">Pending HR Review</option>
            <option value="HR_APPROVED">Approved</option>
            <option value="ADJUSTED">Adjusted</option>
            <option value="DISBURSED">Paid / Disbursed</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Expense Claims Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Candidate</th>
                <th className="py-3 px-4">Category & Receipt</th>
                <th className="py-3 px-4">Claimed Amount</th>
                <th className="py-3 px-4">Compliance Audit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredClaims.map((claim) => (
                <tr key={claim.id} className="hover:bg-sidebar/30 transition-colors">
                  <td className="py-3.5 px-5">
                    <div className="font-bold text-text-main">{claim.candidateName}</div>
                    <div className="text-[11px] text-text-muted">{formatDate(claim.expenseDate)}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-bold text-text-main">{claim.category}</span>
                    <button
                      type="button"
                      onClick={() => handleViewReceipt(claim)}
                      title="Inspect uploaded receipt proof"
                      className="flex items-center gap-1.5 text-[11px] text-sage-700 hover:text-sage-900 font-semibold mt-0.5 hover:underline text-left cursor-pointer"
                    >
                      <FileText className="w-3 h-3 text-sage-600 shrink-0" />
                      <span className="truncate max-w-[140px]">{claim.receiptName}</span>
                      <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                    </button>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-text-main">
                    <div>{formatCurrency(claim.claimedAmount, claim.currency)}</div>
                    {claim.approvedAmount !== undefined && claim.approvedAmount !== claim.claimedAmount && (
                      <span className="text-[11px] text-terracotta-700 font-semibold block">
                        Approved: {formatCurrency(claim.approvedAmount, claim.currency)}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        claim.policyCompliance === 'COMPLIANT' ? 'success' :
                        claim.policyCompliance === 'OVER_LIMIT' ? 'terracotta' :
                        claim.policyCompliance === 'NEEDS_JUSTIFICATION' ? 'warning' : 'danger'
                      }
                      size="sm"
                    >
                      {claim.policyCompliance}
                    </Badge>
                    <p className="text-[10px] text-text-muted mt-0.5 max-w-xs truncate" title={claim.complianceNote}>
                      {claim.complianceNote}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge
                      variant={
                        claim.status === 'HR_APPROVED' || claim.status === 'DISBURSED' ? 'success' :
                        claim.status === 'ADJUSTED' ? 'terracotta' :
                        claim.status === 'SUBMITTED' ? 'warning' : 'danger'
                      }
                      size="sm"
                    >
                      {claim.status}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {claim.status === 'SUBMITTED' ? (
                        <>
                          <button
                            onClick={() => handleOpenReview(claim, 'APPROVE')}
                            className="px-2.5 py-1 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold text-xs shadow-warm-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleOpenReview(claim, 'ADJUST')}
                            className="px-2 py-1 bg-sidebar hover:bg-terracotta-100 text-terracotta-800 border border-border rounded-lg font-semibold text-xs"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => handleOpenReview(claim, 'REJECT')}
                            className="px-2 py-1 bg-sidebar hover:bg-rose-50 text-rose-700 border border-border rounded-lg font-semibold text-xs"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] text-text-muted italic">Audited</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        isOpen={Boolean(reviewingClaim)}
        onClose={() => setReviewingClaim(null)}
        title="Expense Claim Adjudication & Approval"
        subtitle={`Claim: ${reviewingClaim?.category} (${formatCurrency(reviewingClaim?.claimedAmount || 0)}) by ${reviewingClaim?.candidateName}`}
      >
        {reviewingClaim && (
          <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
            <div className="p-3 bg-sidebar rounded-xl border border-border space-y-1">
              <div className="flex justify-between">
                <span className="text-text-muted">Compliance Engine Assessment:</span>
                <span className="font-bold text-text-main">{reviewingClaim.policyCompliance}</span>
              </div>
              <p className="text-text-muted">{reviewingClaim.complianceNote}</p>
            </div>

            {decisionAction === 'ADJUST' && (
              <div>
                <label className="block text-text-main font-semibold mb-1">
                  Adjusted Payable Reimbursement Amount ($)
                </label>
                <input
                  type="number"
                  step={0.5}
                  min={0}
                  max={reviewingClaim.claimedAmount}
                  required
                  value={adjustedAmount}
                  onChange={(e) => setAdjustedAmount(Number(e.target.value))}
                  className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
                />
              </div>
            )}

            <div>
              <label className="block text-text-main font-semibold mb-1">
                Auditor Notes & Justification (Recorded to Payroll Batch)
              </label>
              <textarea
                rows={3}
                required
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReviewingClaim(null)}
                className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirm & Route to Payroll
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Supabase Storage Receipt Preview Modal */}
      <Modal
        isOpen={Boolean(previewReceipt)}
        onClose={() => setPreviewReceipt(null)}
        title="Candidate Uploaded Expense Receipt"
        subtitle={previewReceipt ? `File: ${previewReceipt.name}` : ''}
        maxWidth="lg"
      >
        {previewReceipt && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-sidebar rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-sage-600" />
                <span className="font-semibold text-text-main">{previewReceipt.name}</span>
              </div>
              <a
                href={previewReceipt.url}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold flex items-center gap-1.5 shadow-warm-sm transition-colors text-[11px]"
              >
                <span>Open in New Tab</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="border border-border rounded-xl bg-card p-4 min-h-[240px] flex items-center justify-center text-text-muted">
              {previewReceipt.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                <img
                  src={previewReceipt.url}
                  alt={previewReceipt.name}
                  className="max-h-[380px] max-w-full rounded-lg object-contain"
                />
              ) : (
                <div className="text-center space-y-2">
                  <FileText className="w-12 h-12 text-sage-600 mx-auto" />
                  <p className="font-medium text-text-main">PDF or Document Receipt</p>
                  <p className="text-[11px] text-text-muted">
                    Secure signed URL generated from Supabase Storage bucket.
                  </p>
                  <a
                    href={previewReceipt.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sidebar hover:bg-white border border-border rounded-lg text-sage-700 font-semibold"
                  >
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

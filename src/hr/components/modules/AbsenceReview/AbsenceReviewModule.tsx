import React, { useState } from 'react';
import { 
  UserX2, 
  FileText, 
  CheckCircle2, 
  RotateCcw, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import { AbsenceReview, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatDateTime } from '../../../lib/utils';

export interface AbsenceReviewModuleProps {
  reviews: AbsenceReview[];
  onDecideAbsence: (
    reviewId: string, 
    decision: 'APPROVED_RESCHEDULE' | 'APPROVED_REPOOL' | 'DISQUALIFIED', 
    notes: string
  ) => Promise<void>;
  currentRole: UserRole | null;
}

export const AbsenceReviewModule: React.FC<AbsenceReviewModuleProps> = ({
  reviews,
  onDecideAbsence,
  currentRole,
}) => {
  const [selectedReview, setSelectedReview] = useState<AbsenceReview | null>(null);
  const [decisionType, setDecisionType] = useState<'APPROVED_RESCHEDULE' | 'APPROVED_REPOOL' | 'DISQUALIFIED'>('APPROVED_RESCHEDULE');
  const [decisionNotes, setDecisionNotes] = useState('');

  const handleOpenDecision = (review: AbsenceReview, type: 'APPROVED_RESCHEDULE' | 'APPROVED_REPOOL' | 'DISQUALIFIED') => {
    setSelectedReview(review);
    setDecisionType(type);
    if (type === 'APPROVED_RESCHEDULE') {
      setDecisionNotes('Absence justified by documented travel disruption/medical emergency. Granted expedited priority slot rescheduling.');
    } else if (type === 'APPROVED_REPOOL') {
      setDecisionNotes('Excused absence without penalty. Re-pooled to general talent reserve for subsequent hiring drive.');
    } else {
      setDecisionNotes('Unexcused no-show without valid documentation within stipulated 24-hour reporting window.');
    }
  };

  const handleExecuteDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReview) return;
    await onDecideAbsence(selectedReview.id, decisionType, decisionNotes);
    setSelectedReview(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800 uppercase tracking-wider">
              Governance & Fair Consideration
            </span>
            <span className="text-xs text-text-muted">• Absence Resolution Console</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Absence Reason Review & HR Decisions
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Review supporting documentation for interview absences, evaluate medical or travel disruption appeals, and grant rescheduling vouchers or candidate re-pooling.
          </p>
        </div>
      </div>

      {/* Review Cards Grid */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <div className="bg-card rounded-2xl border border-dashed border-border p-12 text-center">
            <CheckCircle2 className="w-10 h-10 text-sage-600 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-text-main">No Pending Absence Reviews</h4>
            <p className="text-xs text-text-muted mt-1">All interview attendance discrepancies have been resolved.</p>
          </div>
        ) : (
          reviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-card rounded-2xl p-6 border border-border shadow-warm hover:border-sage-300 transition-all space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text-main font-sans">{rev.candidateName}</h3>
                    <Badge variant={rev.category === 'UNEXCUSED' ? 'danger' : 'terracotta'} size="sm">
                      {rev.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    Submitted: {formatDateTime(rev.submittedAt)}
                  </p>
                </div>

                <Badge
                  variant={
                    rev.status === 'APPROVED_RESCHEDULE' ? 'success' :
                    rev.status === 'APPROVED_REPOOL' ? 'sage' :
                    rev.status === 'DISQUALIFIED' ? 'danger' : 'warning'
                  }
                  size="md"
                >
                  {rev.status}
                </Badge>
              </div>

              {/* Reason Description & Evidence */}
              <div className="p-4 rounded-xl bg-sidebar/50 border border-border space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                  Candidate Stated Absence Reason
                </span>
                <p className="text-xs text-text-main leading-relaxed">
                  {rev.absenceReason}
                </p>

                {rev.evidenceSummary && (
                  <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileText className="w-3.5 h-3.5 text-sage-600" />
                      Evidence: {rev.evidenceSummary}
                    </span>
                    {rev.evidenceUrl && (
                      <a
                        href={rev.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sage-600 hover:text-sage-700 font-semibold flex items-center gap-1"
                      >
                        View Document <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Completed Decision Info */}
              {rev.hrDecisionBy && (
                <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl text-xs text-sage-900">
                  <div className="flex items-center justify-between font-bold">
                    <span>HR Decision Recorded by: {rev.hrDecisionBy}</span>
                    <span>{formatDateTime(rev.hrDecisionAt || '')}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-sage-800">{rev.hrDecisionNotes}</p>
                </div>
              )}

              {/* Action Buttons for Pending Reviews */}
              {rev.status === 'PENDING' && (
                <div className="pt-2 border-t border-border flex flex-wrap items-center justify-end gap-2.5">
                  <button
                    onClick={() => handleOpenDecision(rev, 'APPROVED_RESCHEDULE')}
                    className="px-3.5 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Approve Reschedule Voucher
                  </button>
                  <button
                    onClick={() => handleOpenDecision(rev, 'APPROVED_REPOOL')}
                    className="px-3.5 py-1.5 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                    Excuse & Re-pool
                  </button>
                  <button
                    onClick={() => handleOpenDecision(rev, 'DISQUALIFIED')}
                    className="px-3.5 py-1.5 bg-sidebar hover:bg-rose-50 text-rose-700 border border-border rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Disqualify Candidate
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Decision Modal */}
      <Modal
        isOpen={Boolean(selectedReview)}
        onClose={() => setSelectedReview(null)}
        title="Record HR Absence Adjudication Decision"
        subtitle={`Candidate: ${selectedReview?.candidateName} (${decisionType})`}
      >
        {selectedReview && (
          <form onSubmit={handleExecuteDecision} className="space-y-4 text-xs">
            <div className="p-3 bg-sidebar rounded-xl border border-border">
              <span className="font-bold text-text-main block">Selected Action:</span>
              <p className="text-text-muted mt-0.5">
                {decisionType === 'APPROVED_RESCHEDULE' && 'Grant priority interview reschedule voucher and push candidate to top of recovery waitlist.'}
                {decisionType === 'APPROVED_REPOOL' && 'Pardon absence with neutral status and archive candidate profile for next hiring campaign.'}
                {decisionType === 'DISQUALIFIED' && 'Mark candidate as ineligible for current cycle due to unexcused no-show.'}
              </p>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                HR Adjudication Notes (Recorded to Immutable Audit Trail)
              </label>
              <textarea
                rows={3}
                required
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedReview(null)}
                className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sign & Execute Decision
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

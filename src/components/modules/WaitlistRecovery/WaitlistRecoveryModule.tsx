import React, { useState } from 'react';
import { 
  Sparkles, 
  RotateCw, 
  UserCheck2, 
  Clock, 
  MapPin, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  Zap
} from 'lucide-react';
import { InterviewWaitlistEntry, InterviewSlot, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { formatDateTime } from '../../../lib/utils';

export interface WaitlistRecoveryModuleProps {
  waitlist: InterviewWaitlistEntry[];
  slots: InterviewSlot[];
  onFastFillSlot: (slotId: string) => Promise<void>;
  currentRole: UserRole | null;
}

export const WaitlistRecoveryModule: React.FC<WaitlistRecoveryModuleProps> = ({
  waitlist,
  slots,
  onFastFillSlot,
  currentRole,
}) => {
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [isProcessing, setIsProcessing] = useState(false);

  // Available slots that are open or recycled
  const recyclableSlots = slots.filter(s => s.status === 'AVAILABLE');

  const filteredWaitlist = waitlist.filter(w => {
    if (selectedCity !== 'ALL' && w.city !== selectedCity) return false;
    return true;
  });

  const handleExecuteFastFill = async (slotId: string) => {
    setIsProcessing(true);
    try {
      await onFastFillSlot(slotId);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              Automated Slot Recycling Engine
            </span>
            <span className="text-xs text-text-muted">• Zero Interview Waste</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Interview Waitlist & Instant Slot Recovery
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            When candidates cancel, decline, or miss confirmation windows, HireSlot immediately recycles the interview slot and prioritizes the highest-ranked waitlisted candidates with 1-click Fast-Fill dispatch.
          </p>
        </div>
      </div>

      {/* Recyclable Slots Alert Banner */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-warm-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-900 font-sans">
                {recyclableSlots.length} Recyclable Interview Slots Available for Fast-Fill
              </h4>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Match these available slots immediately with waiting candidates without manual back-and-forth emails.
              </p>
            </div>
          </div>
        </div>

        {recyclableSlots.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recyclableSlots.map((slot) => (
              <div
                key={slot.id}
                className="bg-white rounded-xl p-3 border border-amber-200/80 shadow-warm-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-text-main flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-sage-600" />
                    <span>{slot.city} • {slot.startTime}</span>
                  </div>
                  <div className="text-[11px] text-text-muted">
                    Panel: {slot.interviewerName}
                  </div>
                </div>
                <button
                  onClick={() => handleExecuteFastFill(slot.id)}
                  disabled={isProcessing || waitlist.length === 0}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-warm flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  Fast-Fill
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Waitlist Queue Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="p-4 border-b border-border bg-sidebar/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
            Priority Waitlist Queue ({filteredWaitlist.length} Candidates Waiting)
          </h3>
          <span className="text-[11px] text-text-muted">
            Ranked by composite evaluation criteria and availability
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Candidate Name</th>
                <th className="py-3 px-4">City</th>
                <th className="py-3 px-4">Track</th>
                <th className="py-3 px-4">Evaluation Score</th>
                <th className="py-3 px-4">Priority Level</th>
                <th className="py-3 px-4">Reason for Waitlist</th>
                <th className="py-3 px-5 text-right">Added On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredWaitlist.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    No candidates currently in the interview waitlist queue.
                  </td>
                </tr>
              ) : (
                filteredWaitlist.map((item) => (
                  <tr key={item.id} className="hover:bg-sidebar/30 transition-colors">
                    <td className="py-3.5 px-5 font-bold text-text-main">
                      {item.candidateName}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-text-main">
                      {item.city}
                    </td>
                    <td className="py-3.5 px-4 text-text-muted">
                      {item.roleTitle}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-sage-700">
                      {item.score}%
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant={item.priority === 'HIGH' ? 'terracotta' : 'neutral'}
                        size="sm"
                      >
                        {item.priority} Priority
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-text-muted max-w-xs truncate" title={item.reasonForWaitlist}>
                      {item.reasonForWaitlist}
                    </td>
                    <td className="py-3.5 px-5 text-right text-text-subtle font-mono text-[11px]">
                      {formatDateTime(item.waitlistedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

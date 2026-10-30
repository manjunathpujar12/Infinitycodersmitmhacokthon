import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Compass,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import { CandidateProfile, JobRole } from '../types/matching';
import { AlternativeCityOffer, JobAllocation } from '../types/allocation';
import { hireSlotService } from '../services/hireSlotService';
import { realtimeAllocationService } from '../services/realtimeAllocationService';
import { formatDateTime } from '../lib/utils';

interface CandidatePortalViewProps {
  candidates: CandidateProfile[];
  authenticatedCandidateId: string;
  onSelectCandidate: (candidateId: string) => void;
  job: JobRole;
  onRefreshData: () => void;
}

export const CandidatePortalView: React.FC<CandidatePortalViewProps> = ({
  candidates,
  authenticatedCandidateId,
  onSelectCandidate,
  job,
  onRefreshData,
}) => {
  const [candidate, setCandidate] = useState<CandidateProfile>(
    candidates.find((c) => c.id === authenticatedCandidateId) || candidates[0]
  );
  const [allocation, setAllocation] = useState<JobAllocation | undefined>(
    hireSlotService.getCandidateAllocation(candidate.id, job.id)
  );
  const [offer, setOffer] = useState<AlternativeCityOffer | undefined>(
    hireSlotService.getCandidateOffer(candidate.id, job.id)
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [declineReason, setDeclineReason] = useState<string>('');
  const [showDeclineModal, setShowDeclineModal] = useState<boolean>(false);
  const [realtimeEventCount, setRealtimeEventCount] = useState<number>(0);

  // Sync candidate selection
  useEffect(() => {
    const c = candidates.find((item) => item.id === authenticatedCandidateId) || candidates[0];
    setCandidate(c);
    setAllocation(hireSlotService.getCandidateAllocation(c.id, job.id));
    setOffer(hireSlotService.getCandidateOffer(c.id, job.id));
    setStatusMessage(null);
  }, [authenticatedCandidateId, candidates, job.id]);

  // Realtime subscription strictly filtered to authenticated candidate
  useEffect(() => {
    if (!candidate?.id) return;

    // Set up Realtime subscription filtered to candidate_id=eq.${candidate.id}
    const unsubscribe = realtimeAllocationService.subscribeToCandidateAllocation(
      candidate.id,
      (updatedAllocation) => {
        setAllocation(updatedAllocation);
        // Refresh offer state
        setOffer(hireSlotService.getCandidateOffer(candidate.id, job.id));
        setRealtimeEventCount((prev) => prev + 1);
        setStatusMessage({
          type: 'info',
          text: `Realtime update received from Supabase candidate_allocations: Status is now ${updatedAllocation.status}`,
        });
        onRefreshData();
      }
    );

    return () => {
      unsubscribe();
    };
  }, [candidate.id, job.id, onRefreshData]);

  const handleCandidateResponse = async (accepted: boolean, reason?: string) => {
    if (!offer) return;
    setIsSubmitting(true);
    setStatusMessage(null);

    try {
      // STRICT REQUIREMENT: Caller is CANDIDATE (HR simulation blocked)
      const res = await hireSlotService.respondToAlternativeCityOffer(
        offer.allocationId,
        candidate.id,
        accepted,
        reason,
        'CANDIDATE'
      );

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: res.message,
        });
        setShowDeclineModal(false);
        setAllocation(res.allocation);
        setOffer(hireSlotService.getCandidateOffer(candidate.id, job.id));
        onRefreshData();
      } else {
        setStatusMessage({
          type: 'error',
          text: res.message,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'An error occurred while processing your decision.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Candidate Portal Header & Persona Switcher */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <User className="w-4 h-4" />
            <span>Candidate Experience Portal &bull; Member 2 Coordination</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Welcome, {candidate.fullName}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Applying for: <strong className="text-slate-800">{job.title}</strong> &bull; Location Preference: <span className="text-indigo-600 font-semibold">{candidate.preferredCities.join(' → ')}</span>
          </p>
        </div>

        {/* Persona Switcher to test different candidates */}
        <div className="flex items-center space-x-3 bg-slate-50 p-2 rounded-xl border border-slate-200">
          <label htmlFor="auth-candidate-select" className="text-xs font-bold text-slate-600">Simulate Candidate:</label>
          <select
            id="auth-candidate-select"
            value={candidate.id}
            onChange={(e) => onSelectCandidate(e.target.value)}
            className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} ({c.currentCity})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Realtime Status Indicator */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold">
            Supabase Realtime Live: Filtered to <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded text-emerald-800">candidate_id=eq.{candidate.id}</code>
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[11px] text-emerald-700 font-medium">
          <span>Table: candidate_allocations</span>
          <span>&bull;</span>
          <span>Events received: {realtimeEventCount}</span>
        </div>
      </div>

      {/* Feedback Message */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-200 text-indigo-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : statusMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          ) : (
            <Radio className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-semibold">{statusMessage.text}</div>
        </div>
      )}

      {/* ACTIVE ALTERNATIVE CITY OFFER CARD (Candidate Decision) */}
      {offer && offer.status === 'PENDING' ? (
        <div className="bg-gradient-to-br from-amber-500/10 via-amber-50 to-white rounded-2xl border-2 border-amber-300 p-6 md:p-8 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-200 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-500 text-white rounded-xl shadow-sm">
                <Compass className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-amber-800">
                  Alternative Location Offer Pending Your Review
                </span>
                <h3 className="text-2xl font-black text-slate-900">
                  Opportunity in {offer.offeredCityName}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-1.5 bg-amber-100 text-amber-900 px-3 py-1.5 rounded-full text-xs font-extrabold border border-amber-300">
              <Clock className="w-4 h-4" />
              <span>Response Required by {formatDateTime(offer.expiresAt)}</span>
            </div>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p className="leading-relaxed">
              Your 1st preference location (<strong>{offer.originalPreferredCities.join(', ')}</strong>) has reached maximum capacity.
              To ensure you don&apos;t miss an opportunity, our platform calculated the nearest open hiring hub using the <strong>Haversine Great-Circle Proximity Formula</strong> and tentatively reserved a seat for you in <strong>{offer.offeredCityName}</strong> ({offer.distanceKm} km from your current hub).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Offered Hub</span>
              <p className="text-lg font-black text-indigo-600 mt-1 flex items-center space-x-1">
                <MapPin className="w-4 h-4 text-indigo-600" />
                <span>{offer.offeredCityName}</span>
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Proximity Distance</span>
              <p className="text-lg font-black text-slate-900 mt-1">
                {offer.distanceKm} km
              </p>
            </div>

            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold uppercase text-slate-400">Reserved Status</span>
              <p className="text-lg font-black text-emerald-600 mt-1">
                Held for 48 Hours
              </p>
            </div>
          </div>

          {/* Candidate Action Buttons */}
          <div className="pt-4 border-t border-amber-200 flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => handleCandidateResponse(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-emerald-600/25 disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Accept {offer.offeredCityName} Assignment</span>
            </button>

            <button
              onClick={() => setShowDeclineModal(true)}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-sm rounded-xl transition disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
              <span>Decline & Join Preferred City Waitlist</span>
            </button>
          </div>
        </div>
      ) : allocation && allocation.status === 'ALTERNATIVE_ACCEPTED' ? (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 md:p-8 space-y-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-emerald-600 text-white rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Alternative Offer Confirmed
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Seat Confirmed in {allocation.allocatedCityName}
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            You have accepted the alternative city assignment in <strong>{allocation.allocatedCityName}</strong>.
            Your allocation has been transactionally confirmed and recorded in Supabase. HR dashboard has been updated in real-time.
          </p>
        </div>
      ) : allocation && allocation.status === 'ALTERNATIVE_REJECTED' ? (
        <div className="bg-slate-50 border border-slate-300 rounded-2xl p-6 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-slate-200 text-slate-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Status: Queued to Priority Waitlist
              </span>
              <h3 className="text-xl font-bold text-slate-800">
                Waitlisted for {candidate.preferredCities[0]}
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            You declined the alternative offer. You are currently queued in the priority waitlist for your top preferred city ({candidate.preferredCities[0]}).
            When a seat opens up or new capacity is added, the system will automatically notify you.
          </p>
        </div>
      ) : allocation && allocation.status === 'ALLOCATED' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                Confirmed Location
              </span>
              <h3 className="text-xl font-bold text-slate-900">
                Allocated to {allocation.allocatedCityName}
              </h3>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Your application matched your preferred location ({allocation.allocatedCityName}). Your seat has been secured.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-500 space-y-2">
          <Clock className="w-8 h-8 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700">Application Under Review</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Your profile has been submitted for {job.title}. If your preferred location reaches capacity,
            an alternative location recommendation will appear here for your review and consent.
          </p>
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in">
            <h3 className="font-extrabold text-lg text-slate-900">
              Decline Alternative City Offer?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you decline <strong>{offer?.offeredCityName}</strong>, the tentatively reserved seat will be released back to other candidates.
              You will automatically be placed in the priority waitlist for your preferred city (<strong>{candidate.preferredCities[0]}</strong>).
            </p>

            <div>
              <label htmlFor="candidate-decline-reason" className="text-xs font-bold text-slate-700 block mb-1">
                Reason for Declining (Optional):
              </label>
              <textarea
                id="candidate-decline-reason"
                rows={3}
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="e.g. Relocation distance too far, personal/family commitments..."
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Go Back
              </button>
              <button
                onClick={() => handleCandidateResponse(false, declineReason)}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Confirm Decline & Join Waitlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


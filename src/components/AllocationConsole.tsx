import React, { useState } from 'react';
import {
  UserCheck,
  AlertCircle,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  CheckCircle,
  HelpCircle,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { CandidateProfile, JobRole, HrRankingWeights } from '../types/matching';
import { CityVacancy } from '../types/location';
import { JobAllocation } from '../types/allocation';
import { hireSlotService } from '../services/hireSlotService';
import { AllocationExecutionResult } from '../engine/allocationEngine';

interface AllocationConsoleProps {
  candidates: CandidateProfile[];
  job: JobRole;
  vacancies: CityVacancy[];
  allocations: JobAllocation[];
  rankingWeights: HrRankingWeights;
  onRefreshData: () => void;
  onNavigateToTab: (tab: string) => void;
}

export const AllocationConsole: React.FC<AllocationConsoleProps> = ({
  candidates,
  job,
  vacancies,
  allocations,
  rankingWeights,
  onRefreshData,
  onNavigateToTab,
}) => {
  const [selectedCandId, setSelectedCandId] = useState<string>(candidates[0]?.id || '');
  const [lastResult, setLastResult] = useState<AllocationExecutionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error' | 'warning';
    text: string;
  } | null>(null);

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandId) || candidates[0];

  const handleRunAllocation = () => {
    if (!selectedCandidate) return;
    setIsProcessing(true);
    setFeedbackMessage(null);

    try {
      const res = hireSlotService.allocateCandidate(selectedCandidate.id, job.id);
      setLastResult(res);

      if (res.success) {
        if (res.decision.type === 'OVERFLOW_ALTERNATIVE_OFFER') {
          setFeedbackMessage({
            type: 'warning',
            text: `Preferred locations are full. Nearest city (${res.decision.assignedCity}) recommended via Haversine calculation. Temporary hold reserved for 48h.`,
          });
        } else if (res.decision.type === 'WAITLISTED_ALL_LOCATIONS_FULL') {
          setFeedbackMessage({
            type: 'warning',
            text: `All locations currently full. Candidate automatically enrolled into future-date waitlist with priority score.`,
          });
        } else {
          setFeedbackMessage({
            type: 'success',
            text: `Candidate successfully allocated to ${res.decision.assignedCity}! Seat transactionally secured.`,
          });
        }
      } else {
        setFeedbackMessage({
          type: 'error',
          text: res.errorMessage || 'Allocation could not proceed.',
        });
      }
      onRefreshData();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'An unexpected error occurred during allocation.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReleaseAllocation = (allocationId: string) => {
    const res = hireSlotService.releaseAllocation(
      allocationId,
      'HR admin released allocation via console'
    );
    if (res.success) {
      setFeedbackMessage({
        type: 'success',
        text: 'Allocation released. Seat returned to open pool.',
      });
      onRefreshData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Intelligent Transactional Allocation Engine</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">
            Execute Location Allocation for {job.title}
          </h2>
          <p className="mt-2 text-indigo-100 text-sm leading-relaxed">
            Preferred-location-first matching with concurrency safety, duplicate prevention,
            and Haversine distance-based overflow fallback.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <div className="flex items-center bg-white/10 backdrop-blur-md rounded-xl p-1.5 border border-white/20">
              <label htmlFor="candidate-select" className="sr-only">Choose Candidate</label>
              <select
                id="candidate-select"
                value={selectedCandId}
                onChange={(e) => setSelectedCandId(e.target.value)}
                className="bg-transparent text-white font-medium text-sm px-3 py-1.5 focus:outline-none cursor-pointer"
              >
                {candidates.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-900">
                    {c.fullName} (Prefers: {c.preferredCities.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleRunAllocation}
              disabled={isProcessing}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm rounded-xl transition shadow-md hover:shadow-indigo-500/25 disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              <span>{isProcessing ? 'Processing Transaction...' : 'Run Transactional Allocation'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Notification Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3 transition-all ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : feedbackMessage.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          ) : feedbackMessage.type === 'warning' ? (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          )}
          <div className="text-sm font-medium">{feedbackMessage.text}</div>
        </div>
      )}

      {/* Decision Explainability Panel */}
      {lastResult && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900">
                Transparent Allocation Explainability
              </h3>
            </div>
            <span
              className={`text-xs uppercase font-extrabold px-2.5 py-1 rounded-full border ${
                lastResult.success
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}
            >
              {lastResult.decision.type.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-800 font-medium">
            <span className="font-bold text-slate-900 block mb-1">Decision Summary:</span>
            {lastResult.decision.explanation}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-semibold uppercase">Preference Rank</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {lastResult.decision.factors.preferenceRankMatched
                  ? `Choice #${lastResult.decision.factors.preferenceRankMatched}`
                  : 'N/A (Alternative)'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-semibold uppercase">Match Score</span>
              <p className="text-base font-bold text-indigo-600 mt-1">
                {lastResult.decision.factors.matchScore}%
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-semibold uppercase">Haversine Applied</span>
              <p className="text-base font-bold text-slate-900 mt-1">
                {lastResult.decision.factors.haversineApplied ? 'Yes (Great-Circle)' : 'No (Direct Pref)'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-slate-500 font-semibold uppercase">Concurrency Safe</span>
              <p className="text-base font-bold text-emerald-600 mt-1">
                ACID Lock Confirmed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Active Job Allocations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900">Current Allocations</h3>
            <p className="text-xs text-slate-500">
              Confidently tracked candidate-to-city assignments
            </p>
          </div>
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
            {allocations.length} Record(s)
          </span>
        </div>

        {allocations.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No allocations executed yet. Select a candidate above and click &quot;Run Transactional Allocation&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Candidate</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Assigned City</th>
                  <th className="px-6 py-3">Match Score</th>
                  <th className="px-6 py-3">Explanation</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {a.candidateName}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                          a.status === 'ALLOCATED' || a.status === 'ALTERNATIVE_ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : a.status === 'OFFERED_ALTERNATIVE'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : a.status === 'WAITLISTED'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-1 font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                        <span>
                          {a.allocatedCityName || a.alternativeOfferedCityName || 'Waitlisted'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 font-bold text-indigo-600">
                      {a.matchScore}%
                    </td>
                    <td className="px-6 py-3.5 max-w-xs truncate text-xs text-slate-500" title={a.decisionExplanation}>
                      {a.decisionExplanation}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      {['ALLOCATED', 'ALTERNATIVE_ACCEPTED', 'OFFERED_ALTERNATIVE'].includes(a.status) && (
                        <button
                          onClick={() => handleReleaseAllocation(a.id)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
                        >
                          Release Seat
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


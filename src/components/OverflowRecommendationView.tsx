import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Clock,
  ShieldCheck,
  Lock,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Radio,
} from 'lucide-react';
import { CandidateProfile, JobRole } from '../types/matching';
import { CityVacancy, CityDistanceRecommendation } from '../types/location';
import { AlternativeCityOffer, JobAllocation } from '../types/allocation';
import { hireSlotService } from '../services/hireSlotService';
import { formatDateTime } from '../lib/utils';

interface OverflowRecommendationViewProps {
  candidates: CandidateProfile[];
  job: JobRole;
  vacancies: CityVacancy[];
  alternativeOffers: AlternativeCityOffer[];
  allocations: JobAllocation[];
  onRefreshData: () => void;
  onNavigateToCandidatePortal?: (candidateId: string) => void;
}

export const OverflowRecommendationView: React.FC<OverflowRecommendationViewProps> = ({
  candidates,
  job,
  vacancies,
  alternativeOffers,
  allocations,
  onRefreshData,
  onNavigateToCandidatePortal,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[1]?.id || candidates[0]?.id || ''
  );

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  // Compute live Haversine recommendations for the selected candidate
  const recommendations: CityDistanceRecommendation[] = selectedCandidate
    ? hireSlotService.getNearestCityRecommendations(selectedCandidate.id, job.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Intro Banner */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Compass className="w-4 h-4" />
            <span>Haversine Great-Circle Proximity Engine</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">
            Overflow & Nearest-City Recommendations
          </h2>
          <p className="text-sm text-slate-600">
            Calculates great-circle distance (km) when preferred hubs reach capacity and manages candidate offers.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="overflow-candidate" className="text-xs font-semibold text-slate-500">Candidate:</label>
          <select
            id="overflow-candidate"
            value={selectedCandidateId}
            onChange={(e) => setSelectedCandidateId(e.target.value)}
            className="bg-slate-50 border border-slate-300 text-slate-800 text-sm font-semibold rounded-lg px-3 py-1.5 focus:outline-none"
          >
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.fullName} (From: {c.currentCity || 'Origin'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Security Invariant Notice for HR / Member 3 */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
        <div className="p-2 bg-amber-100 text-amber-800 rounded-lg flex-shrink-0 mt-0.5">
          <Lock className="w-4 h-4" />
        </div>
        <div className="text-sm">
          <h4 className="font-bold text-amber-900 flex items-center space-x-2">
            <span>Candidate Consent Invariant Enforced</span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-900">
              Rule 8 Active
            </span>
          </h4>
          <p className="text-amber-800 text-xs mt-1 leading-relaxed">
            In compliance with HireSlot business rules, <strong>HR is strictly prohibited from simulating or recording candidate consent</strong>.
            Alternative city assignments require the candidate to independently accept or decline through the Candidate Portal.
            Status changes sync instantly to HR via Supabase Realtime on the shared <code className="bg-amber-100 px-1 rounded font-mono">candidate_allocations</code> table.
          </p>
        </div>
      </div>

      {/* Real-time Haversine Recommendations for Selected Candidate */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">
              Nearest Non-Full Hubs for {selectedCandidate?.fullName}
            </h3>
            <p className="text-xs text-slate-500">
              Origin: {selectedCandidate?.currentCity} (
              {selectedCandidate?.currentCoordinates?.latitude.toFixed(2)}° N,{' '}
              {selectedCandidate?.currentCoordinates?.longitude.toFixed(2)}° E)
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            Formula: Haversine R=6371km
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6">
          {recommendations.map((rec, i) => (
            <div
              key={rec.cityId}
              className="p-5 rounded-xl border border-slate-200 bg-slate-50/40 hover:bg-slate-50 transition"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Rank #{i + 1}
                  </span>
                  <h4 className="font-bold text-lg text-slate-900 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-indigo-600" />
                    <span>{rec.cityName}</span>
                  </h4>
                </div>
                <span className="text-sm font-black text-indigo-600">
                  {rec.distanceKm} km
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Available Seats:</span>
                  <strong className="text-emerald-600 font-bold">
                    {rec.availableCapacity} seats
                  </strong>
                </div>
                <p className="text-slate-500 text-[11px] mt-2">
                  {rec.recommendationReason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* HR Monitoring View: Shared candidate_allocations Status */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-slate-900">
                Alternative City Offers (Live HR View)
              </h3>
              <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                Realtime Synced
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Live status tracking from <code className="font-mono text-slate-700 font-semibold">candidate_allocations</code> table
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200">
            {alternativeOffers.length} Active Record(s)
          </span>
        </div>

        {alternativeOffers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active alternative offers currently issued. When an applicant&apos;s preferred city is full,
            executing an allocation generates an alternative offer with a 48h temporary reservation hold.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alternativeOffers.map((offer) => {
              const cand = candidates.find((c) => c.id === offer.candidateId);
              const isPending = offer.status === 'PENDING';

              return (
                <div key={offer.allocationId} className="p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="space-y-1.5 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-base text-slate-900">
                        {cand?.fullName || 'Candidate'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                          offer.status === 'ACCEPTED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : offer.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {isPending ? 'AWAITING CANDIDATE DECISION' : `DECISION: ${offer.status}`}
                      </span>
                    </div>

                    <p className="text-sm text-slate-700 font-medium">
                      Offered City: <strong className="text-indigo-600">{offer.offeredCityName}</strong> ({offer.distanceKm} km away)
                    </p>
                    <p className="text-xs text-slate-500">
                      Original Choice: <span className="line-through">{offer.originalPreferredCities.join(', ')}</span> (Capacity Full) &bull; Reserved Hold Expires: {formatDateTime(offer.expiresAt)}
                    </p>
                  </div>

                  {/* HR Action Block: HR cannot simulate consent, but can view status and link to Candidate Portal */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    {isPending ? (
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                        <div className="flex items-center space-x-1.5 text-amber-700 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>Candidate has 48h to respond</span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Seat tentatively held in {offer.offeredCityName}
                        </p>
                        {onNavigateToCandidatePortal && (
                          <button
                            onClick={() => onNavigateToCandidatePortal(offer.candidateId)}
                            className="mt-1.5 inline-flex items-center space-x-1 text-indigo-600 hover:text-indigo-800 font-semibold text-xs transition"
                          >
                            <span>Open Candidate Portal to Test Workflow</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-xs font-semibold px-3 py-2 rounded-lg bg-slate-50 border border-slate-200">
                        {offer.status === 'ACCEPTED' ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span className="text-emerald-800">
                              Accepted by Candidate &bull; Seat Secured
                            </span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 text-rose-600" />
                            <span className="text-rose-800">
                              Declined by Candidate &bull; Enqueued to Waitlist
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

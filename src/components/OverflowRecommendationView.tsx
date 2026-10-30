import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
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
}

export const OverflowRecommendationView: React.FC<OverflowRecommendationViewProps> = ({
  candidates,
  job,
  vacancies,
  alternativeOffers,
  allocations,
  onRefreshData,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[1]?.id || candidates[0]?.id || ''
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const selectedCandidate =
    candidates.find((c) => c.id === selectedCandidateId) || candidates[0];

  // Compute live Haversine recommendations for the selected candidate
  const recommendations: CityDistanceRecommendation[] = selectedCandidate
    ? hireSlotService.getNearestCityRecommendations(selectedCandidate.id, job.id)
    : [];

  const handleCandidateResponse = (
    allocationId: string,
    candidateId: string,
    accepted: boolean
  ) => {
    const res = hireSlotService.respondToAlternativeCityOffer(
      allocationId,
      candidateId,
      accepted,
      accepted ? undefined : 'Prefers not to relocate outside home state'
    );
    setActionFeedback(res.message);
    onRefreshData();
  };

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
            Calculates great-circle distance (km) when preferred hubs reach capacity and manages candidate acceptance/rejection.
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

      {actionFeedback && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-semibold rounded-xl flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

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

      {/* Candidate Decision Portal: Active Alternative City Offers */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-amber-50/30 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">
              Candidate Alternative Offer Decision Portal
            </h3>
            <p className="text-xs text-slate-500">
              Demonstrates candidate acceptance/rejection workflow of Haversine recommended cities
            </p>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
            {alternativeOffers.length} Active Offer(s)
          </span>
        </div>

        {alternativeOffers.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            No active alternative offers pending review. When an applicant&apos;s preferred city is full,
            executing an allocation generates an alternative offer with a 48h temporary reservation hold.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {alternativeOffers.map((offer) => {
              const cand = candidates.find((c) => c.id === offer.candidateId);
              const isPending = offer.status === 'PENDING';

              return (
                <div key={offer.allocationId} className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1 max-w-xl">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-base text-slate-900">
                        {cand?.fullName || 'Candidate'}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          offer.status === 'ACCEPTED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : offer.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {offer.status}
                      </span>
                    </div>

                    <p className="text-sm text-slate-600 font-medium">
                      Offered City: <strong className="text-indigo-600">{offer.offeredCityName}</strong> ({offer.distanceKm} km away)
                    </p>
                    <p className="text-xs text-slate-500">
                      Original Preference: {offer.originalPreferredCities.join(', ')} (Full) &bull; Hold expires: {formatDateTime(offer.expiresAt)}
                    </p>
                  </div>

                  {isPending ? (
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() =>
                          handleCandidateResponse(offer.allocationId, offer.candidateId, true)
                        }
                        className="inline-flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept City Offer</span>
                      </button>

                      <button
                        onClick={() =>
                          handleCandidateResponse(offer.allocationId, offer.candidateId, false)
                        }
                        className="inline-flex items-center space-x-1 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold border border-rose-200 transition"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Decline (Queue to Waitlist)</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">
                      Decision Completed ({offer.status})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};


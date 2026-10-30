import React from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { Badge } from '../common/Badge';
import {
  Building,
  MapPin,
  Compass,
  CheckCircle2,
  XCircle,
  Gift,
  Clock,
  Home,
  Check,
  X,
  AlertCircle
} from 'lucide-react';

export const AllocationStatusPage: React.FC = () => {
  const {
    candidate,
    alternativeOffer,
    respondToAlternativeOffer
  } = useCandidateAuth();

  const isAllocated = Boolean(candidate.allocatedCity);
  const hasAlternativeOffer = Boolean(alternativeOffer);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Location Allocation & Alternative City Offers
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Track your assigned work location, office hub allocation, and special relocation packages
        </p>
      </div>

      {/* Allocation Status Hero Card */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-light flex items-center justify-center text-primary flex-shrink-0">
              <Building className="w-7 h-7" />
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-textMuted block">
                Office Hub Status
              </span>
              <h3 className="text-lg font-bold text-textPrimary flex items-center gap-2">
                {isAllocated ? (
                  <>
                    <span>Allocated: {candidate.allocatedCity}</span>
                    <Badge variant="success" size="sm">
                      CONFIRMED
                    </Badge>
                  </>
                ) : (
                  <>
                    <span>Allocation In Review</span>
                    <Badge variant="neutral" size="sm">
                      PENDING
                    </Badge>
                  </>
                )}
              </h3>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold text-textMuted block">
              Preferences Ordered
            </span>
            <div className="flex items-center gap-1.5 mt-0.5 font-mono text-xs font-semibold text-textPrimary">
              {candidate.locationPreferences.map((p) => (
                <span key={p.city} className="bg-sidebar px-2 py-0.5 rounded border border-borderMuted">
                  #{p.priority} {p.city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alternative City Offer Banner / Decision Card */}
      {alternativeOffer && alternativeOffer.status === 'PENDING' && (
        <div className="bg-secondary-light/40 border-2 border-secondary/40 rounded-2xl p-6 shadow-subtle space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary text-white rounded-xl shadow-subtle">
                <Gift className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-dark">
                  Official Corporate Mobility Offer
                </span>
                <h3 className="text-lg font-extrabold text-textPrimary">
                  Alternative City Placement in {alternativeOffer.offeredCity}
                </h3>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-secondary-dark bg-secondary-light px-2.5 py-1 rounded-lg border border-secondary/30 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 3 Days to Respond
            </span>
          </div>

          <p className="text-xs text-textPrimary leading-relaxed bg-cards/80 p-4 rounded-xl border border-secondary/20">
            {alternativeOffer.notes}
          </p>

          {/* Relocation Package Perks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-cards rounded-xl border border-borderMuted flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-light text-primary font-bold">
                ₹{alternativeOffer.relocationBonusOffered.toLocaleString()}
              </div>
              <div>
                <span className="font-bold text-textPrimary block">Lump-Sum Relocation Grant</span>
                <span className="text-[11px] text-textMuted">Disbursed on onboarding via direct payroll</span>
              </div>
            </div>

            <div className="p-3 bg-cards rounded-xl border border-borderMuted flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-light text-primary">
                <Home className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-textPrimary block">14 Days Executive Guest House</span>
                <span className="text-[11px] text-textMuted">Paid lodging while securing permanent residence</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
            <button
              onClick={() => respondToAlternativeOffer('DECLINED')}
              className="w-full sm:w-auto px-4 py-2 border border-borderDark text-textPrimary hover:bg-sidebar rounded-xl text-xs font-bold transition-colors"
            >
              Decline Offer & Wait for Primary City
            </button>
            <button
              onClick={() => respondToAlternativeOffer('ACCEPTED')}
              className="w-full sm:w-auto px-6 py-2 bg-secondary text-white rounded-xl text-xs font-bold hover:bg-secondary-hover transition-colors shadow-subtle flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" /> Accept {alternativeOffer.offeredCity} Placement
            </button>
          </div>
        </div>
      )}

      {/* Alternative Offer Resolved Feedback */}
      {alternativeOffer && alternativeOffer.status === 'ACCEPTED' && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-950 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div>
            <span className="font-bold block">Alternative City Offer Accepted</span>
            <span>
              You confirmed placement for <b>{alternativeOffer.offeredCity}</b> with the ₹
              {alternativeOffer.relocationBonusOffered.toLocaleString()} relocation package.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};


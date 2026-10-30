import React, { useState } from 'react';
import { 
  Share2, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Send, 
  Building,
  UserCheck,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { Candidate, CandidateAllocation, CityVacancy, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatCurrency, formatDate } from '../../../lib/utils';

export interface OverflowManagementModuleProps {
  candidates: Candidate[];
  allocations: CandidateAllocation[];
  vacancies: CityVacancy[];
  onOfferAlternativeCity: (
    allocationId: string, 
    alternativeCity: string, 
    relocationStipend: number, 
    notes: string
  ) => Promise<void>;
  onRespondAlternativeOffer: (allocationId: string, accept: boolean) => Promise<void>;
  currentRole: UserRole | null;
}

export const OverflowManagementModule: React.FC<OverflowManagementModuleProps> = ({
  candidates,
  allocations,
  vacancies,
  onOfferAlternativeCity,
  onRespondAlternativeOffer,
  currentRole,
}) => {
  const [selectedOfferModal, setSelectedOfferModal] = useState<CandidateAllocation | null>(null);
  const [targetCity, setTargetCity] = useState('Pune');
  const [stipendAmount, setStipendAmount] = useState(2800);
  const [offerNotes, setOfferNotes] = useState('');

  // Available open cities with remaining capacity
  const availableVacancies = vacancies.map(v => {
    const allocated = allocations.filter(a => a.allocatedCity === v.city && a.status === 'ALLOCATED').length;
    const remaining = Math.max(0, v.targetHeadcount - allocated);
    return { ...v, remaining };
  });

  // Filter allocations that are OVERFLOW or have ALTERNATIVE offers
  const overflowAllocations = allocations.filter(
    a => a.status === 'OVERFLOW' || 
         a.status === 'ALTERNATIVE_OFFERED' || 
         a.status === 'ALTERNATIVE_ACCEPTED' || 
         a.status === 'ALTERNATIVE_DECLINED'
  );

  const handleOpenOfferModal = (alloc: CandidateAllocation) => {
    setSelectedOfferModal(alloc);
    // Find a city with open vacancy
    const bestOpenCity = availableVacancies.find(v => v.city !== alloc.allocatedCity && v.remaining > 0);
    setTargetCity(bestOpenCity ? bestOpenCity.city : 'Pune');
    setStipendAmount(2800);
    setOfferNotes(`Proposed placement at ${bestOpenCity?.city || 'Pune'} Hub with standard Tier-B corporate relocation support.`);
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOfferModal) return;
    await onOfferAlternativeCity(selectedOfferModal.id, targetCity, stipendAmount, offerNotes);
    setSelectedOfferModal(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800 uppercase tracking-wider">
              Capacity Overflow Balancing
            </span>
            <span className="text-xs text-text-muted">• Phase 1 Location Routing</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Overflow Candidates & Alternative City Offers
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            When primary tech hubs reach 100% capacity quotas, high-caliber candidates are placed in the Overflow Pool. Extend alternative city offers bundled with relocation stipends without losing top talent.
          </p>
        </div>
      </div>

      {/* City Capacity Balances Snapshot */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {availableVacancies.map((v) => (
          <div key={v.id} className="bg-card rounded-xl p-4 border border-border shadow-warm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-main flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-sage-600" />
                {v.city}
              </span>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                v.remaining > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
              }`}>
                {v.remaining > 0 ? `${v.remaining} Open Seats` : 'Full'}
              </span>
            </div>
            <div className="mt-2 text-xs text-text-muted">
              Target: {v.targetHeadcount} seats (Buffer: +{v.bufferPercentage}%)
            </div>
          </div>
        ))}
      </div>

      {/* Overflow Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="p-4 border-b border-border bg-sidebar/50 flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
            Overflow Candidates Queue ({overflowAllocations.length})
          </h3>
          <span className="text-[11px] text-text-muted">
            Candidates awaiting alternative location assignment or response
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Candidate</th>
                <th className="py-3 px-4">Primary Choice (Full)</th>
                <th className="py-3 px-4">Match Score</th>
                <th className="py-3 px-4">Alternative City Offer</th>
                <th className="py-3 px-4">Offer Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {overflowAllocations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    No candidates currently in the overflow pool. All primary capacities are balanced.
                  </td>
                </tr>
              ) : (
                overflowAllocations.map((alloc) => {
                  const candidate = candidates.find(c => c.id === alloc.candidateId);
                  if (!candidate) return null;

                  return (
                    <tr key={alloc.id} className="hover:bg-sidebar/30 transition-colors">
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-text-main">{candidate.fullName}</div>
                        <div className="text-[11px] text-text-muted">{candidate.email} • {candidate.yearsExperience}y exp</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <MapPin className="w-3 h-3" />
                          {alloc.allocatedCity} (100% Full)
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-text-main">
                        {alloc.matchScore}%
                      </td>
                      <td className="py-3.5 px-4">
                        {alloc.alternativeCity ? (
                          <div>
                            <div className="font-semibold text-text-main flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-sage-600" />
                              <span>{alloc.alternativeCity}</span>
                            </div>
                            <div className="text-[11px] text-terracotta-700 font-bold mt-0.5">
                              Stipend: {formatCurrency(alloc.relocationStipendOffered || 0)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-subtle italic">No alternative offer made</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={
                            alloc.status === 'ALTERNATIVE_ACCEPTED' ? 'success' :
                            alloc.status === 'ALTERNATIVE_OFFERED' ? 'warning' :
                            alloc.status === 'ALTERNATIVE_DECLINED' ? 'danger' : 'terracotta'
                          }
                          size="sm"
                        >
                          {alloc.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {alloc.status === 'OVERFLOW' && (
                            <button
                              onClick={() => handleOpenOfferModal(alloc)}
                              className="px-2.5 py-1 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg font-semibold flex items-center gap-1 shadow-warm-sm transition-colors"
                            >
                              <Send className="w-3 h-3" />
                              Offer Alt City
                            </button>
                          )}

                          {alloc.status === 'ALTERNATIVE_OFFERED' && (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-amber-700 font-medium flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                                Awaiting Portal Decision
                              </span>
                              <button
                                onClick={() => {
                                  if (confirm('Record candidate verbal/phone acceptance received directly by HR?')) {
                                    onRespondAlternativeOffer(alloc.id, true);
                                  }
                                }}
                                title="Record manual phone acceptance received by HR"
                                className="px-2 py-1 bg-sidebar hover:bg-emerald-50 text-emerald-700 border border-border rounded-lg font-semibold text-[10px] transition-colors"
                              >
                                Record Phone Consent
                              </button>
                            </div>
                          )}

                          {alloc.status === 'ALTERNATIVE_ACCEPTED' && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Accepted by Candidate
                            </span>
                          )}

                          {alloc.status === 'ALTERNATIVE_DECLINED' && (
                            <span className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              Declined by Candidate
                            </span>
                          )}

                          {alloc.status === 'ALTERNATIVE_ACCEPTED' && (
                            <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Confirmed Transfer
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alternative City Offer Formulation Modal */}
      <Modal
        isOpen={Boolean(selectedOfferModal)}
        onClose={() => setSelectedOfferModal(null)}
        title="Formulate Alternative City Placement Offer"
        subtitle="Offer an alternate location vacancy with corporate relocation assistance."
      >
        {selectedOfferModal && (
          <form onSubmit={handleSendOffer} className="space-y-4 text-xs">
            <div className="p-3 bg-sidebar rounded-xl border border-border">
              <span className="font-bold text-text-main block">Candidate:</span>
              <p className="text-text-muted mt-0.5">
                Primary preference was <strong>{selectedOfferModal.allocatedCity}</strong>, which has filled all available quota slots.
              </p>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                Select Alternative Placement City
              </label>
              <select
                value={targetCity}
                onChange={(e) => setTargetCity(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-semibold focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                {availableVacancies.map(v => (
                  <option key={v.city} value={v.city}>
                    {v.city} ({v.remaining} Open Seats remaining)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                Relocation Allowance / Stipend ($)
              </label>
              <input
                type="number"
                min={500}
                max={15000}
                step={100}
                required
                value={stipendAmount}
                onChange={(e) => setStipendAmount(Number(e.target.value))}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
              <span className="text-[11px] text-text-muted mt-1 block">
                Standard Outstation Relocation Policy Guideline: $2,400 to $3,200.
              </span>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                Candidate Proposal Notes & Justification
              </label>
              <textarea
                rows={3}
                required
                value={offerNotes}
                onChange={(e) => setOfferNotes(e.target.value)}
                placeholder="Include details of office facilities, accommodation support, and joining bonus..."
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedOfferModal(null)}
                className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-terracotta-500 hover:bg-terracotta-600 text-white rounded-lg font-semibold shadow-warm flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Dispatch Alternative Offer
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

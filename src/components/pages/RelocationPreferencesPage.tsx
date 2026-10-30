import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { RelocationPreferences } from '../../types';
import { Compass, CheckCircle2, Home, Truck, Clock, Save, Info } from 'lucide-react';

export const RelocationPreferencesPage: React.FC = () => {
  const { candidate, updateRelocationPreferences } = useCandidateAuth();

  const [willingToRelocate, setWillingToRelocate] = useState(candidate.relocation.willingToRelocate);
  const [preferredTimeline, setPreferredTimeline] = useState(candidate.relocation.preferredTimeline);
  const [earliestRelocationDate, setEarliestRelocationDate] = useState(
    candidate.relocation.earliestRelocationDate || '2026-11-20'
  );
  const [requiresCorporateStay, setRequiresCorporateStay] = useState(candidate.relocation.requiresCorporateStay);
  const [requiresMovingAssistance, setRequiresMovingAssistance] = useState(candidate.relocation.requiresMovingAssistance);
  const [conditionsNotes, setConditionsNotes] = useState(candidate.relocation.conditionsNotes || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateRelocationPreferences({
      willingToRelocate,
      preferredTimeline,
      earliestRelocationDate,
      requiresCorporateStay,
      requiresMovingAssistance,
      conditionsNotes
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Willingness to Relocate & Mobility Terms
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Specify your relocation readiness, preferred transition timeline, and accommodation requirements
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Main Willingness Toggle Card */}
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" /> Active Willingness to Relocate
            </h3>
            <p className="text-xs text-textMuted">
              Confirm your willingness to move to office locations outside your current residence
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={willingToRelocate}
              onChange={(e) => setWillingToRelocate(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-borderDark peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Detailed Timeline and Conditions */}
        <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
          <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
            Relocation Availability & Logistics
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Preferred Transition Notice Window
              </label>
              <select
                value={preferredTimeline}
                onChange={(e) => setPreferredTimeline(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
              >
                <option value="IMMEDIATE">Immediate (Within 7-10 Days)</option>
                <option value="15_DAYS">15 Days Notice</option>
                <option value="30_DAYS">30 Days Standard Transition</option>
                <option value="60_DAYS">60 Days (Requires Extended Notice)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
                Earliest Date Available to Join at New Location
              </label>
              <input
                type="date"
                required
                value={earliestRelocationDate}
                onChange={(e) => setEarliestRelocationDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none"
              />
            </div>
          </div>

          {/* Support Requirements Checkboxes */}
          <div className="pt-2 border-t border-borderMuted space-y-3">
            <span className="text-xs font-bold text-textPrimary uppercase tracking-wider block">
              Corporate Relocation Package Requisites
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-borderMuted bg-[#FAF9F5] cursor-pointer hover:border-borderDark transition-colors">
                <input
                  type="checkbox"
                  checked={requiresCorporateStay}
                  onChange={(e) => setRequiresCorporateStay(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <div className="text-xs">
                  <span className="font-bold text-textPrimary flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-primary" /> Corporate Guest House (14 Days)
                  </span>
                  <p className="text-[11px] text-textMuted mt-0.5 leading-relaxed">
                    Complimentary company guest house stay while finding permanent local housing.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-xl border border-borderMuted bg-[#FAF9F5] cursor-pointer hover:border-borderDark transition-colors">
                <input
                  type="checkbox"
                  checked={requiresMovingAssistance}
                  onChange={(e) => setRequiresMovingAssistance(e.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                <div className="text-xs">
                  <span className="font-bold text-textPrimary flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" /> Household Freight & Movers Grant
                  </span>
                  <p className="text-[11px] text-textMuted mt-0.5 leading-relaxed">
                    Direct reimbursement for packing, transit insurance, and baggage freight.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-textPrimary uppercase tracking-wider mb-1.5">
              Specific Conditions or Family Notes
            </label>
            <textarea
              rows={3}
              value={conditionsNotes}
              onChange={(e) => setConditionsNotes(e.target.value)}
              placeholder="e.g. Spouse relocation support needed, school admission timeline requirements..."
              className="w-full px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs text-textPrimary focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> Save Relocation Terms
          </button>
        </div>
      </form>
    </div>
  );
};


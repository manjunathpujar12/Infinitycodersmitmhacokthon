import React, { useState } from 'react';
import { 
  Plane, 
  Plus, 
  Edit3, 
  Check, 
  Train, 
  Car, 
  Receipt, 
  DollarSign, 
  ShieldCheck 
} from 'lucide-react';
import { TravelPolicyTier, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatCurrency } from '../../../lib/utils';

export interface TravelPolicyModuleProps {
  policies: TravelPolicyTier[];
  onUpdatePolicies: (policies: TravelPolicyTier[]) => Promise<void>;
  currentRole: UserRole | null;
}

export const TravelPolicyModule: React.FC<TravelPolicyModuleProps> = ({
  policies,
  onUpdatePolicies,
  currentRole,
}) => {
  const [editingTier, setEditingTier] = useState<TravelPolicyTier | null>(null);
  const [formData, setFormData] = useState<TravelPolicyTier>({
    id: '',
    tierName: '',
    minDistanceKm: 0,
    maxDistanceKm: 50,
    allowedModes: ['CAB'],
    maxTicketReimbursement: 40,
    dailyMealsAllowance: 25,
    receiptRequiredThreshold: 15,
    notes: '',
  });

  const handleOpenEdit = (tier: TravelPolicyTier) => {
    setEditingTier(tier);
    setFormData({ ...tier });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTier) return;
    const updated = policies.map(p => p.id === editingTier.id ? formData : p);
    await onUpdatePolicies(updated);
    setEditingTier(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              Corporate Compensation Guidelines
            </span>
            <span className="text-xs text-text-muted">• Candidate Travel Policy</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Travel Reimbursement Policy Configuration
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Establish enterprise guidelines for outstation candidate transit, allowable transport modes, meal per-diems, and receipt documentation audit thresholds.
          </p>
        </div>
      </div>

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {policies.map((tier) => (
          <div
            key={tier.id}
            className="bg-card rounded-2xl p-6 border border-border shadow-warm hover:shadow-warm-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Distance Band</span>
                  <h3 className="text-base font-bold text-text-main font-sans mt-0.5">{tier.tierName}</h3>
                  <p className="text-xs text-text-muted font-mono mt-0.5">
                    {tier.minDistanceKm} km – {tier.maxDistanceKm} km
                  </p>
                </div>
                <button
                  onClick={() => handleOpenEdit(tier)}
                  className="p-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted hover:text-text-main transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Financial Caps */}
              <div className="mt-4 p-3.5 rounded-xl bg-sidebar/50 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Transit Ticket Cap:</span>
                  <span className="font-bold text-text-main">{formatCurrency(tier.maxTicketReimbursement)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Daily Meal Per-Diem:</span>
                  <span className="font-bold text-sage-700">{formatCurrency(tier.dailyMealsAllowance)} / day</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Receipt Audit Threshold:</span>
                  <span className="font-bold text-terracotta-700">&gt; {formatCurrency(tier.receiptRequiredThreshold)}</span>
                </div>
              </div>

              {/* Allowed Transit Modes */}
              <div className="mt-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                  Authorized Transport Modes
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {tier.allowedModes.map(mode => (
                    <span key={mode} className="text-[11px] font-semibold px-2 py-0.5 rounded bg-white border border-border text-text-main shadow-warm-sm">
                      {mode}
                    </span>
                  ))}
                </div>
              </div>

              {/* Policy notes */}
              <p className="mt-3 text-xs text-text-muted leading-relaxed italic">
                "{tier.notes}"
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Tier Modal */}
      <Modal
        isOpen={Boolean(editingTier)}
        onClose={() => setEditingTier(null)}
        title="Configure Travel Policy Tier Limits"
        subtitle={`Band: ${editingTier?.tierName}`}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block text-text-main font-semibold mb-1">Tier Name</label>
            <input
              type="text"
              required
              value={formData.tierName}
              onChange={(e) => setFormData({ ...formData, tierName: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Min Distance (km)</label>
              <input
                type="number"
                min={0}
                value={formData.minDistanceKm}
                onChange={(e) => setFormData({ ...formData, minDistanceKm: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Max Distance (km)</label>
              <input
                type="number"
                min={0}
                value={formData.maxDistanceKm}
                onChange={(e) => setFormData({ ...formData, maxDistanceKm: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Max Ticket ($)</label>
              <input
                type="number"
                min={0}
                value={formData.maxTicketReimbursement}
                onChange={(e) => setFormData({ ...formData, maxTicketReimbursement: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Meals ($ / day)</label>
              <input
                type="number"
                min={0}
                value={formData.dailyMealsAllowance}
                onChange={(e) => setFormData({ ...formData, dailyMealsAllowance: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Receipt Reqd ($)</label>
              <input
                type="number"
                min={0}
                value={formData.receiptRequiredThreshold}
                onChange={(e) => setFormData({ ...formData, receiptRequiredThreshold: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-text-main font-semibold mb-1">Policy Justification & Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
            />
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingTier(null)}
              className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm"
            >
              Save Policy Changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

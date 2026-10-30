import React, { useState } from 'react';
import { 
  Home, 
  Truck, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Calculator, 
  ArrowRight,
  Edit3
} from 'lucide-react';
import { RelocationPolicyTier, UserRole } from '../../../types';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { formatCurrency } from '../../../lib/utils';

export interface RelocationPolicyModuleProps {
  policies: RelocationPolicyTier[];
  onUpdatePolicies: (policies: RelocationPolicyTier[]) => Promise<void>;
  currentRole: UserRole | null;
}

export const RelocationPolicyModule: React.FC<RelocationPolicyModuleProps> = ({
  policies,
  onUpdatePolicies,
  currentRole,
}) => {
  const [editingTier, setEditingTier] = useState<RelocationPolicyTier | null>(null);
  const [formData, setFormData] = useState<RelocationPolicyTier>({
    id: '',
    originType: 'OUTSTATION_METRO',
    lumpSumRelocationAllowance: 3200,
    guestHouseDays: 21,
    shipmentMoversAllowance: 1800,
    retentionBondMonths: 18,
    taxAssistanceIncluded: true,
  });

  // Simulator State
  const [simOrigin, setSimOrigin] = useState<'SAME_STATE' | 'OUTSTATION_NON_METRO' | 'OUTSTATION_METRO'>('OUTSTATION_METRO');
  const [hasDependents, setHasDependents] = useState(true);

  const handleOpenEdit = (tier: RelocationPolicyTier) => {
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

  // Compute simulation package
  const activeSimPolicy = policies.find(p => p.originType === simOrigin) || policies[0];
  const totalSimPackageValue = (activeSimPolicy?.lumpSumRelocationAllowance || 0) + 
                               (activeSimPolicy?.shipmentMoversAllowance || 0) + 
                               ((activeSimPolicy?.guestHouseDays || 0) * 85) + 
                               (hasDependents ? 800 : 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sage-200 text-sage-800 uppercase tracking-wider">
              Talent Mobility & Retention
            </span>
            <span className="text-xs text-text-muted">• Relocation Matrix</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Relocation Policy & Allowance Matrix
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Configure tiered relocation lump sums, temporary corporate guest house duration, household shipping allowances, and clawback retention agreements.
          </p>
        </div>
      </div>

      {/* Relocation Policy Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {policies.map((tier) => (
          <div
            key={tier.id}
            className="bg-card rounded-2xl p-6 border border-border shadow-warm hover:shadow-warm-md transition-all flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Origin Tier</span>
                  <h3 className="text-base font-bold text-text-main font-sans mt-0.5">
                    {tier.originType.replace(/_/g, ' ')}
                  </h3>
                </div>
                <button
                  onClick={() => handleOpenEdit(tier)}
                  className="p-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted hover:text-text-main transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Package Breakdown */}
              <div className="mt-4 p-3.5 rounded-xl bg-sidebar/50 border border-border space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Lump Sum Relocation:</span>
                  <span className="font-bold text-text-main">{formatCurrency(tier.lumpSumRelocationAllowance)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Guest House Stay:</span>
                  <span className="font-bold text-sage-700">{tier.guestHouseDays} Days</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Movers & Packers:</span>
                  <span className="font-bold text-terracotta-700">{formatCurrency(tier.shipmentMoversAllowance)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-muted">Retention Bond:</span>
                  <span className="font-bold text-text-main">{tier.retentionBondMonths} Months</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
              <span>Tax Support: {tier.taxAssistanceIncluded ? 'Included' : 'Standard'}</span>
              <span className="font-bold text-sage-700">Active Benchmark</span>
            </div>
          </div>
        ))}
      </div>

      {/* Interactive Relocation Package Simulator */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-terracotta-50 text-terracotta-700 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-main font-sans uppercase tracking-wider">
              Candidate Relocation Package Simulator
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Live estimate of gross compensation and logistics support for candidates transferring to a new city.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">
                Candidate Origin Category
              </label>
              <select
                value={simOrigin}
                onChange={(e) => setSimOrigin(e.target.value as any)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-xs text-text-main font-semibold focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                <option value="SAME_STATE">Same State Transfer</option>
                <option value="OUTSTATION_NON_METRO">Outstation (Non-Metro to Metro)</option>
                <option value="OUTSTATION_METRO">Outstation (Metro to Metro)</option>
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-text-main cursor-pointer">
              <input
                type="checkbox"
                checked={hasDependents}
                onChange={(e) => setHasDependents(e.target.checked)}
                className="rounded text-sage-600 focus:ring-sage-500"
              />
              Candidate Relocating with Family / Dependents (+ $800 allowance)
            </label>
          </div>

          <div className="p-4 rounded-xl bg-sidebar/50 border border-border space-y-1.5 text-xs text-text-muted">
            <div className="flex justify-between">
              <span>Lump Sum Relocation:</span>
              <span className="font-semibold text-text-main">{formatCurrency(activeSimPolicy?.lumpSumRelocationAllowance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipment & Packers:</span>
              <span className="font-semibold text-text-main">{formatCurrency(activeSimPolicy?.shipmentMoversAllowance || 0)}</span>
            </div>
            <div className="flex justify-between">
              <span>Guest House ({activeSimPolicy?.guestHouseDays}d @ $85/d):</span>
              <span className="font-semibold text-text-main">{formatCurrency((activeSimPolicy?.guestHouseDays || 0) * 85)}</span>
            </div>
            {hasDependents && (
              <div className="flex justify-between text-terracotta-700">
                <span>Family Dependent Grant:</span>
                <span className="font-semibold">+$800.00</span>
              </div>
            )}
          </div>

          <div className="p-5 rounded-xl bg-sage-50 border border-sage-200 text-center flex flex-col items-center justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sage-700">Total Estimated Package Value</span>
            <div className="text-2xl font-bold text-sage-900 mt-1">
              {formatCurrency(totalSimPackageValue)}
            </div>
            <p className="text-[11px] text-sage-700 mt-1">
              Subject to {activeSimPolicy?.retentionBondMonths}-month retention bond agreement
            </p>
          </div>
        </div>
      </div>

      {/* Edit Tier Modal */}
      <Modal
        isOpen={Boolean(editingTier)}
        onClose={() => setEditingTier(null)}
        title="Configure Relocation Policy Tier"
        subtitle={`Origin: ${editingTier?.originType}`}
      >
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Lump Sum ($)</label>
              <input
                type="number"
                min={0}
                value={formData.lumpSumRelocationAllowance}
                onChange={(e) => setFormData({ ...formData, lumpSumRelocationAllowance: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Guest House Days</label>
              <input
                type="number"
                min={0}
                value={formData.guestHouseDays}
                onChange={(e) => setFormData({ ...formData, guestHouseDays: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-text-main font-semibold mb-1">Shipment Movers Allowance ($)</label>
              <input
                type="number"
                min={0}
                value={formData.shipmentMoversAllowance}
                onChange={(e) => setFormData({ ...formData, shipmentMoversAllowance: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
            <div>
              <label className="block text-text-main font-semibold mb-1">Retention Bond (Months)</label>
              <input
                type="number"
                min={0}
                value={formData.retentionBondMonths}
                onChange={(e) => setFormData({ ...formData, retentionBondMonths: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-bold focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
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
              Save Relocation Limits
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

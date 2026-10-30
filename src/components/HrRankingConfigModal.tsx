import React, { useState } from 'react';
import { X, Sliders, Check, RotateCcw } from 'lucide-react';
import { HrRankingWeights } from '../types/matching';
import { RANKING_PRESETS, normalizeWeights } from '../engine/rankingEngine';

interface HrRankingConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWeights: HrRankingWeights;
  onSave: (weights: HrRankingWeights) => void;
}

export const HrRankingConfigModal: React.FC<HrRankingConfigModalProps> = ({
  isOpen,
  onClose,
  currentWeights,
  onSave,
}) => {
  const [weights, setWeights] = useState<HrRankingWeights>({ ...currentWeights });

  if (!isOpen) return null;

  const handlePresetSelect = (presetKey: string) => {
    const preset = RANKING_PRESETS[presetKey];
    if (preset) {
      setWeights({ ...preset });
    }
  };

  const handleSliderChange = (field: keyof HrRankingWeights, value: number) => {
    setWeights((prev) => ({
      ...prev,
      [field]: value,
      ruleName: 'Custom Configuration',
    }));
  };

  const handleSave = () => {
    const normalized = normalizeWeights(weights);
    onSave(normalized);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <h3 className="font-extrabold text-slate-900 text-lg">
              HR Candidate Ranking Rules
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Presets */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Select Preset
            </span>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(RANKING_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  className={`p-3 rounded-xl border text-left transition ${
                    weights.ruleName === preset.ruleName
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-600/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold text-xs text-slate-900 block">
                    {preset.ruleName}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Skills: {Math.round(preset.skillWeight * 100)}% &bull; Exp: {Math.round(preset.experienceWeight * 100)}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Skill Match Weight</span>
                <span className="text-indigo-600">{Math.round(weights.skillWeight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.skillWeight}
                onChange={(e) => handleSliderChange('skillWeight', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Experience Depth Weight</span>
                <span className="text-indigo-600">{Math.round(weights.experienceWeight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.experienceWeight}
                onChange={(e) => handleSliderChange('experienceWeight', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Location Preference Alignment Weight</span>
                <span className="text-indigo-600">{Math.round(weights.locationPreferenceWeight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.locationPreferenceWeight}
                onChange={(e) => handleSliderChange('locationPreferenceWeight', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                <span>Joining Date Urgency Weight</span>
                <span className="text-indigo-600">{Math.round(weights.joiningDateWeight * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={weights.joiningDateWeight}
                onChange={(e) => handleSliderChange('joiningDateWeight', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500">
            <strong>System Safeguard:</strong> Weights are automatically normalized to sum to 100%. AI and interview scores are never used to auto-disqualify candidates.
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold text-xs hover:bg-white transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-md"
          >
            Apply Ranking Rule
          </button>
        </div>
      </div>
    </div>
  );
};


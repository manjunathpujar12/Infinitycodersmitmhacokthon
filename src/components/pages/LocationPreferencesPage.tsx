import React, { useState } from 'react';
import { useCandidateAuth } from '../../context/CandidateAuthContext';
import { LocationPreference } from '../../types';
import { MapPin, ArrowUp, ArrowDown, Plus, Trash2, CheckCircle2, Info, Building } from 'lucide-react';

export const LocationPreferencesPage: React.FC = () => {
  const { candidate, updateLocationPreferences } = useCandidateAuth();

  const [currentCity, setCurrentCity] = useState(candidate.currentCity);
  const [preferences, setPreferences] = useState<LocationPreference[]>(candidate.locationPreferences);
  const [newCity, setNewCity] = useState('Mumbai');

  const allSupportedCities = [
    'Bangalore',
    'Hyderabad',
    'Pune',
    'Mumbai',
    'Gurgaon',
    'Chennai',
    'Noida'
  ];

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const reordered = [...preferences];
    const temp = reordered[index];
    reordered[index] = reordered[index - 1];
    reordered[index - 1] = temp;

    // re-assign priorities
    const updated = reordered.map((p, i) => ({ ...p, priority: (i + 1) as 1 | 2 | 3 }));
    setPreferences(updated);
    updateLocationPreferences(updated, currentCity);
  };

  const handleMoveDown = (index: number) => {
    if (index === preferences.length - 1) return;
    const reordered = [...preferences];
    const temp = reordered[index];
    reordered[index] = reordered[index + 1];
    reordered[index + 1] = temp;

    const updated = reordered.map((p, i) => ({ ...p, priority: (i + 1) as 1 | 2 | 3 }));
    setPreferences(updated);
    updateLocationPreferences(updated, currentCity);
  };

  const handleRemove = (city: string) => {
    const remaining = preferences.filter((p) => p.city !== city);
    const updated = remaining.map((p, i) => ({ ...p, priority: (i + 1) as 1 | 2 | 3 }));
    setPreferences(updated);
    updateLocationPreferences(updated, currentCity);
  };

  const handleAdd = () => {
    if (preferences.some((p) => p.city.toLowerCase() === newCity.toLowerCase())) return;
    if (preferences.length >= 3) return;

    const updated = [
      ...preferences,
      { city: newCity, priority: (preferences.length + 1) as 1 | 2 | 3 }
    ];
    setPreferences(updated);
    updateLocationPreferences(updated, currentCity);
  };

  const handleSaveCurrentCity = () => {
    updateLocationPreferences(preferences, currentCity);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-textPrimary tracking-tight">
          Current City & Multiple Preferred Locations
        </h2>
        <p className="text-xs text-textMuted mt-0.5">
          Order your destination office hubs. If your 1st choice is full, HireSlot automatically routes secondary offers
        </p>
      </div>

      {/* Current Residence Card */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-4">
        <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Current Residence & Base Location
        </h3>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            required
            value={currentCity}
            onChange={(e) => setCurrentCity(e.target.value)}
            className="flex-1 px-3.5 py-2.5 bg-[#FAF9F5] border border-borderDark rounded-xl text-xs font-semibold text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="e.g. Chennai, Bangalore, Pune, Delhi"
          />
          <button
            type="button"
            onClick={handleSaveCurrentCity}
            className="px-4 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-subtle flex-shrink-0"
          >
            Update Current City
          </button>
        </div>
      </div>

      {/* Multi-City Priority List */}
      <div className="bg-cards p-6 rounded-2xl border border-borderMuted shadow-subtle space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-textPrimary uppercase tracking-wider">
              Ordered City Preferences (Ranked #1 to #{preferences.length})
            </h3>
            <p className="text-xs text-textMuted mt-0.5">
              The allocation algorithm prioritizes available vacancies in your preferred order
            </p>
          </div>
          <span className="text-xs font-bold text-primary font-mono bg-primary-light px-2.5 py-1 rounded-lg">
            {preferences.length} / 3 Maximum
          </span>
        </div>

        {/* Priority Rows */}
        <div className="space-y-3">
          {preferences.map((pref, idx) => (
            <div
              key={pref.city}
              className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${pref.priority === 1
                ? 'bg-primary-light/40 border-primary/40 shadow-subtle'
                : 'bg-[#FAF9F5] border-borderMuted'
                }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${pref.priority === 1
                    ? 'bg-primary text-white shadow-subtle'
                    : 'bg-sidebar text-textPrimary border border-borderDark'
                    }`}
                >
                  #{pref.priority}
                </span>

                <div>
                  <h4 className="text-sm font-extrabold text-textPrimary flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-primary" /> {pref.city}
                  </h4>
                  <span className="text-[11px] text-textMuted font-medium">
                    {pref.priority === 1
                      ? 'Primary destination match. Receives +20pt preference bonus.'
                      : pref.priority === 2
                        ? 'Secondary hub fallback (Eligible for ₹75k relocation allowance if #1 full).'
                        : 'Tertiary office alternative.'}
                  </span>
                </div>
              </div>

              {/* Order buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveUp(idx)}
                  className="p-1.5 rounded-lg bg-cards border border-borderDark text-textPrimary hover:bg-sidebar disabled:opacity-30 transition-colors"
                  title="Move priority up"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === preferences.length - 1}
                  onClick={() => handleMoveDown(idx)}
                  className="p-1.5 rounded-lg bg-cards border border-borderDark text-textPrimary hover:bg-sidebar disabled:opacity-30 transition-colors"
                  title="Move priority down"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(pref.city)}
                  className="p-1.5 rounded-lg text-textMuted hover:text-rose-700 hover:bg-rose-50 transition-colors"
                  title="Remove location"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Location Row */}
        {preferences.length < 3 && (
          <div className="p-3.5 bg-sidebar rounded-xl border border-borderMuted flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-textPrimary uppercase tracking-wider text-[10px]">
              Add Next Choice:
            </span>
            <select
              value={newCity}
              onChange={(e) => setNewCity(e.target.value)}
              className="px-3 py-1.5 bg-cards border border-borderDark rounded-lg text-xs font-semibold text-textPrimary"
            >
              {allSupportedCities
                .filter((c) => !preferences.some((p) => p.city.toLowerCase() === c.toLowerCase()))
                .map((c) => (
                  <option key={c} value={c}>
                    {c} Tech Center
                  </option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleAdd}
              className="px-3.5 py-1.5 bg-primary text-white rounded-lg font-bold hover:bg-primary-hover shadow-subtle flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Preference #{preferences.length + 1}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};


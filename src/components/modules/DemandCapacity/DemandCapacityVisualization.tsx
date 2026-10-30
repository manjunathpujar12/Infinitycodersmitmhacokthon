import React, { useState } from 'react';
import {
  BarChart3,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Users,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { CityVacancy, Candidate, InterviewSlot, CandidateAllocation, HiringDrive, JobRole } from '../../../types';
import { Badge } from '../../common/Badge';

export interface DemandCapacityVisualizationProps {
  vacancies: CityVacancy[];
  candidates: Candidate[];
  slots: InterviewSlot[];
  allocations: CandidateAllocation[];
  drives: HiringDrive[];
  roles: JobRole[];
  selectedDriveId: string;
}

export const DemandCapacityVisualization: React.FC<DemandCapacityVisualizationProps> = ({
  vacancies,
  candidates,
  slots,
  allocations,
  drives,
  roles,
  selectedDriveId,
}) => {
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Filter based on drive and role
  const filteredVacancies = vacancies.filter(v => {
    if (selectedDriveId !== 'ALL' && v.driveId !== selectedDriveId) return false;
    if (selectedRoleFilter !== 'ALL' && v.roleId !== selectedRoleFilter) return false;
    return true;
  });

  // Unique cities from vacancies
  const cities = Array.from(new Set(filteredVacancies.map(v => v.city)));

  // Calculate metrics per city
  const cityMetrics = cities.map(city => {
    const cityVacs = filteredVacancies.filter(v => v.city === city);
    const targetDemand = cityVacs.reduce((sum, v) => sum + v.targetHeadcount, 0);
    const bufferPercentage = cityVacs[0]?.bufferPercentage || 15;
    const maxCapacityWithBuffer = Math.round(targetDemand * (1 + bufferPercentage / 100));

    // Candidates who selected this city in preferred cities
    const interestedCandidates = candidates.filter(c =>
      (c.preferredCities || []).includes(city) || c.currentCity === city
    ).length;

    // Allocated candidates to this city
    const confirmedAllocations = allocations.filter(a => a.allocatedCity === city && a.status === 'ALLOCATED').length;
    const overflowCandidates = allocations.filter(a => a.allocatedCity === city && (a.status === 'OVERFLOW' || a.status === 'ALTERNATIVE_OFFERED')).length;

    // Interview slots for this city
    const totalSlots = slots.filter(s => s.city === city).length;
    const bookedSlots = slots.filter(s => s.city === city && (s.status === 'BOOKED' || s.status === 'COMPLETED')).length;

    // Slot deficit or surplus
    const slotDeficit = Math.max(0, confirmedAllocations - totalSlots);
    const capacitySaturationPct = Math.round((confirmedAllocations / (targetDemand || 1)) * 100);

    return {
      city,
      targetDemand,
      maxCapacityWithBuffer,
      bufferPercentage,
      interestedCandidates,
      confirmedAllocations,
      overflowCandidates,
      totalSlots,
      bookedSlots,
      slotDeficit,
      capacitySaturationPct,
    };
  });

  const handleExportCSV = () => {
    const headers = [
      'City',
      'Target Demand',
      'Max Capacity (with Buffer)',
      'Buffer %',
      'Interested Applicants',
      'Confirmed Allocations',
      'Overflow Count',
      'Total Interview Slots',
      'Booked Slots',
      'Slot Deficit',
      'Capacity Saturation %'
    ];
    const rows = cityMetrics.map(m => [
      `"${m.city.replace(/"/g, '""')}"`,
      m.targetDemand,
      m.maxCapacityWithBuffer,
      `${m.bufferPercentage}%`,
      m.interestedCandidates,
      m.confirmedAllocations,
      m.overflowCandidates,
      m.totalSlots,
      m.bookedSlots,
      m.slotDeficit,
      `${m.capacitySaturationPct}%`
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `demand_capacity_metrics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="sage" size="md">
              <BarChart3 className="w-3.5 h-3.5" />
              Real-time Analytics
            </Badge>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Demand Versus Capacity Visualization
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-xl">
            Live comparison of vacancy hiring targets, candidate applicant density, and physical interview slot availability across regional tech hubs.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm flex items-center gap-1.5 transition-all"
            title="Export Demand vs Capacity Metrics to CSV"
          >
            <Download className="w-4 h-4 text-terracotta-600" />
            <span>Export Metrics (CSV)</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-text-muted font-medium">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Role:</span>
          </div>
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500 shadow-warm-sm"
          >
            <option value="ALL">All Roles</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.title} ({r.bandLevel})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Aggregate Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Target Demand</p>
          <h3 className="text-2xl font-bold text-text-main mt-1">
            {cityMetrics.reduce((acc, c) => acc + c.targetDemand, 0)}
          </h3>
          <p className="text-xs text-text-muted mt-1">Positions across {cities.length} cities</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Total Confirmed Allocations</p>
          <h3 className="text-2xl font-bold text-sage-700 mt-1">
            {cityMetrics.reduce((acc, c) => acc + c.confirmedAllocations, 0)}
          </h3>
          <p className="text-xs text-text-muted mt-1">Phase 1 matched candidates</p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Interview Slot Capacity</p>
          <h3 className="text-2xl font-bold text-terracotta-700 mt-1">
            {cityMetrics.reduce((acc, c) => acc + c.totalSlots, 0)}
          </h3>
          <p className="text-xs text-text-muted mt-1">
            {cityMetrics.reduce((acc, c) => acc + c.bookedSlots, 0)} booked
          </p>
        </div>

        <div className="bg-card rounded-xl p-4 border border-border shadow-warm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Capacity Health</p>
          <div className="flex items-center gap-2 mt-1">
            {cityMetrics.some(c => c.slotDeficit > 0) ? (
              <>
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-bold text-amber-800">Slot Shortage Detected</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800">Balanced Pipeline</span>
              </>
            )}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {cityMetrics.filter(c => c.slotDeficit > 0).length} cities require slot additions
          </p>
        </div>
      </div>

      {/* City-by-City Visual Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cityMetrics.map((metric) => (
          <div
            key={metric.city}
            className="bg-card rounded-2xl p-6 border border-border shadow-warm hover:shadow-warm-md transition-all space-y-4"
          >
            {/* City Title & Saturation Tag */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-sage-600" />
                  <h3 className="text-base font-bold text-text-main font-sans">{metric.city}</h3>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Target Vacancy: {metric.targetDemand} positions (+{metric.bufferPercentage}% buffer cap: {metric.maxCapacityWithBuffer})
                </p>
              </div>

              <div className="text-right">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${metric.capacitySaturationPct >= 100
                    ? 'bg-rose-100 text-rose-800'
                    : metric.capacitySaturationPct >= 75
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-sage-100 text-sage-800'
                  }`}>
                  {metric.capacitySaturationPct}% Filled
                </span>
              </div>
            </div>

            {/* Comparative Visual Bars */}
            <div className="space-y-3 pt-2">
              {/* Bar 1: Demand Target */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted font-medium">1. Vacancy Demand Target</span>
                  <span className="font-semibold text-text-main">{metric.targetDemand} seats</span>
                </div>
                <div className="w-full h-3 bg-sidebar rounded-full overflow-hidden">
                  <div
                    className="h-full bg-text-muted rounded-full"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>

              {/* Bar 2: Allocated Candidates */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted font-medium">2. Confirmed Allocations</span>
                  <span className="font-semibold text-sage-700">
                    {metric.confirmedAllocations} candidates
                  </span>
                </div>
                <div className="w-full h-3 bg-sidebar rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sage-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (metric.confirmedAllocations / (metric.targetDemand || 1)) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Bar 3: Interview Slot Capacity */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted font-medium">3. Interview Slot Capacity</span>
                  <span className="font-semibold text-terracotta-700">
                    {metric.totalSlots} slots ({metric.bookedSlots} booked)
                  </span>
                </div>
                <div className="w-full h-3 bg-sidebar rounded-full overflow-hidden">
                  <div
                    className="h-full bg-terracotta-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (metric.totalSlots / (metric.targetDemand || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alert / Shortage Note */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              {metric.slotDeficit > 0 ? (
                <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg w-full">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>Slot Deficit Alert:</strong> Need <strong>{metric.slotDeficit}</strong> more slots to interview all allocated candidates!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg w-full">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Interview capacity is sufficient for current allocations.</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

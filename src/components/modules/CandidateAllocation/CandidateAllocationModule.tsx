import React, { useState } from 'react';
import {
  Users2,
  MapPin,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Search,
  ChevronRight,
  Sparkles,
  Info,
  Check,
  X,
  Share2,
  Unlock,
  Building,
  HelpCircle,
  Download
} from 'lucide-react';
import {
  Candidate,
  CandidateAllocation,
  JobRole,
  CityVacancy,
  RankingRulesConfig,
  UserRole,
  RecommendationBreakdown
} from '../../../types';
import { Badge } from '../../common/Badge';
import { Drawer } from '../../common/Drawer';
import { Modal } from '../../common/Modal';

export interface CandidateAllocationModuleProps {
  candidates: Candidate[];
  allocations: CandidateAllocation[];
  roles: JobRole[];
  vacancies: CityVacancy[];
  rankingRules: RankingRulesConfig;
  onAllocateCandidate: (candidateId: string, city: string) => Promise<void>;
  onOverrideBlock: (candidateId: string, note: string, city: string) => Promise<void>;
  onUpdateRankingRules: (rules: Partial<RankingRulesConfig>) => Promise<void>;
  currentRole: UserRole | null;
  isRankingDrawerOpen?: boolean;
  setIsRankingDrawerOpen?: (open: boolean) => void;
}

export const CandidateAllocationModule: React.FC<CandidateAllocationModuleProps> = ({
  candidates,
  allocations,
  roles,
  vacancies,
  rankingRules,
  onAllocateCandidate,
  onOverrideBlock,
  onUpdateRankingRules,
  currentRole,
  isRankingDrawerOpen: externalRankingOpen,
  setIsRankingDrawerOpen: setExternalRankingOpen,
}) => {
  const [selectedCityTab, setSelectedCityTab] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Drawers & Modals
  const [internalRankingOpen, setInternalRankingOpen] = useState(false);
  const isRankingOpen = externalRankingOpen !== undefined ? externalRankingOpen : internalRankingOpen;
  const setRankingOpen = setExternalRankingOpen || setInternalRankingOpen;

  const [selectedCandidateForDetails, setSelectedCandidateForDetails] = useState<Candidate | null>(null);
  const [selectedCandidateForOverride, setSelectedCandidateForOverride] = useState<Candidate | null>(null);

  // Exemption Form State
  const [exemptionNote, setExemptionNote] = useState('');
  const [exemptionCity, setExemptionCity] = useState('Bengaluru');

  // Ranking Rules Form State
  const [rulesForm, setRulesForm] = useState<RankingRulesConfig>({ ...rankingRules });

  // Update local rules form when prop changes
  React.useEffect(() => {
    setRulesForm({ ...rankingRules });
  }, [rankingRules]);

  // Unique cities from vacancies
  const availableCities = Array.from(new Set(vacancies.map(v => v.city)));

  // Filtered candidate list
  const filteredCandidates = candidates.filter(c => {
    const alloc = allocations.find(a => a.candidateId === c.id);
    const candidateCity = alloc?.allocatedCity || c.currentCity;

    const matchesCity = selectedCityTab === 'ALL' ||
      alloc?.allocatedCity === selectedCityTab ||
      (c.preferredCities || []).includes(selectedCityTab);

    const matchesStatus = statusFilter === 'ALL' ||
      (statusFilter === 'BLOCKED' && (c.isSilentlyBlocked || alloc?.status === 'BLOCKED')) ||
      (alloc && alloc.status === statusFilter) ||
      (!alloc && statusFilter === 'PENDING');

    const matchesSearch = c.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCity && matchesStatus && matchesSearch;
  });

  const handleSaveRules = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateRankingRules(rulesForm);
    setRankingOpen(false);
  };

  const handleOpenOverride = (candidate: Candidate) => {
    setSelectedCandidateForOverride(candidate);
    setExemptionNote('');
    setExemptionCity(candidate.preferredCities[0] || 'Bengaluru');
  };

  const handleExecuteOverride = async () => {
    if (!selectedCandidateForOverride || !exemptionNote.trim()) return;
    await onOverrideBlock(selectedCandidateForOverride.id, exemptionNote, exemptionCity);
    setSelectedCandidateForOverride(null);
  };

  const handleExportCSV = () => {
    const headers = ['Candidate Name', 'Email', 'Role', 'Allocated City', 'Score', 'Status'];
    const rows = filteredCandidates.map(c => {
      const alloc = allocations.find(a => a.candidateId === c.id);
      const role = roles.find(r => r.id === c.roleId)?.title || 'N/A';
      const allocatedCity = alloc?.allocatedCity || 'Unallocated';
      const score = alloc?.matchScore ?? c.assessmentScore ?? 'N/A';
      const status = alloc?.status || (c.isSilentlyBlocked ? 'BLOCKED' : 'PENDING');
      return [
        `"${c.fullName.replace(/"/g, '""')}"`,
        `"${c.email.replace(/"/g, '""')}"`,
        `"${role.replace(/"/g, '""')}"`,
        `"${allocatedCity.replace(/"/g, '""')}"`,
        score,
        `"${status.replace(/"/g, '""')}"`
      ].join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `candidate_allocations_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Workflow Phase 1 Notice & Header */}
      <div className="bg-card rounded-2xl p-6 border border-border shadow-warm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-terracotta-100 text-terracotta-800 uppercase tracking-wider">
              Workflow Phase 1: Candidate Allocation
            </span>
            <span className="text-xs text-text-muted">• Decoupled from Interview Scheduling</span>
          </div>
          <h2 className="text-xl font-bold text-text-main font-sans tracking-tight">
            Candidate Allocation & Location Drill-Down
          </h2>
          <p className="text-xs text-text-muted mt-1 max-w-2xl leading-relaxed">
            Transparently match applicants to regional hubs based on weighted ranking rules. Understand exactly why candidates are recommended, manage city capacity, and resolve threshold blocks with full audit visibility.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-1.5 transition-all"
            title="Export filtered candidate allocations to CSV"
          >
            <Download className="w-4 h-4 text-terracotta-600" />
            <span>Export Allocations (CSV)</span>
          </button>
          <button
            onClick={() => setRankingOpen(true)}
            className="px-4 py-2 bg-sidebar hover:bg-white text-text-main border border-border rounded-lg text-xs font-semibold shadow-warm-sm flex items-center gap-2 transition-all"
          >
            <Sliders className="w-4 h-4 text-sage-600" />
            Configure Ranking Rules
          </button>
        </div>
      </div>

      {/* City Drill-down Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border">
        <button
          onClick={() => setSelectedCityTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedCityTab === 'ALL'
              ? 'bg-sage-500 text-white shadow-warm'
              : 'text-text-muted hover:text-text-main hover:bg-white'
            }`}
        >
          All Locations ({candidates.length})
        </button>
        {availableCities.map((city) => {
          const cityCandidatesCount = candidates.filter(c => {
            const alloc = allocations.find(a => a.candidateId === c.id);
            return alloc?.allocatedCity === city || (c.preferredCities || []).includes(city);
          }).length;

          return (
            <button
              key={city}
              onClick={() => setSelectedCityTab(city)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedCityTab === city
                  ? 'bg-sage-500 text-white shadow-warm'
                  : 'text-text-muted hover:text-text-main hover:bg-white'
                }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>{city}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sidebar/80 text-text-main">
                {cityCandidatesCount}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card rounded-xl p-4 border border-border shadow-warm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by candidate name, skill or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-sidebar border border-border rounded-lg pl-9 pr-3 py-1.5 text-xs text-text-main placeholder:text-text-subtle focus:outline-none focus:ring-1 focus:ring-sage-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-text-muted font-medium whitespace-nowrap">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-sidebar border border-border rounded-lg py-1.5 px-3 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ALLOCATED">Allocated</option>
            <option value="OVERFLOW">Overflow</option>
            <option value="ALTERNATIVE_OFFERED">Alternative Offered</option>
            <option value="BLOCKED">⚠️ Blocked / Threshold</option>
            <option value="WAITLISTED">Waitlisted</option>
          </select>
        </div>
      </div>

      {/* Candidates Allocation Table */}
      <div className="bg-card rounded-2xl border border-border shadow-warm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-sidebar border-b border-border text-[11px] font-bold uppercase tracking-wider text-text-muted">
              <tr>
                <th className="py-3 px-5">Candidate & Skills</th>
                <th className="py-3 px-4">Location Preference</th>
                <th className="py-3 px-4">Match Score</th>
                <th className="py-3 px-4">Status & Health</th>
                <th className="py-3 px-5 text-right">Actions & Insights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {filteredCandidates.map((candidate) => {
                const alloc = allocations.find(a => a.candidateId === candidate.id);
                const isBlocked = candidate.isSilentlyBlocked || alloc?.status === 'BLOCKED';
                const matchScore = alloc?.matchScore || candidate.assessmentScore || 80;

                return (
                  <tr
                    key={candidate.id}
                    className={`hover:bg-sidebar/30 transition-colors ${isBlocked ? 'bg-rose-50/30' : ''
                      }`}
                  >
                    {/* Candidate Name & Skills */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-sidebar border border-border flex items-center justify-center font-bold text-text-main text-xs">
                          {candidate.fullName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-text-main flex items-center gap-1.5">
                            {candidate.fullName}
                            {candidate.hrExemptionGranted && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded" title={candidate.hrExemptionNote}>
                                Exemption Granted
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-text-muted">{candidate.email} • {candidate.yearsExperience}y exp</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(candidate.skills || []).slice(0, 3).map(skill => (
                              <span key={skill} className="text-[10px] px-1.5 py-0.2 rounded bg-sidebar border border-border text-text-muted">
                                {skill}
                              </span>
                            ))}
                            {(candidate.skills || []).length > 3 && (
                              <span className="text-[10px] text-text-subtle">
                                +{(candidate.skills || []).length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location Preference */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-text-main flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-sage-600" />
                        <span>{alloc?.allocatedCity || candidate.preferredCities[0] || candidate.currentCity}</span>
                      </div>
                      <div className="text-[11px] text-text-muted mt-0.5">
                        Current: {candidate.currentCity} (Relo: {candidate.relocationReadiness})
                      </div>
                    </td>

                    {/* Match Score */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-bold text-text-main">{matchScore}%</div>
                        <div className="w-16 h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                          <div
                            className={`h-full rounded-full ${matchScore >= 85 ? 'bg-sage-600' : matchScore >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            style={{ width: `${matchScore}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-[10px] text-text-muted mt-0.5">
                        Test: {candidate.assessmentScore}%
                      </div>
                    </td>

                    {/* Status & Health */}
                    <td className="py-3.5 px-4">
                      {isBlocked ? (
                        <div>
                          <Badge variant="danger" size="sm">
                            <ShieldAlert className="w-3 h-3" />
                            Threshold Block
                          </Badge>
                          <p className="text-[10px] text-rose-700 mt-0.5 max-w-xs truncate" title={candidate.blockedReason}>
                            {candidate.blockedReason}
                          </p>
                        </div>
                      ) : (
                        <Badge
                          variant={
                            alloc?.status === 'ALLOCATED' ? 'sage' :
                              alloc?.status === 'OVERFLOW' ? 'terracotta' :
                                alloc?.status === 'ALTERNATIVE_OFFERED' ? 'warning' : 'neutral'
                          }
                          size="sm"
                        >
                          {alloc?.status || 'PENDING'}
                        </Badge>
                      )}
                    </td>

                    {/* Actions & Insights */}
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {isBlocked ? (
                          <button
                            onClick={() => handleOpenOverride(candidate)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-warm-sm"
                          >
                            <Unlock className="w-3 h-3" />
                            HR Override
                          </button>
                        ) : !alloc || alloc.status === 'PENDING' ? (
                          <button
                            onClick={() => onAllocateCandidate(candidate.id, candidate.preferredCities[0] || 'Bengaluru')}
                            className="px-2.5 py-1 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold flex items-center gap-1 transition-colors shadow-warm-sm"
                          >
                            <Check className="w-3 h-3" />
                            Allocate
                          </button>
                        ) : null}

                        <button
                          onClick={() => setSelectedCandidateForDetails(candidate)}
                          className="px-2.5 py-1 rounded-lg border border-border hover:bg-sidebar text-text-main font-semibold flex items-center gap-1 transition-colors"
                          title="Show why candidate is recommended"
                        >
                          <Sparkles className="w-3 h-3 text-sage-600" />
                          Why Recommended
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Why Recommended" Detail Drawer */}
      <Drawer
        isOpen={Boolean(selectedCandidateForDetails)}
        onClose={() => setSelectedCandidateForDetails(null)}
        title="Candidate Recommendation Analysis"
        subtitle="Transparent scoring breakdown based on active ranking rules."
        width="lg"
      >
        {selectedCandidateForDetails && (() => {
          const alloc = allocations.find(a => a.candidateId === selectedCandidateForDetails.id);
          const breakdown = alloc?.recommendationBreakdown || {
            totalScore: selectedCandidateForDetails.assessmentScore || 85,
            cityMatchScore: 25,
            skillMatchScore: 30,
            experienceScore: 18,
            relocationScore: 10,
            reasons: [
              `Direct preference match for ${alloc?.allocatedCity || selectedCandidateForDetails.preferredCities[0]}`,
              `High assessment score (${selectedCandidateForDetails.assessmentScore}%)`,
              `Years of experience (${selectedCandidateForDetails.yearsExperience}y) meets band benchmark`
            ],
            warnings: selectedCandidateForDetails.isSilentlyBlocked ? [selectedCandidateForDetails.blockedReason || 'Blocked by threshold'] : []
          };

          return (
            <div className="space-y-5 text-xs">
              {/* Profile Card */}
              <div className="p-4 rounded-xl border border-border bg-sidebar/50 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-text-main">{selectedCandidateForDetails.fullName}</h4>
                  <p className="text-text-muted mt-0.5">{selectedCandidateForDetails.email} • {selectedCandidateForDetails.phone}</p>
                  <p className="text-text-muted mt-0.5">
                    Current: <strong>{selectedCandidateForDetails.currentCity}</strong> | Preferences: <strong>{(selectedCandidateForDetails.preferredCities || []).join(', ')}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-text-muted">Total Score</span>
                  <div className="text-xl font-bold text-sage-700">{breakdown.totalScore} / 100</div>
                </div>
              </div>

              {/* Threshold Warnings / Block Warning */}
              {breakdown.warnings.length > 0 && (
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Evaluation Warnings & Threshold Violations</span>
                  </div>
                  {breakdown.warnings.map((w, i) => (
                    <p key={i} className="text-xs text-rose-700 leading-relaxed pl-5 list-disc">
                      • {w}
                    </p>
                  ))}
                  {selectedCandidateForDetails.isSilentlyBlocked && (
                    <div className="pt-2 mt-2 border-t border-rose-200/60 flex items-center justify-between">
                      <span className="text-[11px] text-rose-800">Candidate is currently non-allocated.</span>
                      <button
                        onClick={() => {
                          const cand = selectedCandidateForDetails;
                          setSelectedCandidateForDetails(null);
                          handleOpenOverride(cand);
                        }}
                        className="px-2.5 py-1 bg-rose-700 hover:bg-rose-800 text-white rounded-lg font-semibold text-xs shadow-warm-sm"
                      >
                        Open HR Override
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Score Breakdown Bars */}
              <div className="space-y-3">
                <h5 className="font-bold text-text-main uppercase tracking-wider text-[11px]">
                  Scoring Criteria Breakdown
                </h5>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">1. Location Preference Match</span>
                    <span className="font-bold text-text-main">{breakdown.cityMatchScore} / {rankingRules.locationMatchWeight} pts</span>
                  </div>
                  <div className="w-full h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                    <div className="h-full bg-sage-500 rounded-full" style={{ width: `${(breakdown.cityMatchScore / (rankingRules.locationMatchWeight || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">2. Skill Requirements Coverage</span>
                    <span className="font-bold text-text-main">{breakdown.skillMatchScore} / {rankingRules.skillMatchWeight} pts</span>
                  </div>
                  <div className="w-full h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                    <div className="h-full bg-sage-600 rounded-full" style={{ width: `${(breakdown.skillMatchScore / (rankingRules.skillMatchWeight || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">3. Experience Benchmark</span>
                    <span className="font-bold text-text-main">{breakdown.experienceScore} / {rankingRules.experienceWeight} pts</span>
                  </div>
                  <div className="w-full h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                    <div className="h-full bg-terracotta-500 rounded-full" style={{ width: `${(breakdown.experienceScore / (rankingRules.experienceWeight || 1)) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">4. Relocation Readiness</span>
                    <span className="font-bold text-text-main">{breakdown.relocationScore} / {rankingRules.relocationWillingnessWeight} pts</span>
                  </div>
                  <div className="w-full h-2 bg-sidebar rounded-full overflow-hidden border border-border">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(breakdown.relocationScore / (rankingRules.relocationWillingnessWeight || 1)) * 100}%` }} />
                  </div>
                </div>
              </div>

              {/* Justification Reasons */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h5 className="font-bold text-text-main uppercase tracking-wider text-[11px]">
                  Positive Recommendation Drivers
                </h5>
                <ul className="space-y-1.5">
                  {breakdown.reasons.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-text-muted">
                      <CheckCircle2 className="w-3.5 h-3.5 text-sage-600 shrink-0 mt-0.5" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Quick Action in Drawer */}
              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-[11px] text-text-muted">
                  Allocation Status: <strong>{alloc?.status || 'PENDING'}</strong>
                </span>
                {!alloc || alloc.status === 'PENDING' ? (
                  <button
                    onClick={() => {
                      onAllocateCandidate(selectedCandidateForDetails.id, selectedCandidateForDetails.preferredCities[0] || 'Bengaluru');
                      setSelectedCandidateForDetails(null);
                    }}
                    className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm"
                  >
                    Confirm City Allocation
                  </button>
                ) : null}
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* Ranking Rules Configuration Drawer */}
      <Drawer
        isOpen={isRankingOpen}
        onClose={() => setRankingOpen(false)}
        title="Configure Candidate Ranking Rules"
        subtitle="Fine-tune evaluation criteria weights and buffer overflow tolerance."
        width="lg"
      >
        <form onSubmit={handleSaveRules} className="space-y-5 text-xs">
          <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl text-sage-800">
            <p className="font-bold">Automated Re-ranking</p>
            <p className="text-[11px] mt-0.5">
              Updating these weights will automatically trigger real-time re-ranking and re-computation of candidate match scores across all active drives.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1 font-semibold text-text-main">
                <span>Skill Match Weight</span>
                <span>{rulesForm.skillMatchWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rulesForm.skillMatchWeight}
                onChange={(e) => setRulesForm({ ...rulesForm, skillMatchWeight: Number(e.target.value) })}
                className="w-full accent-sage-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-text-main">
                <span>Experience Benchmark Weight</span>
                <span>{rulesForm.experienceWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rulesForm.experienceWeight}
                onChange={(e) => setRulesForm({ ...rulesForm, experienceWeight: Number(e.target.value) })}
                className="w-full accent-sage-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-text-main">
                <span>Location Preference Match Weight</span>
                <span>{rulesForm.locationMatchWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rulesForm.locationMatchWeight}
                onChange={(e) => setRulesForm({ ...rulesForm, locationMatchWeight: Number(e.target.value) })}
                className="w-full accent-sage-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-text-main">
                <span>Relocation Willingness Weight</span>
                <span>{rulesForm.relocationWillingnessWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rulesForm.relocationWillingnessWeight}
                onChange={(e) => setRulesForm({ ...rulesForm, relocationWillingnessWeight: Number(e.target.value) })}
                className="w-full accent-sage-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1 font-semibold text-text-main">
                <span>Technical Assessment Weight</span>
                <span>{rulesForm.assessmentScoreWeight}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={rulesForm.assessmentScoreWeight}
                onChange={(e) => setRulesForm({ ...rulesForm, assessmentScoreWeight: Number(e.target.value) })}
                className="w-full accent-sage-600 cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border space-y-3">
            <label className="flex items-center gap-2 text-text-main font-semibold">
              <input
                type="checkbox"
                checked={rulesForm.prioritizeFirstPreference}
                onChange={(e) => setRulesForm({ ...rulesForm, prioritizeFirstPreference: e.target.checked })}
                className="rounded text-sage-600 focus:ring-sage-500"
              />
              Prioritize 1st Location Preference
            </label>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                Minimum Passing Match Threshold (%)
              </label>
              <input
                type="number"
                min={40}
                max={95}
                value={rulesForm.minPassingThreshold}
                onChange={(e) => setRulesForm({ ...rulesForm, minPassingThreshold: Number(e.target.value) })}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setRankingOpen(false)}
              className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-sage-500 hover:bg-sage-600 text-white rounded-lg font-semibold shadow-warm"
            >
              Apply Ranking Rules
            </button>
          </div>
        </form>
      </Drawer>

      {/* HR Exemption & Override Modal (Never silently block!) */}
      <Modal
        isOpen={Boolean(selectedCandidateForOverride)}
        onClose={() => setSelectedCandidateForOverride(null)}
        title="Actionable HR Override & Exemption Console"
        subtitle="Never silently block candidates: Record clear justification and override threshold blocks."
      >
        {selectedCandidateForOverride && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <span className="font-bold block">Current System Block Reason:</span>
              <p className="mt-0.5">{selectedCandidateForOverride.blockedReason || 'Candidate score is below benchmark threshold.'}</p>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                Target Allocation City for Override
              </label>
              <select
                value={exemptionCity}
                onChange={(e) => setExemptionCity(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main font-medium focus:outline-none focus:ring-1 focus:ring-sage-500"
              >
                {availableCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-text-main font-semibold mb-1">
                HR Exemption Justification (Mandatory Audit Requirement)
              </label>
              <textarea
                rows={3}
                placeholder="e.g., Candidate brings 6 years niche domain experience in healthcare data pipelines; compensated for minor score deficit in assessment."
                value={exemptionNote}
                onChange={(e) => setExemptionNote(e.target.value)}
                className="w-full bg-sidebar border border-border rounded-lg p-2 text-text-main focus:outline-none focus:ring-1 focus:ring-sage-500"
              />
            </div>

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCandidateForOverride(null)}
                className="px-3.5 py-1.5 rounded-lg border border-border hover:bg-sidebar text-text-muted font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteOverride}
                disabled={!exemptionNote.trim()}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg font-semibold shadow-warm flex items-center gap-1.5"
              >
                <Unlock className="w-3.5 h-3.5" />
                Grant Exemption & Allocate
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

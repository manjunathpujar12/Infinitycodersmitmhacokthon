import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  UserCheck,
  LayoutDashboard,
  Cpu,
  Database,
  Radio,
  ExternalLink
} from 'lucide-react';

// Team Module Applications
import CandidatePortalApp from './candidate/App';
import HrDashboardApp from './hr/App';

// Member 1 Architecture & Allocation Components
import { Navbar } from './components/Navbar';
import { VacancyTrackerView } from './components/VacancyTrackerView';
import { RoleMatchingView } from './components/RoleMatchingView';
import { AllocationConsole } from './components/AllocationConsole';
import { OverflowRecommendationView } from './components/OverflowRecommendationView';
import { WaitlistManagerView } from './components/WaitlistManagerView';
import { AuditHistoryView } from './components/AuditHistoryView';
import { HrRankingConfigModal } from './components/HrRankingConfigModal';
import { CandidatePortalView } from './components/CandidatePortalView';
import { hireSlotService } from './services/hireSlotService';
import { realtimeAllocationService } from './services/realtimeAllocationService';
import { HrRankingWeights } from './types/matching';

export type MainPortalTab = 'CANDIDATE' | 'HR' | 'ENGINE';

export const App: React.FC = () => {
  // Master portal navigation mode (supports hash or default)
  const getInitialPortal = (): MainPortalTab => {
    const hash = window.location.hash.toLowerCase();
    if (hash.includes('candidate')) return 'CANDIDATE';
    if (hash.includes('engine') || hash.includes('allocation')) return 'ENGINE';
    if (hash.includes('hr')) return 'HR';
    return 'HR';
  };

  const [activePortal, setActivePortal] = useState<MainPortalTab>(getInitialPortal);

  // Sync with browser hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.includes('candidate')) setActivePortal('CANDIDATE');
      else if (hash.includes('engine') || hash.includes('allocation')) setActivePortal('ENGINE');
      else if (hash.includes('hr')) setActivePortal('HR');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSwitchPortal = (portal: MainPortalTab) => {
    setActivePortal(portal);
    window.location.hash = portal.toLowerCase();
  };

  // -------------------------------------------------------------
  // Member 1 Engine State (used when activePortal === 'ENGINE')
  // -------------------------------------------------------------
  const [jobs, setJobs] = useState(hireSlotService.getJobs());
  const [candidates, setCandidates] = useState(hireSlotService.getCandidates());
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[1]?.id || candidates[0]?.id || ''
  );
  const [m1PortalMode, setM1PortalMode] = useState<'HR' | 'CANDIDATE'>('HR');
  const [activeEngineTab, setActiveEngineTab] = useState<string>('allocation');
  const [rankingWeights, setRankingWeights] = useState<HrRankingWeights>(
    hireSlotService.getRankingWeights()
  );
  const [isRankingModalOpen, setIsRankingModalOpen] = useState<boolean>(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];
  const [vacancies, setVacancies] = useState(hireSlotService.getVacancies(selectedJobId));
  const [allocations, setAllocations] = useState(hireSlotService.getAllocations(selectedJobId));
  const [alternativeOffers, setAlternativeOffers] = useState(hireSlotService.getAlternativeOffers());
  const [waitlist, setWaitlist] = useState(hireSlotService.getWaitlist(selectedJobId));
  const [auditLogs, setAuditLogs] = useState(hireSlotService.getAuditLogs());

  const pendingOffersCount = alternativeOffers.filter((o) => o.status === 'PENDING').length;

  const refreshEngineData = () => {
    setJobs(hireSlotService.getJobs());
    setCandidates(hireSlotService.getCandidates());
    setVacancies(hireSlotService.getVacancies(selectedJobId));
    setAllocations(hireSlotService.getAllocations(selectedJobId));
    setAlternativeOffers(hireSlotService.getAlternativeOffers());
    setWaitlist(hireSlotService.getWaitlist(selectedJobId));
    setAuditLogs(hireSlotService.getAuditLogs());
    setRankingWeights(hireSlotService.getRankingWeights());
  };

  useEffect(() => {
    const unsubscribe = realtimeAllocationService.subscribeToHrAllocations(() => {
      refreshEngineData();
    });
    return () => {
      unsubscribe();
    };
  }, [selectedJobId]);

  const handleSelectJob = (jobId: string) => {
    setSelectedJobId(jobId);
    setVacancies(hireSlotService.getVacancies(jobId));
    setAllocations(hireSlotService.getAllocations(jobId));
    setWaitlist(hireSlotService.getWaitlist(jobId));
  };

  const handleSaveRankingWeights = (newWeights: HrRankingWeights) => {
    hireSlotService.updateRankingWeights(newWeights);
    setRankingWeights(newWeights);
    refreshEngineData();
  };

  const handleToggleM1PortalMode = (mode: 'HR' | 'CANDIDATE') => {
    setM1PortalMode(mode);
    if (mode === 'CANDIDATE') {
      setActiveEngineTab('candidate-decision');
    } else {
      setActiveEngineTab('allocation');
    }
  };

  const handleNavigateToCandidateDecision = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setM1PortalMode('CANDIDATE');
    setActiveEngineTab('candidate-decision');
  };

  return (
    <div className="min-h-screen bg-[#F8F7F2] flex flex-col text-slate-900 font-sans">
      {/* Master Top Integration Switcher Bar */}
      <div className="bg-slate-950 text-slate-200 border-b border-slate-800 px-4 py-2 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Platform Identity */}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
              HS
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-tight text-white text-sm">HireSlot</span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800/80 rounded-full">
                Unified Integration Platform
              </span>
            </div>
          </div>

          {/* Module / Portal Selector */}
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => handleSwitchPortal('HR')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activePortal === 'HR'
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>HR Dashboard (M3)</span>
            </button>

            <button
              onClick={() => handleSwitchPortal('CANDIDATE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activePortal === 'CANDIDATE'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Candidate Portal (M2)</span>
            </button>

            <button
              onClick={() => handleSwitchPortal('ENGINE')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                activePortal === 'ENGINE'
                  ? 'bg-amber-600 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Allocation Engine (M1)</span>
              {pendingOffersCount > 0 && (
                <span className="bg-amber-400 text-slate-950 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                  {pendingOffersCount}
                </span>
              )}
            </button>
          </div>

          {/* Supabase Status Pill */}
          <div className="hidden lg:flex items-center gap-2 text-slate-400">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Database className="w-3 h-3 text-emerald-400" />
              <span className="text-[11px] font-mono text-slate-300">
                zaqifpgqkrsirkgcgdft (mitmhackathonApp)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Portal Container */}
      <div className="flex-1 w-full">
        {/* VIEW 1: Candidate Portal (Member 2 Complete) */}
        {activePortal === 'CANDIDATE' && <CandidatePortalApp />}

        {/* VIEW 2: HR Dashboard (Member 3 Complete) */}
        {activePortal === 'HR' && <HrDashboardApp />}

        {/* VIEW 3: Allocation Engine & Architecture Showcase (Member 1) */}
        {activePortal === 'ENGINE' && (
          <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
            <Navbar
              jobs={jobs}
              selectedJobId={selectedJobId}
              onSelectJob={handleSelectJob}
              rankingWeights={rankingWeights}
              onOpenRankingModal={() => setIsRankingModalOpen(true)}
              activeTab={activeEngineTab}
              onSelectTab={setActiveEngineTab}
              portalMode={m1PortalMode}
              onTogglePortalMode={handleToggleM1PortalMode}
              pendingOffersCount={pendingOffersCount}
            />

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {m1PortalMode === 'CANDIDATE' ? (
                activeEngineTab === 'candidate-matching' ? (
                  <RoleMatchingView
                    candidates={candidates}
                    selectedCandidateId={selectedCandidateId}
                    onSelectCandidate={setSelectedCandidateId}
                    job={selectedJob}
                  />
                ) : (
                  <CandidatePortalView
                    candidates={candidates}
                    authenticatedCandidateId={selectedCandidateId}
                    onSelectCandidate={setSelectedCandidateId}
                    job={selectedJob}
                    onRefreshData={refreshEngineData}
                  />
                )
              ) : (
                <>
                  {activeEngineTab === 'allocation' && (
                    <AllocationConsole
                      candidates={candidates}
                      job={selectedJob}
                      vacancies={vacancies}
                      allocations={allocations}
                      rankingWeights={rankingWeights}
                      onRefreshData={refreshEngineData}
                      onNavigateToTab={setActiveEngineTab}
                    />
                  )}

                  {activeEngineTab === 'matching' && (
                    <RoleMatchingView
                      candidates={candidates}
                      selectedCandidateId={selectedCandidateId}
                      onSelectCandidate={setSelectedCandidateId}
                      job={selectedJob}
                    />
                  )}

                  {activeEngineTab === 'vacancies' && (
                    <VacancyTrackerView
                      vacancies={vacancies}
                      jobTitle={selectedJob.title}
                    />
                  )}

                  {activeEngineTab === 'overflow' && (
                    <OverflowRecommendationView
                      candidates={candidates}
                      job={selectedJob}
                      vacancies={vacancies}
                      alternativeOffers={alternativeOffers}
                      allocations={allocations}
                      onRefreshData={refreshEngineData}
                      onNavigateToCandidatePortal={handleNavigateToCandidateDecision}
                    />
                  )}

                  {activeEngineTab === 'waitlist' && (
                    <WaitlistManagerView
                      waitlist={waitlist}
                      onRefreshData={refreshEngineData}
                    />
                  )}

                  {activeEngineTab === 'audit' && <AuditHistoryView logs={auditLogs} />}
                </>
              )}
            </main>

            <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
              <div className="max-w-7xl mx-auto px-4">
                <p className="font-semibold text-slate-700">
                  HireSlot &bull; Architecture, Role Matching & Location Allocation Module (Member 1)
                </p>
                <p className="mt-1">
                  Fully integrated with Member 2 (Candidate Portal), Member 3 (HR Dashboard) & Member 4 (Supabase Backend)
                </p>
              </div>
            </footer>

            <HrRankingConfigModal
              isOpen={isRankingModalOpen}
              onClose={() => setIsRankingModalOpen(false)}
              currentWeights={rankingWeights}
              onSave={handleSaveRankingWeights}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default App;

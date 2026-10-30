import React, { useState, useEffect } from 'react';
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

export const App: React.FC = () => {
  // Global service data snapshot
  const [jobs, setJobs] = useState(hireSlotService.getJobs());
  const [candidates, setCandidates] = useState(hireSlotService.getCandidates());
  const [selectedJobId, setSelectedJobId] = useState<string>(jobs[0]?.id || '');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>(
    candidates[1]?.id || candidates[0]?.id || ''
  );
  const [portalMode, setPortalMode] = useState<'HR' | 'CANDIDATE'>('HR');
  const [activeTab, setActiveTab] = useState<string>('allocation');
  const [rankingWeights, setRankingWeights] = useState<HrRankingWeights>(
    hireSlotService.getRankingWeights()
  );
  const [isRankingModalOpen, setIsRankingModalOpen] = useState<boolean>(false);

  // Derived filtered state
  const selectedJob = jobs.find((j) => j.id === selectedJobId) || jobs[0];
  const [vacancies, setVacancies] = useState(
    hireSlotService.getVacancies(selectedJobId)
  );
  const [allocations, setAllocations] = useState(
    hireSlotService.getAllocations(selectedJobId)
  );
  const [alternativeOffers, setAlternativeOffers] = useState(
    hireSlotService.getAlternativeOffers()
  );
  const [waitlist, setWaitlist] = useState(
    hireSlotService.getWaitlist(selectedJobId)
  );
  const [auditLogs, setAuditLogs] = useState(hireSlotService.getAuditLogs());

  // Count active pending offers for badge
  const pendingOffersCount = alternativeOffers.filter((o) => o.status === 'PENDING').length;

  // Refresh handler after operations
  const refreshData = () => {
    setJobs(hireSlotService.getJobs());
    setCandidates(hireSlotService.getCandidates());
    setVacancies(hireSlotService.getVacancies(selectedJobId));
    setAllocations(hireSlotService.getAllocations(selectedJobId));
    setAlternativeOffers(hireSlotService.getAlternativeOffers());
    setWaitlist(hireSlotService.getWaitlist(selectedJobId));
    setAuditLogs(hireSlotService.getAuditLogs());
    setRankingWeights(hireSlotService.getRankingWeights());
  };

  // Realtime subscription for HR Dashboard to listen to candidate_allocations
  useEffect(() => {
    const unsubscribe = realtimeAllocationService.subscribeToHrAllocations(() => {
      // Whenever candidate accepts/declines or status changes, sync HR view in real-time
      refreshData();
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
    refreshData();
  };

  const handleTogglePortalMode = (mode: 'HR' | 'CANDIDATE') => {
    setPortalMode(mode);
    if (mode === 'CANDIDATE') {
      setActiveTab('candidate-decision');
    } else {
      setActiveTab('allocation');
    }
  };

  const handleNavigateToCandidatePortal = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setPortalMode('CANDIDATE');
    setActiveTab('candidate-decision');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900">
      {/* Navigation & Header */}
      <Navbar
        jobs={jobs}
        selectedJobId={selectedJobId}
        onSelectJob={handleSelectJob}
        rankingWeights={rankingWeights}
        onOpenRankingModal={() => setIsRankingModalOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        portalMode={portalMode}
        onTogglePortalMode={handleTogglePortalMode}
        pendingOffersCount={pendingOffersCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {portalMode === 'CANDIDATE' ? (
          activeTab === 'candidate-matching' ? (
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
              onRefreshData={refreshData}
            />
          )
        ) : (
          <>
            {activeTab === 'allocation' && (
              <AllocationConsole
                candidates={candidates}
                job={selectedJob}
                vacancies={vacancies}
                allocations={allocations}
                rankingWeights={rankingWeights}
                onRefreshData={refreshData}
                onNavigateToTab={setActiveTab}
              />
            )}

            {activeTab === 'matching' && (
              <RoleMatchingView
                candidates={candidates}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={setSelectedCandidateId}
                job={selectedJob}
              />
            )}

            {activeTab === 'vacancies' && (
              <VacancyTrackerView
                vacancies={vacancies}
                jobTitle={selectedJob.title}
              />
            )}

            {activeTab === 'overflow' && (
              <OverflowRecommendationView
                candidates={candidates}
                job={selectedJob}
                vacancies={vacancies}
                alternativeOffers={alternativeOffers}
                allocations={allocations}
                onRefreshData={refreshData}
                onNavigateToCandidatePortal={handleNavigateToCandidatePortal}
              />
            )}

            {activeTab === 'waitlist' && (
              <WaitlistManagerView
                waitlist={waitlist}
                onRefreshData={refreshData}
              />
            )}

            {activeTab === 'audit' && <AuditHistoryView logs={auditLogs} />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-700">
            HireSlot &bull; Architecture, Role Matching & Location Allocation Module
          </p>
          <p className="mt-1">
            Coordinated with Member 2 (Candidate Portal) & Member 3 (HR Dashboard) &bull; Supabase Realtime Active
          </p>
        </div>
      </footer>

      {/* HR Config Modal */}
      <HrRankingConfigModal
        isOpen={isRankingModalOpen}
        onClose={() => setIsRankingModalOpen(false)}
        currentWeights={rankingWeights}
        onSave={handleSaveRankingWeights}
      />
    </div>
  );
};

export default App;

import React, { useState, useEffect, useCallback } from 'react';
import {
  HiringDrive,
  JobRole,
  CityVacancy,
  Candidate,
  CandidateAllocation,
  InterviewSlot,
  InterviewWaitlistEntry,
  AttendanceRecord,
  AbsenceReview,
  TravelPolicyTier,
  RelocationPolicyTier,
  ExpenseClaim,
  PayrollDisbursement,
  RankingRulesConfig,
  AuditLog,
  DashboardKPIs,
  UserRole
} from './types';
import { storageService } from './lib/storage';
import { useAuth } from './lib/useAuth';
import { supabase, isSupabaseConfigured } from './lib/supabase';

// Layout & Components
import { Sidebar, DashboardViewId } from './components/layout/Sidebar';
import { Topbar } from './components/layout/Topbar';
import { RoleGuard } from './components/layout/RoleGuard';
import { ErrorBanner } from './components/common/ErrorBanner';
import { SupabaseSettingsModal } from './components/common/SupabaseSettingsModal';
import { LoginPage } from './components/auth/LoginPage';

// Modules
import { RecruitmentOverview } from './components/modules/Overview/RecruitmentOverview';
import { DemandCapacityVisualization } from './components/modules/DemandCapacity/DemandCapacityVisualization';
import { HiringDrivesModule } from './components/modules/HiringDrives/HiringDrivesModule';
import { JobRolesModule } from './components/modules/JobRoles/JobRolesModule';
import { CityVacanciesModule } from './components/modules/CityVacancies/CityVacanciesModule';
import { CandidateAllocationModule } from './components/modules/CandidateAllocation/CandidateAllocationModule';
import { OverflowManagementModule } from './components/modules/OverflowManagement/OverflowManagementModule';
import { InterviewSlotsModule } from './components/modules/InterviewSlots/InterviewSlotsModule';
import { WaitlistRecoveryModule } from './components/modules/WaitlistRecovery/WaitlistRecoveryModule';
import { CandidateAttendanceModule } from './components/modules/Attendance/CandidateAttendanceModule';
import { AbsenceReviewModule } from './components/modules/AbsenceReview/AbsenceReviewModule';
import { TravelPolicyModule } from './components/modules/TravelPolicy/TravelPolicyModule';
import { RelocationPolicyModule } from './components/modules/RelocationPolicy/RelocationPolicyModule';
import { ExpenseClaimsModule } from './components/modules/ExpenseClaims/ExpenseClaimsModule';
import { PayrollTrackingModule } from './components/modules/PayrollTracking/PayrollTrackingModule';
import { AuditLogModule } from './components/modules/AuditLog/AuditLogModule';

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex min-h-[240px] items-center justify-center gap-3 text-sm text-text-muted" role="status" aria-live="polite">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function App() {
  const { status: authStatus, role: sessionRole, logout } = useAuth();

  const [currentView, setCurrentView] = useState<DashboardViewId>('overview');
  // currentRole is strictly derived from authenticated Supabase identity and cannot be altered client-side.
  const currentRole: UserRole | null = sessionRole;
  const [selectedDriveId, setSelectedDriveId] = useState<string>('ALL');

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Supabase Modal & Ranking Rules Drawer
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isRankingRulesOpen, setIsRankingRulesOpen] = useState(false);

  // Domain Entities State
  const [drives, setDrives] = useState<HiringDrive[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [vacancies, setVacancies] = useState<CityVacancy[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [allocations, setAllocations] = useState<CandidateAllocation[]>([]);
  const [slots, setSlots] = useState<InterviewSlot[]>([]);
  const [waitlist, setWaitlist] = useState<InterviewWaitlistEntry[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [absenceReviews, setAbsenceReviews] = useState<AbsenceReview[]>([]);
  const [travelPolicies, setTravelPolicies] = useState<TravelPolicyTier[]>([]);
  const [relocationPolicies, setRelocationPolicies] = useState<RelocationPolicyTier[]>([]);
  const [expenses, setExpenses] = useState<ExpenseClaim[]>([]);
  const [payroll, setPayroll] = useState<PayrollDisbursement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [rankingRules, setRankingRules] = useState<RankingRulesConfig>({
    id: 'default',
    driveId: 'drv-001',
    skillMatchWeight: 35,
    experienceWeight: 20,
    locationMatchWeight: 25,
    relocationWillingnessWeight: 10,
    assessmentScoreWeight: 10,
    prioritizeFirstPreference: true,
    minPassingThreshold: 65,
    allowBufferOverflow: true,
    maxBufferPercentage: 20,
    updatedAt: new Date().toISOString(),
    updatedBy: 'System',
  });


  const [kpis, setKpis] = useState<DashboardKPIs>({
    totalActiveDrives: 0,
    totalOpenVacancies: 0,
    totalCandidates: 0,
    totalAllocated: 0,
    totalInterviewSlots: 0,
    slotsBooked: 0,
    attendanceRate: 0,
    pendingAbsenceReviews: 0,
    pendingExpenseClaimsTotal: 0,
    claimsCount: 0,
    overflowCount: 0,
    waitlistCount: 0,
  });

  // Load all data
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    setErrorMessage(null);

    try {
      const [
        drivesData,
        rolesData,
        vacanciesData,
        candidatesData,
        allocationsData,
        slotsData,
        waitlistData,
        attendanceData,
        absenceData,
        travelData,
        reloData,
        expenseData,
        payrollData,
        auditData,
        rulesData,
        kpiData
      ] = await Promise.all([
        storageService.getDrives(),
        storageService.getRoles(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getVacancies(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getCandidates(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getAllocations(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getSlots(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getWaitlist(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getAttendance(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getAbsenceReviews(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getTravelPolicies(),
        storageService.getRelocationPolicies(),
        storageService.getExpenseClaims(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getPayrollDisbursements(selectedDriveId === 'ALL' ? undefined : selectedDriveId),
        storageService.getAuditLogs(),
        storageService.getRankingRules(),
        storageService.getDynamicKPIs(selectedDriveId)
      ]);

      setDrives(drivesData);
      setRoles(rolesData);
      setVacancies(vacanciesData);
      setCandidates(candidatesData);
      setAllocations(allocationsData);
      setSlots(slotsData);
      setWaitlist(waitlistData);
      setAttendance(attendanceData);
      setAbsenceReviews(absenceData);
      setTravelPolicies(travelData);
      setRelocationPolicies(reloData);
      setExpenses(expenseData);
      setPayroll(payrollData);
      setAuditLogs(auditData);
      setRankingRules(rulesData);
      setKpis(kpiData);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setErrorMessage(err.message || 'An error occurred while communicating with the storage layer.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedDriveId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Phase 4: Supabase Realtime Subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    const channel = supabase
      .channel('hireslot-hr-dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'candidate_allocations' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interview_slots' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_logs' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'absence_reviews' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_claims' }, () => {
        loadDashboardData(true);
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadDashboardData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData(true);
  };

  // Badge counts for sidebar
  const badgeCounts = {
    overflow: allocations.filter(a => a.status === 'OVERFLOW' || a.status === 'ALTERNATIVE_OFFERED').length,
    waitlist: waitlist.length,
    pendingAbsence: absenceReviews.filter(r => r.status === 'PENDING').length,
    pendingClaims: expenses.filter(e => e.status === 'SUBMITTED').length,
    blockedCandidates: candidates.filter(c => c.isSilentlyBlocked).length,
  };

  // Operations Handlers
  const handleCreateDrive = async (driveData: Partial<HiringDrive>) => {
    await storageService.createDrive(driveData, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleUpdateDrive = async (id: string, updates: Partial<HiringDrive>) => {
    await storageService.updateDrive(id, updates, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleCreateRole = async (roleData: Partial<JobRole>) => {
    await storageService.createRole(roleData, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleUpdateRole = async (id: string, updates: Partial<JobRole>) => {
    await storageService.updateRole(id, updates, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleArchiveRole = async (id: string) => {
    await storageService.archiveRole(id, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleSaveVacancy = async (vacData: Partial<CityVacancy>) => {
    await storageService.saveVacancy(vacData, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleAllocateCandidate = async (candidateId: string, city: string) => {
    await storageService.allocateCandidate(candidateId, city, 'HR Recruiter', currentRole ?? undefined);
    await loadDashboardData(true);
  };

  const handleOverrideBlock = async (candidateId: string, note: string, city: string) => {
    await storageService.overrideCandidateBlock(candidateId, note, city, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleUpdateRankingRules = async (rules: Partial<RankingRulesConfig>) => {
    await storageService.updateRankingRules(rules, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleOfferAlternativeCity = async (
    allocId: string,
    altCity: string,
    stipend: number,
    notes: string
  ) => {
    await storageService.offerAlternativeCity(allocId, altCity, stipend, notes, 'HR Recruiter');
    await loadDashboardData(true);
  };

  const handleRespondAlternativeOffer = async (allocId: string, accept: boolean) => {
    await storageService.respondAlternativeCity(allocId, accept, 'HR Recruiter');
    await loadDashboardData(true);
  };

  const handleCreateSlot = async (slotData: Partial<InterviewSlot>) => {
    await storageService.createSlot(slotData, 'Interview Coordinator');
    await loadDashboardData(true);
  };

  const handleAssignCandidateToSlot = async (slotId: string, candidateId: string) => {
    await storageService.assignSlot(slotId, candidateId, 'Interview Coordinator');
    await loadDashboardData(true);
  };

  const handleFastFillSlot = async (slotId: string) => {
    await storageService.recoverSlotAndFastFill(slotId, undefined, 'Interview Coordinator');
    await loadDashboardData(true);
  };

  const handleMarkAttendance = async (
    attId: string,
    status: AttendanceRecord['status'],
    badgeNum?: string
  ) => {
    await storageService.markAttendance(attId, status, badgeNum, 'Interview Coordinator');
    await loadDashboardData(true);
  };

  const handleDecideAbsence = async (
    reviewId: string,
    decision: 'APPROVED_RESCHEDULE' | 'APPROVED_REPOOL' | 'DISQUALIFIED',
    notes: string
  ) => {
    await storageService.decideAbsence(reviewId, decision, notes, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleUpdateTravelPolicies = async (policies: TravelPolicyTier[]) => {
    await storageService.updateTravelPolicies(policies, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleUpdateRelocationPolicies = async (policies: RelocationPolicyTier[]) => {
    await storageService.updateRelocationPolicies(policies, 'HR Admin');
    await loadDashboardData(true);
  };

  const handleDecideClaim = async (
    claimId: string,
    action: 'APPROVE' | 'ADJUST' | 'REJECT',
    approvedAmount?: number,
    notes?: string
  ) => {
    await storageService.decideExpenseClaim(claimId, action, approvedAmount, notes, 'Finance Officer');
    await loadDashboardData(true);
  };

  const handleProcessPayrollBatch = async (batchCode: string) => {
    await storageService.processPayrollBatch(batchCode, 'Finance Officer');
    await loadDashboardData(true);
  };

  // ── Auth gate ────────────────────────────────────────────────────────────────

  // While the Supabase session is being restored, show a full-screen spinner
  // so we don't flash the login page on refresh for already-authenticated users.
  if (authStatus === 'initialising') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gap-3 text-sm text-text-muted">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-sage-500 border-r-transparent" />
        <span>Loading HireSlot…</span>
      </div>
    );
  }

  // Show the login page when no valid authenticated session exists.
  if (authStatus === 'unauthenticated') {
    return <LoginPage onLogin={() => { loadDashboardData(); }} />;
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col antialiased font-sans text-text-main selection:bg-sage-100 selection:text-sage-800">
      <div className="flex flex-1">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          currentRole={currentRole}
          badgeCounts={badgeCounts}
        />

        {/* Right Main Body */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar
            drives={drives}
            selectedDriveId={selectedDriveId}
            onSelectDrive={setSelectedDriveId}
            currentRole={currentRole}
            onRefresh={handleRefresh}
            onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
            isRefreshing={isRefreshing}
            onLogout={logout}
          />

          <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
            {/* Error Banner */}
            {errorMessage && (
              <ErrorBanner
                title="System Connection Notice"
                message={errorMessage}
                onRetry={handleRefresh}
              />
            )}

            {/* Loading Spinner */}
            {isLoading ? (
              <LoadingSpinner label="Querying HireSlot Enterprise Database & Computing Allocations..." />
            ) : (
              <>
                {/* 1. Overview */}
                {currentView === 'overview' && (
                  <RecruitmentOverview
                    kpis={kpis}
                    drives={drives}
                    selectedDriveId={selectedDriveId}
                    auditLogs={auditLogs}
                    onNavigate={setCurrentView}
                    onOpenRulesDrawer={() => {
                      setCurrentView('candidate-allocation');
                      setIsRankingRulesOpen(true);
                    }}
                  />
                )}

                {/* 5. Demand vs Capacity */}
                {currentView === 'demand-capacity' && (
                  <DemandCapacityVisualization
                    vacancies={vacancies}
                    candidates={candidates}
                    slots={slots}
                    allocations={allocations}
                    drives={drives}
                    roles={roles}
                    selectedDriveId={selectedDriveId}
                  />
                )}

                {/* 2. Hiring Drives */}
                {currentView === 'hiring-drives' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'HR_RECRUITER']}
                  >
                    <HiringDrivesModule
                      drives={drives}
                      onCreateDrive={handleCreateDrive}
                      onUpdateDrive={handleUpdateDrive}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 3. Job Roles & Skills */}
                {currentView === 'job-roles' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'HR_RECRUITER']}
                  >
                    <JobRolesModule
                      roles={roles}
                      drives={drives}
                      selectedDriveId={selectedDriveId}
                      onCreateRole={handleCreateRole}
                      onUpdateRole={handleUpdateRole}
                      onArchiveRole={handleArchiveRole}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 4. City Vacancies */}
                {currentView === 'city-vacancies' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'HR_RECRUITER']}
                  >
                    <CityVacanciesModule
                      vacancies={vacancies}
                      allocations={allocations}
                      drives={drives}
                      roles={roles}
                      selectedDriveId={selectedDriveId}
                      onSaveVacancy={handleSaveVacancy}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 6. Candidate Allocation & Location Drilldown */}
                {currentView === 'candidate-allocation' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'HR_RECRUITER']}
                  >
                    <CandidateAllocationModule
                      candidates={candidates}
                      allocations={allocations}
                      roles={roles}
                      vacancies={vacancies}
                      rankingRules={rankingRules}
                      onAllocateCandidate={handleAllocateCandidate}
                      onOverrideBlock={handleOverrideBlock}
                      onUpdateRankingRules={handleUpdateRankingRules}
                      currentRole={currentRole}
                      isRankingDrawerOpen={isRankingRulesOpen}
                      setIsRankingDrawerOpen={setIsRankingRulesOpen}
                    />
                  </RoleGuard>
                )}

                {/* 7. Overflow & Alternative Offers */}
                {currentView === 'overflow-management' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'HR_RECRUITER']}
                  >
                    <OverflowManagementModule
                      candidates={candidates}
                      allocations={allocations}
                      vacancies={vacancies}
                      onOfferAlternativeCity={handleOfferAlternativeCity}
                      onRespondAlternativeOffer={handleRespondAlternativeOffer}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 8. Interview Slots & Calendar */}
                {currentView === 'interview-slots' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'INTERVIEW_COORDINATOR']}
                  >
                    <InterviewSlotsModule
                      slots={slots}
                      candidates={candidates}
                      allocations={allocations}
                      vacancies={vacancies}
                      selectedDriveId={selectedDriveId}
                      onCreateSlot={handleCreateSlot}
                      onAssignCandidate={handleAssignCandidateToSlot}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 9. Waitlist & Fast-Fill Recovery */}
                {currentView === 'waitlist-recovery' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'INTERVIEW_COORDINATOR']}
                  >
                    <WaitlistRecoveryModule
                      waitlist={waitlist}
                      slots={slots}
                      onFastFillSlot={handleFastFillSlot}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 10. Candidate Attendance Desk */}
                {currentView === 'candidate-attendance' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'INTERVIEW_COORDINATOR']}
                  >
                    <CandidateAttendanceModule
                      attendanceRecords={attendance}
                      onMarkAttendance={handleMarkAttendance}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 11. Absence Review & HR Decisions */}
                {currentView === 'absence-review' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN']}
                  >
                    <AbsenceReviewModule
                      reviews={absenceReviews}
                      onDecideAbsence={handleDecideAbsence}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 12. Travel Policy */}
                {currentView === 'travel-policy' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'FINANCE_OFFICER']}
                  >
                    <TravelPolicyModule
                      policies={travelPolicies}
                      onUpdatePolicies={handleUpdateTravelPolicies}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 13. Relocation Policy */}
                {currentView === 'relocation-policy' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'FINANCE_OFFICER']}
                  >
                    <RelocationPolicyModule
                      policies={relocationPolicies}
                      onUpdatePolicies={handleUpdateRelocationPolicies}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 14. Expense Claims Approval */}
                {currentView === 'expense-claims' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'FINANCE_OFFICER']}
                  >
                    <ExpenseClaimsModule
                      claims={expenses}
                      onDecideClaim={handleDecideClaim}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 15. Payroll Disbursements Tracking */}
                {currentView === 'payroll-tracking' && (
                  <RoleGuard
                    currentRole={currentRole}
                    allowedRoles={['HR_ADMIN', 'FINANCE_OFFICER']}
                  >
                    <PayrollTrackingModule
                      disbursements={payroll}
                      onProcessBatch={handleProcessPayrollBatch}
                      currentRole={currentRole}
                    />
                  </RoleGuard>
                )}

                {/* 16. Audit History */}
                {currentView === 'audit-history' && (
                  <AuditLogModule
                    auditLogs={auditLogs}
                    currentRole={currentRole}
                  />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Supabase Settings Modal */}
      <SupabaseSettingsModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        onResetData={handleRefresh}
      />
    </div>
  );
}

export default App;

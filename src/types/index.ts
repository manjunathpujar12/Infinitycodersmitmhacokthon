// HireSlot Shared TypeScript Types and Agreed Database Schema Definitions

export type UserRole = 'HR_ADMIN' | 'HR_RECRUITER' | 'INTERVIEW_COORDINATOR' | 'FINANCE_OFFICER';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  title: string;
}

export type DriveStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type DriveMode = 'ON_SITE' | 'HYBRID' | 'VIRTUAL';

export interface HiringDrive {
  id: string;
  code: string; // e.g., 'DRV-2026-Q4-ENG'
  title: string;
  description: string;
  mode: DriveMode;
  status: DriveStatus;
  startDate: string;
  endDate: string;
  totalTargetHeadcount: number;
  rolesCount?: number;
  citiesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SkillRequirement {
  id: string;
  name: string;
  category: 'core' | 'framework' | 'tools' | 'soft_skill';
  isMandatory: boolean;
  minYearsExperience: number;
  weight: number; // 1-10
}

export interface JobRole {
  id: string;
  driveId: string;
  title: string;
  department: string;
  bandLevel: string; // e.g., 'L3 / Junior', 'L4 / Mid-Senior', 'L5 / Lead'
  baseSalaryMin: number;
  baseSalaryMax: number;
  currency: string;
  minYearsExperience: number;
  requiredSkills: SkillRequirement[];
  evaluationCriteria: {
    skillMatchWeight: number; // e.g., 40
    experienceWeight: number; // e.g., 25
    assessmentWeight: number; // e.g., 20
    locationPrefWeight: number; // e.g., 15
  };
  createdAt: string;
}

export interface CityVacancy {
  id: string;
  driveId: string;
  roleId: string;
  city: string;
  targetHeadcount: number;
  bufferPercentage: number; // e.g. 15 for 15% buffer
  minBarScore: number; // e.g. 75
  venueName: string;
  venueAddress: string;
  pointOfContactName: string;
  pointOfContactPhone: string;
  createdAt: string;
}

export type AllocationStatus = 
  | 'PENDING'
  | 'ALLOCATED'
  | 'WAITLISTED'
  | 'OVERFLOW'
  | 'ALTERNATIVE_OFFERED'
  | 'ALTERNATIVE_ACCEPTED'
  | 'ALTERNATIVE_DECLINED'
  | 'BLOCKED'
  | 'WITHDRAWN';

export type CandidateRelocationReadiness = 'HIGH' | 'MEDIUM' | 'LOW' | 'NOT_WILLING';

export interface Candidate {
  id: string;
  driveId: string;
  roleId: string;
  fullName: string;
  email: string;
  phone: string;
  currentCity: string;
  preferredCities: string[]; // ordered preferences: ['Bengaluru', 'Pune']
  relocationReadiness: CandidateRelocationReadiness;
  yearsExperience: number;
  skills: string[];
  assessmentScore: number; // 0-100
  resumeUrl?: string;
  appliedDate: string;
  isSilentlyBlocked?: boolean; // Must NEVER be silently blocked
  blockedReason?: string;
  hrExemptionGranted?: boolean;
  hrExemptionNote?: string;
}

export interface RecommendationBreakdown {
  totalScore: number; // 0-100
  cityMatchScore: number; // e.g., 35/35 if 1st choice
  skillMatchScore: number; // e.g., 32/35
  experienceScore: number; // e.g., 15/15
  relocationScore: number; // e.g., 15/15
  reasons: string[];
  warnings: string[];
}

export interface CandidateAllocation {
  id: string;
  driveId: string;
  candidateId: string;
  roleId: string;
  allocatedCity: string;
  status: AllocationStatus;
  rank: number;
  matchScore: number;
  recommendationBreakdown: RecommendationBreakdown;
  alternativeCity?: string;
  alternativeCityNotes?: string;
  relocationStipendOffered?: number;
  allocatedAt: string;
  updatedAt: string;
  allocatedBy: string;
}

export type InterviewSlotStatus = 'AVAILABLE' | 'BOOKED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

export interface InterviewSlot {
  id: string;
  driveId: string;
  city: string;
  roleId: string;
  slotDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  interviewerName: string;
  interviewerEmail: string;
  roomOrLink: string;
  maxCapacity: number;
  currentCandidateId?: string;
  candidateName?: string;
  status: InterviewSlotStatus;
  createdAt: string;
  recycledFromCandidateId?: string;
  recycledAt?: string;
}

export type WaitlistPriority = 'HIGH' | 'STANDARD' | 'LOW';

export interface InterviewWaitlistEntry {
  id: string;
  driveId: string;
  candidateId: string;
  candidateName: string;
  city: string;
  roleTitle: string;
  score: number;
  priority: WaitlistPriority;
  waitlistedAt: string;
  notifiedCount: number;
  recoveryAutoEligible: boolean;
  reasonForWaitlist: string;
}

export type AttendanceStatus = 'EXPECTED' | 'CHECKED_IN' | 'IN_INTERVIEW' | 'COMPLETED' | 'LATE' | 'ABSENT';

export interface AttendanceRecord {
  id: string;
  driveId: string;
  candidateId: string;
  candidateName: string;
  slotId: string;
  city: string;
  scheduledTime: string;
  checkInTime?: string;
  badgeNumber?: string;
  status: AttendanceStatus;
  assignedRoom?: string;
  notes?: string;
  markedBy?: string;
}

export type AbsenceReviewStatus = 'PENDING' | 'APPROVED_RESCHEDULE' | 'APPROVED_REPOOL' | 'DISQUALIFIED';

export interface AbsenceReview {
  id: string;
  driveId: string;
  candidateId: string;
  candidateName: string;
  attendanceId: string;
  absenceReason: string;
  category: 'MEDICAL' | 'TRAVEL_DISRUPTION' | 'FAMILY_EMERGENCY' | 'UNEXCUSED' | 'OTHER';
  evidenceUrl?: string;
  evidenceSummary?: string;
  submittedAt: string;
  status: AbsenceReviewStatus;
  hrDecisionBy?: string;
  hrDecisionAt?: string;
  hrDecisionNotes?: string;
  replacementSlotId?: string;
}

export interface TravelPolicyTier {
  id: string;
  tierName: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  allowedModes: ('CAB' | 'TRAIN_2AC' | 'TRAIN_1AC' | 'FLIGHT_ECONOMY')[];
  maxTicketReimbursement: number;
  dailyMealsAllowance: number;
  receiptRequiredThreshold: number;
  notes: string;
}

export interface RelocationPolicyTier {
  id: string;
  originType: 'SAME_STATE' | 'OUTSTATION_NON_METRO' | 'OUTSTATION_METRO' | 'INTERNATIONAL';
  lumpSumRelocationAllowance: number;
  guestHouseDays: number;
  shipmentMoversAllowance: number;
  retentionBondMonths: number;
  taxAssistanceIncluded: boolean;
}

export type ExpenseCategory = 'TRAVEL' | 'HOTEL' | 'MEALS' | 'LOCAL_COMMUTE' | 'MISCELLANEOUS';
export type ExpenseStatus = 'SUBMITTED' | 'HR_APPROVED' | 'ADJUSTED' | 'REJECTED' | 'QUEUED_PAYROLL' | 'DISBURSED';

export interface ExpenseClaim {
  id: string;
  driveId: string;
  candidateId: string;
  candidateName: string;
  category: ExpenseCategory;
  claimedAmount: number;
  approvedAmount?: number;
  currency: string;
  receiptUrl?: string;
  receiptName: string;
  expenseDate: string;
  policyCompliance: 'COMPLIANT' | 'OVER_LIMIT' | 'MISSING_RECEIPT' | 'NEEDS_JUSTIFICATION';
  complianceNote?: string;
  status: ExpenseStatus;
  hrReviewerNotes?: string;
  hrReviewerName?: string;
  reviewedAt?: string;
  submittedAt: string;
}

export type PayrollDisbursementStatus = 'PENDING' | 'QUEUED' | 'PROCESSING' | 'DISBURSED' | 'FAILED';

export interface PayrollDisbursement {
  id: string;
  driveId: string;
  batchCode: string;
  candidateId: string;
  candidateName: string;
  claimId: string;
  amount: number;
  currency: string;
  bankAccountMasked: string;
  paymentMethod: 'NEFT' | 'RTGS' | 'ACH' | 'DIRECT_DEPOSIT';
  status: PayrollDisbursementStatus;
  referenceNumber?: string;
  disbursedAt?: string;
  failureReason?: string;
  createdDate: string;
}

export interface RankingRulesConfig {
  id: string;
  driveId: string;
  skillMatchWeight: number; // 0-100
  experienceWeight: number; // 0-100
  locationMatchWeight: number; // 0-100
  relocationWillingnessWeight: number; // 0-100
  assessmentScoreWeight: number; // 0-100
  prioritizeFirstPreference: boolean;
  minPassingThreshold: number; // 0-100
  allowBufferOverflow: boolean;
  maxBufferPercentage: number;
  updatedAt: string;
  updatedBy: string;
}

export interface AuditLog {
  id: string;
  actorName: string;
  actorRole: UserRole;
  action: 
    | 'DRIVE_CREATED'
    | 'DRIVE_UPDATED'
    | 'ROLE_CONFIGURED'
    | 'VACANCY_UPDATED'
    | 'RANKING_RULES_UPDATED'
    | 'CANDIDATE_ALLOCATED'
    | 'ALLOCATION_OVERRIDE'
    | 'ALTERNATIVE_OFFER_MADE'
    | 'SLOT_CREATED'
    | 'SLOT_ASSIGNED'
    | 'SLOT_RECOVERED'
    | 'CHECK_IN_RECORDED'
    | 'ABSENCE_DECISION'
    | 'EXPENSE_APPROVED'
    | 'EXPENSE_ADJUSTED'
    | 'EXPENSE_REJECTED'
    | 'PAYROLL_BATCH_DISBURSED';
  entityType: string;
  entityId: string;
  description: string;
  details?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export interface DashboardKPIs {
  totalActiveDrives: number;
  totalOpenVacancies: number;
  totalCandidates: number;
  totalAllocated: number;
  totalInterviewSlots: number;
  slotsBooked: number;
  attendanceRate: number; // percentage
  pendingAbsenceReviews: number;
  pendingExpenseClaimsTotal: number;
  claimsCount: number;
  overflowCount: number;
  waitlistCount: number;
}

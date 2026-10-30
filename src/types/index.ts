// ==========================================
// HIRESLOT CANDIDATE PORTAL: SHARED TYPES
// ==========================================

export interface LocationPreference {
  city: string;
  priority: 1 | 2 | 3;
}

export interface CandidateSkill {
  skillName: string;
  rating: number; // 1-5
  matchesRequirement?: boolean;
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  graduationYear: number;
  gradeOrCgpa: string;
}

export interface ExperienceItem {
  id: string;
  companyName: string;
  roleTitle: string;
  startDate: string;
  endDate?: string;
  isCurrent: boolean;
  summary: string;
}

export interface RelocationPreferences {
  willingToRelocate: boolean;
  earliestRelocationDate?: string;
  preferredTimeline: 'IMMEDIATE' | '15_DAYS' | '30_DAYS' | '60_DAYS';
  requiresCorporateStay: boolean;
  requiresMovingAssistance: boolean;
  conditionsNotes?: string;
}

export type CandidateAllocationStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'OVERFLOW'
  | 'ALTERNATIVE_OFFERED'
  | 'WAITLISTED'
  | 'BLOCKED'
  | 'DECLINED';

export interface SkillRequirement {
  id: string;
  name: string;
  isMandatory: boolean;
  minProficiency: number; // 1-5
  weight: number; // percentage
}

export interface JobRole {
  id: string;
  title: string;
  department: string;
  experienceBand: '0-2 YRS' | '3-5 YRS' | '5-8 YRS' | '8+ YRS';
  minExperienceYears: number;
  cutoffScore: number;
  requiredSkills: SkillRequirement[];
  baseSalaryMin: number;
  baseSalaryMax: number;
  currency: string;
  active: boolean;
  description?: string;
}

export interface HiringDrive {
  id: string;
  title: string;
  batchCode: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'INTERVIEWING' | 'CONCLUDED';
  targetRoles: string[];
  targetLocations: string[];
  totalTargetHires: number;
}

export interface ResumeMetadata {
  fileName: string;
  fileSize: number; // in bytes
  fileType: string; // e.g. 'PDF' | 'DOC' | 'DOCX'
  uploadedAt: string; // ISO date string
  fileUrl?: string; // in-memory Object URL or remote storage URL
  storageType?: 'local_session' | 'supabase_storage';
}

export interface CandidateProfile {
  id: string;
  userId: string;
  driveId: string;
  roleId: string;
  fullName: string;
  email: string;
  phone: string;
  currentCity: string;
  bio?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  resume?: ResumeMetadata;
  experienceYears: number;
  education: EducationItem[];
  experienceHistory: ExperienceItem[];
  skills: CandidateSkill[];
  locationPreferences: LocationPreference[];
  relocation: RelocationPreferences;
  assessmentScore?: number;
  allocatedCity?: string;
  allocationStatus: CandidateAllocationStatus;
  interviewSlotId?: string;
  reconfirmedAttendance: boolean;
  reconfirmedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlternativeCityOffer {
  id: string;
  candidateId: string;
  candidateName: string;
  originalPreferredCity: string;
  offeredCity: string;
  driveId: string;
  roleId: string;
  relocationBonusOffered: number;
  currency: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  sentAt: string;
  expiresAt: string;
  notes?: string;
}

export interface InterviewPanel {
  leadInterviewerName: string;
  leadInterviewerEmail: string;
  shadowInterviewerName?: string;
  department: string;
}

export type SlotMode = 'VIRTUAL' | 'IN_PERSON';
export type SlotStatus = 'AVAILABLE' | 'BOOKED' | 'WAITLISTED' | 'RECOVERED' | 'COMPLETED' | 'CANCELLED';

export interface InterviewSlot {
  id: string;
  driveId: string;
  roleId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  mode: SlotMode;
  venueOrLink: string;
  locationCity: string;
  panel: InterviewPanel;
  maxCandidates: number;
  status: SlotStatus;
  bookedCandidateId?: string;
  bookedCandidateName?: string;
  notes?: string;
  isRecoveredSlot?: boolean;
}

export interface WaitlistEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  driveId: string;
  roleId: string;
  preferredCity: string;
  rankScore: number;
  waitlistedSince: string;
  status: 'QUEUED' | 'TIMED_OFFER_ACTIVE' | 'ASSIGNED' | 'EXPIRED';
}

export interface TimedSlotOffer {
  id: string;
  slotId: string;
  candidateId: string;
  offeredAt: string;
  expiresAt: string; // Countdown target (e.g. 15 minutes)
  slotDetails: {
    date: string;
    time: string;
    city: string;
    role: string;
  };
  status: 'ACTIVE' | 'CLAIMED' | 'DECLINED' | 'EXPIRED';
}

export type AttendanceStatus =
  | 'SCHEDULED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'LATE'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'EXCUSED';

export interface AttendanceRecord {
  id: string;
  slotId: string;
  candidateId: string;
  candidateName: string;
  roleTitle: string;
  scheduledTime: string;
  status: AttendanceStatus;
  checkInTime?: string;
  interviewStartTime?: string;
  interviewEndTime?: string;
  interviewerRating?: number;
  interviewerNotes?: string;
}

export interface AbsenceAppeal {
  id: string;
  candidateId: string;
  candidateName: string;
  slotId: string;
  interviewDate: string;
  reasonCategory: 'MEDICAL_EMERGENCY' | 'TRAVEL_DELAY' | 'TECHNICAL_CONNECTIVITY' | 'FAMILY_EMERGENCY' | 'UNEXCUSED';
  explanation: string;
  hasDocumentAttachment: boolean;
  documentName?: string;
  documentUrl?: string;
  submittedAt: string;
  hrDecisionStatus: 'PENDING_REVIEW' | 'RESCHEDULE_GRANTED' | 'RETEST_APPROVED' | 'APPEAL_REJECTED' | 'DOCS_REQUESTED';
  hrDecisionNotes?: string;
  decidedBy?: string;
  decidedAt?: string;
}

export type ExpenseCategory = 'AIR_TRAVEL' | 'TRAIN_TRAVEL' | 'LOCAL_CAB' | 'HOTEL_LODGING' | 'MEALS_PER_DIEM';

export interface TravelClaim {
  id: string;
  candidateId: string;
  candidateName: string;
  driveId: string;
  category: ExpenseCategory;
  claimAmount: number;
  approvedAmount?: number;
  currency: string;
  invoiceDate: string;
  receiptFileName: string;
  receiptUrl?: string;
  status: 'SUBMITTED' | 'HR_APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED' | 'SENT_TO_PAYROLL';
  policyLimitNotes?: string;
  submittedAt: string;
}

export interface RelocationClaim {
  id: string;
  candidateId: string;
  candidateName: string;
  driveId: string;
  relocationFromCity: string;
  relocationToCity: string;
  grantAmount: number;
  currency: string;
  bankAccountMasked: string;
  bankIfsc: string;
  status: 'SUBMITTED' | 'VERIFIED' | 'QUEUED_FOR_PAYROLL' | 'DISBURSED' | 'FAILED';
  transactionRefId?: string;
  disbursedAt?: string;
  submittedAt: string;
}

export interface SupabaseConfigState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
  isCustomConnected: boolean;
  lastCheckedAt?: string;
  errorMessage?: string;
}


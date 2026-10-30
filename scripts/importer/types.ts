/**
 * Types and Data Contracts for HireSense AI Dataset Importer
 * HireSlot Backend Infrastructure
 */

import {
  UserRole,
  SlotStatus,
  BookingStatus,
  WaitlistStatus,
  AttendanceStatus,
  AbsenceCaseStatus,
} from '../../types/database.types.js';

// ============================================================================
// Raw HireSense AI CSV Data Contracts
// ============================================================================

export interface RawCandidate {
  candidate_id: string;
  full_name: string;
  email: string;
  phone: string;
  education: string;
  degree: string;
  college: string;
  graduation_year: string;
  experience_level: string;
  experience_years: string;
  skills: string;
  current_location: string;
  relocation_willing: string;
  registration_date: string;
  resume_path: string;
}

export interface RawJob {
  job_id: string;
  job_role: string;
  required_skills: string;
  optional_skills: string;
  experience_required: string;
  minimum_qualification: string;
  location: string;
  vacancies: string;
  status: string;
  description: string;
}

export interface RawApplication {
  application_id: string;
  candidate_id: string;
  job_id: string;
  applied_date: string;
  application_status: string;
  source_channel: string;
}

export interface RawLocationPreference {
  preference_id: string;
  candidate_id: string;
  preferred_location: string;
  priority: string;
}

export interface RawRecruitmentEvent {
  event_id: string;
  event_name: string;
  location: string;
  event_date: string;
  registration_deadline: string;
  status: string;
  capacity: string;
}

export interface RawInterviewSlot {
  slot_id: string;
  event_id: string;
  location: string;
  interview_date: string;
  start_time: string;
  end_time: string;
  capacity: string;
  booked_count: string;
  status: string;
}

export interface RawInterview {
  interview_id: string;
  candidate_id: string;
  job_id: string;
  event_id: string;
  slot_id: string;
  scheduled_date: string;
  scheduled_time: string;
  interview_mode: string;
  booking_status: string;
}

export interface RawAttendance {
  attendance_id: string;
  interview_id: string;
  candidate_id: string;
  experience_level: string;
  attendance_status: string;
  absence_reason: string;
  justification_status: string;
  policy_action: string;
  recorded_by: string;
}

export interface RawHiringOutcome {
  outcome_id: string;
  interview_id: string;
  candidate_id: string;
  job_id: string;
  interview_result: string;
  final_status: string;
}

export interface RawSkillTaxonomy {
  skill_id: string;
  skill_name: string;
  occupation: string;
  skill_type: string;
  source: string;
}

// ============================================================================
// Transformed Entities Aligned to Existing Database Migrations
// ============================================================================

export interface TransformedLocation {
  id: string;
  company_id: string;
  name: string;
  city: string;
  country: string;
  timezone: string;
}

export interface TransformedProfile {
  id: string; // Foreign key matching auth.users(id)
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  metadata: {
    legacy_id: string;
    education: string;
    degree: string;
    college: string;
    graduation_year: number;
    experience_level: string;
    experience_years: number;
    skills: string[];
    current_location: string;
    relocation_willing: boolean;
    registration_date: string;
    resume_storage_path: string;
    applications?: Array<{
      application_id: string;
      job_id: string;
      applied_date: string;
      application_status: string;
      source_channel: string;
    }>;
    location_preferences?: Array<{
      preference_id: string;
      preferred_location: string;
      priority: number;
    }>;
    hiring_outcomes?: Array<{
      outcome_id: string;
      interview_id: string;
      interview_result: string;
      final_status: string;
    }>;
    is_synthetic_demo: boolean;
  };
}

export interface TransformedJobOpening {
  id: string;
  company_id: string;
  title: string;
  department: string;
  description: string;
  is_active: boolean;
}

export interface TransformedCityVacancy {
  id: string;
  job_opening_id: string;
  location_id: string;
  total_capacity: number;
  allocated_count: number;
}

export interface TransformedInterviewStage {
  id: string;
  job_opening_id: string;
  name: string;
  stage_order: number;
  duration_minutes: number;
}

export interface TransformedInterviewSlot {
  id: string;
  stage_id: string;
  interviewer_id: string;
  location_id?: string | null;
  start_time: string; // ISO 8601 TIMESTAMPTZ
  end_time: string;   // ISO 8601 TIMESTAMPTZ
  max_capacity: number;
  booked_count: number;
  status: SlotStatus;
  meeting_link?: string;
}

export interface TransformedBooking {
  id: string;
  slot_id: string;
  candidate_id: string;
  status: BookingStatus;
  booked_at: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
}

export interface TransformedWaitlist {
  id: string;
  stage_id: string;
  candidate_id: string;
  position: number;
  status: WaitlistStatus;
}

export interface TransformedAttendance {
  id: string;
  booking_id: string;
  candidate_id: string;
  status: AttendanceStatus;
  check_in_time?: string | null;
  marked_by: string;
  notes?: string;
}

export interface TransformedAbsenceCase {
  id: string;
  booking_id: string;
  candidate_id: string;
  reason_type: 'medical' | 'bereavement' | 'transit_delay' | 'tech_failure' | 'emergency' | 'other';
  explanation: string;
  status: AbsenceCaseStatus;
}

export interface DryRunValidationSummary {
  filesFound: Record<string, boolean>;
  recordCounts: Record<string, number>;
  syntheticPdfsFound: number;
  syntheticPdfsMissing: number;
  idTransformationsValid: boolean;
  dateTimeNormalizationsValid: boolean;
  enumMappingsValid: boolean;
  slotCapacityInvariantPassed: boolean;
  candidateConflictInvariantPassed: boolean;
  totalValidationErrors: number;
  errorMessages: string[];
}

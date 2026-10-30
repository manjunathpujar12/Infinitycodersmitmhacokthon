/**
 * HireSlot Backend Shared Database Types and RPC Contracts
 * Generated & architected for Supabase PostgreSQL
 */

export type UserRole = 
  | 'candidate' 
  | 'hr_staff' 
  | 'interviewer' 
  | 'payroll_officer' 
  | 'admin';

export type HrPermissionLevel = 'viewer' | 'manager' | 'admin';

export type SlotStatus = 'open' | 'booked' | 'cancelled' | 'completed';

export type BookingStatus = 'confirmed' | 'cancelled' | 'attended' | 'no_show';

export type WaitlistStatus = 'waiting' | 'offered' | 'expired' | 'accepted' | 'cancelled';

export type TimedOfferStatus = 'pending' | 'claimed' | 'expired' | 'declined';

export type AttendanceStatus = 
  | 'attended' 
  | 'late' 
  | 'absent_unexcused' 
  | 'absence_excused' 
  | 'absence_requested';

export type AbsenceCaseStatus = 
  | 'submitted' 
  | 'under_review' 
  | 'approved_reschedule' 
  | 'rejected';

export type ClaimCategory = 'interview_travel' | 'employee_relocation';

export type ReimbursementMethod = 'fixed_allowance' | 'actual_expenses';

export type ClaimStatus = 
  | 'draft' 
  | 'submitted' 
  | 'under_hr_review' 
  | 'hr_approved' 
  | 'hr_rejected' 
  | 'payout_queued' 
  | 'paid';

export type PayoutStatus = 'pending' | 'processed' | 'failed';

// ============================================================================
// Database Table Row Types
// ============================================================================

export interface Profile {
  id: string; // references auth.users(id)
  email: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
  role: UserRole;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  code: string;
  tax_identifier?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: string;
  company_id: string;
  name: string;
  city: string;
  state?: string | null;
  country: string;
  address?: string | null;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface HrPermission {
  id: string;
  user_id: string;
  company_id: string;
  location_id?: string | null;
  permission_level: HrPermissionLevel;
  created_at: string;
}

export interface JobOpening {
  id: string;
  company_id: string;
  title: string;
  department: string;
  description?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CityVacancy {
  id: string;
  job_opening_id: string;
  location_id: string;
  total_capacity: number;
  allocated_count: number;
  created_at: string;
  updated_at: string;
}

export interface InterviewStage {
  id: string;
  job_opening_id: string;
  name: string;
  stage_order: number;
  duration_minutes: number;
  description?: string | null;
  created_at: string;
}

export interface InterviewSlot {
  id: string;
  stage_id: string;
  interviewer_id: string;
  location_id?: string | null;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  status: SlotStatus;
  meeting_link?: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewBooking {
  id: string;
  slot_id: string;
  candidate_id: string;
  status: BookingStatus;
  booked_at: string;
  cancellation_reason?: string | null;
  cancelled_at?: string | null;
  updated_at: string;
}

export interface InterviewWaitlist {
  id: string;
  stage_id: string;
  candidate_id: string;
  position: number;
  status: WaitlistStatus;
  created_at: string;
  updated_at: string;
}

export interface TimedSlotOffer {
  id: string;
  waitlist_id: string;
  slot_id: string;
  candidate_id: string;
  offered_at: string;
  expires_at: string;
  status: TimedOfferStatus;
  response_at?: string | null;
}

export interface AttendanceRecord {
  id: string;
  booking_id: string;
  candidate_id: string;
  status: AttendanceStatus;
  check_in_time?: string | null;
  marked_by: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AbsenceCase {
  id: string;
  booking_id: string;
  candidate_id: string;
  reason_type: 'medical' | 'bereavement' | 'transit_delay' | 'tech_failure' | 'emergency' | 'other';
  explanation: string;
  proof_document_path?: string | null;
  status: AbsenceCaseStatus;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TravelPolicy {
  id: string;
  company_id: string;
  name: string;
  claim_category: 'interview_travel';
  eligibility_criteria: Record<string, unknown>;
  reimbursement_method: ReimbursementMethod;
  cap_amount: number;
  currency: string;
  valid_from: string;
  valid_to: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RelocationPolicy {
  id: string;
  company_id: string;
  name: string;
  claim_category: 'employee_relocation';
  eligibility_criteria: Record<string, unknown>;
  reimbursement_method: ReimbursementMethod;
  cap_amount: number;
  currency: string;
  move_window_days: number;
  valid_from: string;
  valid_to: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseClaim {
  id: string;
  claim_number: string;
  user_id: string;
  company_id: string;
  category: ClaimCategory;
  policy_id: string;
  booking_id?: string | null;
  claim_method: ReimbursementMethod;
  status: ClaimStatus;
  total_claimed_amount: number;
  approved_amount?: number | null;
  currency: string;
  submission_date?: string | null;
  hr_reviewer_id?: string | null;
  hr_reviewed_at?: string | null;
  hr_decision_notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseClaimItem {
  id: string;
  claim_id: string;
  expense_category: 'flight' | 'train' | 'hotel' | 'local_transit' | 'packers_movers' | 'meals' | 'temporary_housing' | 'other';
  expense_date: string;
  amount: number;
  currency: string;
  description: string;
  receipt_storage_path?: string | null;
  verified_by_hr: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClaimPayout {
  id: string;
  claim_id: string;
  payment_status: PayoutStatus;
  payout_reference?: string | null;
  payout_amount: number;
  currency: string;
  bank_account_last4: string; // strictly masked to last 4 digits
  bank_routing_or_ifsc_code?: string | null;
  processed_at?: string | null;
  processed_by?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RPC_CALL';
  actor_id?: string | null;
  actor_role?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
}

// ============================================================================
// Secure Database RPC Contracts
// ============================================================================

export interface BookInterviewSlotRpc {
  Args: { p_slot_id: string };
  Returns: {
    success: boolean;
    booking_id: string;
    slot_id: string;
    status: BookingStatus;
    start_time: string;
    end_time: string;
  };
}

export interface AllocateCityVacancyRpc {
  Args: {
    p_job_opening_id: string;
    p_location_id: string;
    p_count?: number;
  };
  Returns: {
    success: boolean;
    vacancy_id: string;
    job_opening_id: string;
    location_id: string;
    allocated_count: number;
    total_capacity: number;
    remaining_capacity: number;
  };
}

export interface JoinInterviewWaitlistRpc {
  Args: { p_stage_id: string };
  Returns: {
    success: boolean;
    waitlist_id: string;
    stage_id: string;
    position: number;
    status: WaitlistStatus;
  };
}

export interface OfferSlotToNextWaitlistedRpc {
  Args: {
    p_slot_id: string;
    p_validity_minutes?: number;
  };
  Returns: {
    success: boolean;
    offer_id?: string;
    slot_id?: string;
    candidate_id?: string;
    expires_at?: string;
    message?: string;
  };
}

export interface ClaimTimedSlotOfferRpc {
  Args: { p_offer_id: string };
  Returns: {
    success: boolean;
    booking_id: string;
    slot_id: string;
    status: BookingStatus;
  };
}

export interface MarkInterviewAttendanceRpc {
  Args: {
    p_booking_id: string;
    p_status: AttendanceStatus;
    p_notes?: string | null;
  };
  Returns: {
    success: boolean;
    attendance_id: string;
    booking_id: string;
    status: AttendanceStatus;
  };
}

export interface SubmitAbsenceCaseRpc {
  Args: {
    p_booking_id: string;
    p_reason_type: string;
    p_explanation: string;
    p_proof_document_path?: string | null;
  };
  Returns: {
    success: boolean;
    absence_case_id: string;
    booking_id: string;
    status: AbsenceCaseStatus;
  };
}

export interface ReviewAbsenceCaseRpc {
  Args: {
    p_case_id: string;
    p_decision: AbsenceCaseStatus;
    p_review_notes?: string | null;
  };
  Returns: {
    success: boolean;
    absence_case_id: string;
    status: AbsenceCaseStatus;
  };
}

export interface SubmitExpenseClaimRpc {
  Args: { p_claim_id: string };
  Returns: {
    success: boolean;
    claim_id: string;
    status: ClaimStatus;
    total_claimed_amount: number;
  };
}

export interface ReviewExpenseClaimRpc {
  Args: {
    p_claim_id: string;
    p_action: 'approve' | 'reject';
    p_approved_amount?: number | null;
    p_decision_notes?: string | null;
    p_rejection_reason?: string | null;
  };
  Returns: {
    success: boolean;
    claim_id: string;
    status: ClaimStatus;
    approved_amount?: number | null;
  };
}

export interface RecordClaimPayoutRpc {
  Args: {
    p_claim_id: string;
    p_payout_ref: string;
    p_bank_last4: string;
    p_bank_routing_or_ifsc?: string | null;
    p_notes?: string | null;
  };
  Returns: {
    success: boolean;
    claim_id: string;
    status: ClaimStatus;
    payout_reference: string;
    bank_last4: string;
    payout_amount: number;
  };
}

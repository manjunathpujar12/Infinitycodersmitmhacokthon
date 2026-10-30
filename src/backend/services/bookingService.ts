import { SupabaseClient } from '@supabase/supabase-js';
import {
  BookInterviewSlotRpc,
  AllocateCityVacancyRpc,
  AllocateCandidateRpc,
  FastFillSlotRpc,
  JoinInterviewWaitlistRpc,
  OfferSlotToNextWaitlistedRpc,
  ClaimTimedSlotOfferRpc,
  MarkInterviewAttendanceRpc,
  SubmitAbsenceCaseRpc,
  ReviewAbsenceCaseRpc,
  AttendanceStatus,
  AbsenceCaseStatus,
} from '../../../types/database.types.js';

export class BookingService {
  constructor(private client: SupabaseClient) {}

  /**
   * Atomically checks city capacity, prevents duplicates, handles overflow,
   * and creates a candidate allocation record for a job opening and location
   */
  async allocateCandidate(
    candidateId: string,
    jobOpeningId: string,
    locationId: string,
    allowOverflow: boolean = false
  ): Promise<AllocateCandidateRpc['Returns']> {
    const { data, error } = await this.client.rpc('allocate_candidate', {
      p_candidate_id: candidateId,
      p_job_opening_id: jobOpeningId,
      p_location_id: locationId,
      p_allow_overflow: allowOverflow,
    });

    if (error) {
      throw new Error(`Candidate allocation error: ${error.message}`);
    }

    return data as AllocateCandidateRpc['Returns'];
  }

  /**
   * Atomically recovers an interview slot by fast-filling with the next waitlisted candidate
   */
  async fastFillSlot(
    slotId: string,
    autoConfirm: boolean = true,
    validityMinutes: number = 30
  ): Promise<FastFillSlotRpc['Returns']> {
    const { data, error } = await this.client.rpc('fast_fill_slot', {
      p_slot_id: slotId,
      p_auto_confirm: autoConfirm,
      p_validity_minutes: validityMinutes,
    });

    if (error) {
      throw new Error(`Fast fill slot error: ${error.message}`);
    }

    return data as FastFillSlotRpc['Returns'];
  }

  /**
   * Atomically books an open interview slot with row-level locking
   */
  async bookSlot(slotId: string): Promise<BookInterviewSlotRpc['Returns']> {
    const { data, error } = await this.client.rpc('book_interview_slot', {
      p_slot_id: slotId,
    });

    if (error) {
      throw new Error(`Failed to book interview slot: ${error.message}`);
    }

    return data as BookInterviewSlotRpc['Returns'];
  }

  /**
   * Atomically allocates vacancy count for a city location quota
   */
  async allocateVacancy(
    jobOpeningId: string,
    locationId: string,
    count: number = 1
  ): Promise<AllocateCityVacancyRpc['Returns']> {
    const { data, error } = await this.client.rpc('allocate_city_vacancy', {
      p_job_opening_id: jobOpeningId,
      p_location_id: locationId,
      p_count: count,
    });

    if (error) {
      throw new Error(`Vacancy allocation error: ${error.message}`);
    }

    return data as AllocateCityVacancyRpc['Returns'];
  }

  /**
   * Enqueues a candidate into the waitlist for a stage
   */
  async joinWaitlist(stageId: string): Promise<JoinInterviewWaitlistRpc['Returns']> {
    const { data, error } = await this.client.rpc('join_interview_waitlist', {
      p_stage_id: stageId,
    });

    if (error) {
      throw new Error(`Failed to join waitlist: ${error.message}`);
    }

    return data as JoinInterviewWaitlistRpc['Returns'];
  }

  /**
   * Issues a timed offer to the top waitlisted candidate for an open slot
   */
  async offerSlotToNextWaitlist(
    slotId: string,
    validityMinutes: number = 30
  ): Promise<OfferSlotToNextWaitlistedRpc['Returns']> {
    const { data, error } = await this.client.rpc('offer_slot_to_next_waitlisted', {
      p_slot_id: slotId,
      p_validity_minutes: validityMinutes,
    });

    if (error) {
      throw new Error(`Failed to offer slot to waitlist: ${error.message}`);
    }

    return data as OfferSlotToNextWaitlistedRpc['Returns'];
  }

  /**
   * Claims a timed slot offer before expiration
   */
  async claimOffer(offerId: string): Promise<ClaimTimedSlotOfferRpc['Returns']> {
    const { data, error } = await this.client.rpc('claim_timed_slot_offer', {
      p_offer_id: offerId,
    });

    if (error) {
      throw new Error(`Failed to claim slot offer: ${error.message}`);
    }

    return data as ClaimTimedSlotOfferRpc['Returns'];
  }

  /**
   * Marks interview attendance by interviewer or HR
   */
  async markAttendance(
    bookingId: string,
    status: AttendanceStatus,
    notes?: string
  ): Promise<MarkInterviewAttendanceRpc['Returns']> {
    const { data, error } = await this.client.rpc('mark_interview_attendance', {
      p_booking_id: bookingId,
      p_status: status,
      p_notes: notes || null,
    });

    if (error) {
      throw new Error(`Attendance tracking error: ${error.message}`);
    }

    return data as MarkInterviewAttendanceRpc['Returns'];
  }

  /**
   * Submits an absence excuse case with medical/transit proof document
   */
  async submitAbsenceCase(
    bookingId: string,
    reasonType: string,
    explanation: string,
    proofDocumentPath?: string
  ): Promise<SubmitAbsenceCaseRpc['Returns']> {
    const { data, error } = await this.client.rpc('submit_absence_case', {
      p_booking_id: bookingId,
      p_reason_type: reasonType,
      p_explanation: explanation,
      p_proof_document_path: proofDocumentPath || null,
    });

    if (error) {
      throw new Error(`Failed to submit absence case: ${error.message}`);
    }

    return data as SubmitAbsenceCaseRpc['Returns'];
  }

  /**
   * Reviews and approves/reschedules an absence case by HR staff
   */
  async reviewAbsenceCase(
    caseId: string,
    decision: AbsenceCaseStatus,
    reviewNotes?: string
  ): Promise<ReviewAbsenceCaseRpc['Returns']> {
    const { data, error } = await this.client.rpc('review_absence_case', {
      p_case_id: caseId,
      p_decision: decision,
      p_review_notes: reviewNotes || null,
    });

    if (error) {
      throw new Error(`HR absence review error: ${error.message}`);
    }

    return data as ReviewAbsenceCaseRpc['Returns'];
  }
}

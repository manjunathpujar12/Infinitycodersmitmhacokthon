// ============================================================================
// HireSlot Core Architecture: Domain Types for Interview Bookings
// (Explicitly separated from Job Location Allocation domain)
// ============================================================================

export type InterviewStage = 'ROUND_1_TECHNICAL' | 'ROUND_2_SYSTEM_DESIGN' | 'HR_BEHAVIORAL' | 'FINAL_EXECUTIVE';

export type InterviewStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'RESCHEDULED' | 'NO_SHOW';

export interface InterviewSlot {
  id: string;
  interviewerId: string;
  interviewerName: string;
  candidateId?: string;
  candidateName?: string;
  jobId: string;
  stage: InterviewStage;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  status: InterviewStatus;
  meetingLink?: string;
  feedbackNotes?: string;
  // NOTE: Interview scores are purely evaluative metadata.
  // They must NEVER trigger automatic rejection in the allocation engine.
  score?: number; // 0-100
  createdAt: string;
  updatedAt: string;
}

export interface InterviewBookingRequest {
  candidateId: string;
  jobId: string;
  stage: InterviewStage;
  preferredDate: string;
  preferredTimeSlot?: string;
}


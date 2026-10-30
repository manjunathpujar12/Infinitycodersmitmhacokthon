// ============================================================================
// HireSlot Core Architecture: Domain Types for Allocation & Audit History
// ============================================================================

export type AllocationStatus =
  | 'PENDING'
  | 'ALLOCATED'
  | 'OFFERED_ALTERNATIVE'
  | 'ALTERNATIVE_ACCEPTED'
  | 'ALTERNATIVE_REJECTED'
  | 'WAITLISTED'
  | 'RELEASED'
  | 'CANCELLED';

export type AllocationDecisionType =
  | 'PREFERRED_LOCATION_MATCH'
  | 'SECONDARY_LOCATION_MATCH'
  | 'OVERFLOW_ALTERNATIVE_OFFER'
  | 'WAITLISTED_ALL_LOCATIONS_FULL'
  | 'WAITLISTED_NO_PREFERENCE_AVAILABLE'
  | 'INELIGIBLE_FOR_ROLE';

export interface AllocationDecision {
  type: AllocationDecisionType;
  assignedCity?: string;
  assignedCityId?: string;
  isAlternative: boolean;
  explanation: string;
  factors: {
    preferenceRankMatched?: number;
    matchScore: number;
    vacancyRemainingBeforeAllocation: number;
    distanceKmFromCandidate?: number;
    haversineApplied: boolean;
  };
}

export interface JobAllocation {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  allocatedCityId?: string;
  allocatedCityName?: string;
  status: AllocationStatus;
  matchScore: number;
  decisionExplanation: string;
  isAlternativeOffer: boolean;
  alternativeOfferedCityId?: string;
  alternativeOfferedCityName?: string;
  offerExpiresAt?: string;
  allocatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Shared candidate allocation model across Member 1, Member 2, and Member 3
 * Corresponds to the public.candidate_allocations table in Supabase.
 */
export type CandidateAllocation = JobAllocation;

export type CallerRole = 'CANDIDATE' | 'HR_ADMIN' | 'SYSTEM_ALLOCATOR';

export interface AlternativeCityOffer {
  allocationId: string;
  candidateId: string;
  jobId: string;
  offeredCityId: string;
  offeredCityName: string;
  originalPreferredCities: string[];
  distanceKm: number;
  reason: string;
  expiresAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
}

export interface AllocationAuditLog {
  id: string;
  allocationId: string;
  candidateId: string;
  jobId: string;
  action: string;
  fromStatus?: AllocationStatus;
  toStatus: AllocationStatus;
  actor: 'SYSTEM_ALLOCATOR' | 'HR_ADMIN' | 'CANDIDATE';
  actorId?: string;
  reason: string;
  metadata?: Record<string, any>;
  timestamp: string;
}


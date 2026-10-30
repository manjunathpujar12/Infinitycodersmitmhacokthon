// ============================================================================
// HireSlot Core Architecture: Domain Types for Waitlist Management
// ============================================================================

export type WaitlistPriority = 'HIGH' | 'NORMAL' | 'LOW';

export interface WaitlistEntry {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  preferredCityId: string;
  preferredCityName: string;
  availableFrom: string; // ISO date format e.g. "2026-11-15"
  matchScore: number;
  priorityScore: number; // Calculated based on match score + queue position + urgent joining date
  status: 'QUEUED' | 'PROMOTED' | 'EXPIRED' | 'WITHDRAWN';
  waitlistReason: string;
  enrolledAt: string;
  promotedAt?: string;
  updatedAt: string;
}

export interface WaitlistFilter {
  jobId?: string;
  cityId?: string;
  status?: WaitlistEntry['status'];
  availableBefore?: string;
}


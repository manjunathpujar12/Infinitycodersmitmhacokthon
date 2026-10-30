import { WaitlistEntry, WaitlistFilter } from '../types/waitlist';
import { CandidateProfile } from '../types/matching';

/**
 * Calculates priority score for waitlist ordering:
 * Formula: (matchScore * 0.60) + (joiningReadinessScore * 0.25) + (fifoBonus * 0.15)
 */
export function calculateWaitlistPriorityScore(
  matchScore: number,
  availableFromIso: string,
  enrolledAtIso: string = new Date().toISOString()
): number {
  // 1. Joining readiness
  const now = Date.now();
  const availableTime = new Date(availableFromIso).getTime();
  const daysDiff = Math.max(0, (availableTime - now) / (1000 * 60 * 60 * 24));
  let readinessScore = 50;
  if (daysDiff <= 7) readinessScore = 100;
  else if (daysDiff <= 30) readinessScore = 75;
  else if (daysDiff <= 60) readinessScore = 50;
  else readinessScore = 30;

  // 2. FIFO bonus (up to 15 points based on how long candidate has been queued)
  const enrolledTime = new Date(enrolledAtIso).getTime();
  const daysQueued = Math.max(0, (now - enrolledTime) / (1000 * 60 * 60 * 24));
  const fifoBonus = Math.min(100, daysQueued * 10);

  const priorityScore = Math.round(
    matchScore * 0.6 + readinessScore * 0.25 + fifoBonus * 0.15
  );

  return Math.min(100, Math.max(0, priorityScore));
}

/**
 * Enrolls a candidate into the future-date & preferred-location waitlist
 */
export function enrollCandidateInWaitlist(
  candidate: CandidateProfile,
  jobId: string,
  jobTitle: string,
  preferredCityId: string,
  preferredCityName: string,
  matchScore: number,
  reason: string = 'Preferred city is currently full. Waitlisted for future capacity.'
): WaitlistEntry {
  const now = new Date().toISOString();
  const priorityScore = calculateWaitlistPriorityScore(
    matchScore,
    candidate.availableFrom,
    now
  );

  return {
    id: `wl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    jobId,
    jobTitle,
    preferredCityId,
    preferredCityName,
    availableFrom: candidate.availableFrom,
    matchScore,
    priorityScore,
    status: 'QUEUED',
    waitlistReason: reason,
    enrolledAt: now,
    updatedAt: now,
  };
}

/**
 * Sorts and filters waitlist entries by priority score descending (highest priority first)
 */
export function rankWaitlistEntries(
  entries: WaitlistEntry[],
  filter?: WaitlistFilter
): WaitlistEntry[] {
  let filtered = [...entries];

  if (filter?.jobId) {
    filtered = filtered.filter((e) => e.jobId === filter.jobId);
  }
  if (filter?.cityId) {
    filtered = filtered.filter((e) => e.preferredCityId === filter.cityId);
  }
  if (filter?.status) {
    filtered = filtered.filter((e) => e.status === filter.status);
  }
  if (filter?.availableBefore) {
    const filterTime = new Date(filter.availableBefore).getTime();
    filtered = filtered.filter(
      (e) => new Date(e.availableFrom).getTime() <= filterTime
    );
  }

  return filtered.sort((a, b) => {
    // 1. Higher priority score first
    if (b.priorityScore !== a.priorityScore) {
      return b.priorityScore - a.priorityScore;
    }
    // 2. Tie-breaker: earlier enrolled first (FIFO)
    return new Date(a.enrolledAt).getTime() - new Date(b.enrolledAt).getTime();
  });
}

/**
 * Promotes top qualified candidate from the waitlist when vacancy becomes available
 */
export function promoteTopCandidateFromWaitlist(
  entries: WaitlistEntry[],
  jobId: string,
  cityId: string
): { promotedEntry: WaitlistEntry | null; remainingWaitlist: WaitlistEntry[] } {
  const eligibleCandidates = rankWaitlistEntries(entries, {
    jobId,
    cityId,
    status: 'QUEUED',
  });

  if (eligibleCandidates.length === 0) {
    return { promotedEntry: null, remainingWaitlist: entries };
  }

  const top = eligibleCandidates[0];
  const now = new Date().toISOString();

  const promotedEntry: WaitlistEntry = {
    ...top,
    status: 'PROMOTED',
    promotedAt: now,
    updatedAt: now,
  };

  const remainingWaitlist = entries.map((e) =>
    e.id === top.id ? promotedEntry : e
  );

  return { promotedEntry, remainingWaitlist };
}


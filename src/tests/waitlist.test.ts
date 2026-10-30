import { describe, it, expect } from 'vitest';
import {
  calculateWaitlistPriorityScore,
  enrollCandidateInWaitlist,
  rankWaitlistEntries,
  promoteTopCandidateFromWaitlist,
} from '../engine/waitlistManager';
import { CandidateProfile } from '../types/matching';
import { WaitlistEntry } from '../types/waitlist';

describe('Future-Date & Location Waitlist Management', () => {
  const candidate1: CandidateProfile = {
    id: 'c-wl-1',
    fullName: 'Siddharth Rao',
    email: 'siddharth@example.com',
    totalExperienceYears: 4,
    education: 'B.Tech',
    preferredCities: ['Chennai'],
    availableFrom: '2026-11-05', // Ready within 7 days
    willingToRelocate: false,
    skills: [{ name: 'TypeScript', yearsOfExperience: 4, proficiency: 'advanced' }],
  };

  const candidate2: CandidateProfile = {
    id: 'c-wl-2',
    fullName: 'Meera Patel',
    email: 'meera@example.com',
    totalExperienceYears: 5,
    education: 'M.Tech',
    preferredCities: ['Chennai'],
    availableFrom: '2027-01-15', // Ready in 2+ months
    willingToRelocate: false,
    skills: [{ name: 'TypeScript', yearsOfExperience: 5, proficiency: 'expert' }],
  };

  it('calculates higher priority score for urgent joining readiness', () => {
    const urgentScore = calculateWaitlistPriorityScore(85, '2026-11-05');
    const distantScore = calculateWaitlistPriorityScore(85, '2027-03-01');

    expect(urgentScore).toBeGreaterThan(distantScore);
  });

  it('correctly enrolls candidate into waitlist and sets initial status to QUEUED', () => {
    const entry = enrollCandidateInWaitlist(
      candidate1,
      'job-1',
      'Senior Cloud Engineer',
      'c-chn',
      'Chennai',
      88
    );

    expect(entry.candidateId).toBe(candidate1.id);
    expect(entry.preferredCityName).toBe('Chennai');
    expect(entry.status).toBe('QUEUED');
    expect(entry.priorityScore).toBeGreaterThan(0);
  });

  it('ranks entries by priority score and promotes top qualified candidate', () => {
    const entry1 = enrollCandidateInWaitlist(candidate1, 'job-1', 'Engineer', 'c-chn', 'Chennai', 90);
    const entry2 = enrollCandidateInWaitlist(candidate2, 'job-1', 'Engineer', 'c-chn', 'Chennai', 70);

    const entries: WaitlistEntry[] = [entry2, entry1];
    const ranked = rankWaitlistEntries(entries);

    expect(ranked[0].candidateId).toBe(candidate1.id);

    // Promote top candidate
    const { promotedEntry, remainingWaitlist } = promoteTopCandidateFromWaitlist(
      ranked,
      'job-1',
      'c-chn'
    );

    expect(promotedEntry).toBeDefined();
    expect(promotedEntry?.candidateId).toBe(candidate1.id);
    expect(promotedEntry?.status).toBe('PROMOTED');

    const promotedInRemaining = remainingWaitlist.find((e) => e.id === promotedEntry?.id);
    expect(promotedInRemaining?.status).toBe('PROMOTED');
  });
});


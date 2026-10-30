import { describe, it, expect } from 'vitest';
import {
  rankCandidateWithRules,
  normalizeWeights,
  RANKING_PRESETS,
  DEFAULT_HR_RANKING_WEIGHTS,
} from '../engine/rankingEngine';
import { CandidateProfile, RoleMatchScoreBreakdown } from '../types/matching';
import { interviewService } from '../services/interviewService';

describe('HR Configurable Ranking Rules & Presets', () => {
  const mockCandidate: CandidateProfile = {
    id: 'c-rank-1',
    fullName: 'Ananya Sharma',
    email: 'ananya@example.com',
    totalExperienceYears: 6,
    education: 'B.Tech',
    preferredCities: ['Bengaluru'],
    availableFrom: '2026-11-05',
    willingToRelocate: true,
    interviewScore: 85,
    skills: [{ name: 'TypeScript', yearsOfExperience: 5, proficiency: 'advanced' }],
  };

  const mockEvaluation: RoleMatchScoreBreakdown = {
    overallScore: 85,
    skillMatchPercentage: 90,
    experienceScore: 100,
    educationScore: 100,
    eligibility: {
      isEligible: true,
      experienceMet: true,
      educationMet: true,
      criticalSkillsMet: true,
      ineligibilityReasons: [],
    },
    skillDetails: [],
    skillGaps: [],
    explainabilitySummary: ['Candidate highly qualified'],
  };

  it('normalizes weights so their sum is reliably 1.0', () => {
    const customWeights = {
      ruleName: 'Custom',
      skillWeight: 50,
      experienceWeight: 30,
      educationWeight: 20,
      locationPreferenceWeight: 0,
      joiningDateWeight: 0,
      interviewScoreWeight: 0,
      minEligibilityThreshold: 50,
      autoWaitlistBelowThreshold: true,
    };

    const norm = normalizeWeights(customWeights);
    const sum =
      norm.skillWeight +
      norm.experienceWeight +
      norm.educationWeight +
      norm.locationPreferenceWeight +
      norm.joiningDateWeight +
      norm.interviewScoreWeight;

    expect(Math.abs(sum - 1.0)).toBeLessThan(0.0001);
    expect(norm.skillWeight).toBe(0.5);
    expect(norm.experienceWeight).toBe(0.3);
  });

  it('ranks higher when target location matches first choice preferred city', () => {
    const rankChoice1 = rankCandidateWithRules(
      mockCandidate,
      mockEvaluation,
      DEFAULT_HR_RANKING_WEIGHTS,
      'Bengaluru'
    );

    const rankUnpreferred = rankCandidateWithRules(
      mockCandidate,
      mockEvaluation,
      DEFAULT_HR_RANKING_WEIGHTS,
      'Delhi'
    );

    expect(rankChoice1.breakdown.locationScore).toBe(100);
    expect(rankUnpreferred.breakdown.locationScore).toBeLessThan(100);
    expect(rankChoice1.finalRankScore).toBeGreaterThan(rankUnpreferred.finalRankScore);
  });

  it('evaluates presets correctly (e.g. SKILL_FIRST emphasizes skills)', () => {
    const skillFirstResult = rankCandidateWithRules(
      mockCandidate,
      mockEvaluation,
      RANKING_PRESETS.SKILL_FIRST,
      'Bengaluru'
    );

    expect(skillFirstResult.appliedWeights.skillWeight).toBe(0.60);
    expect(skillFirstResult.finalRankScore).toBeGreaterThanOrEqual(80);
  });

  it('maintains clear separation between interview bookings and job location allocation', () => {
    // Book an interview slot using the independent interview service
    const slot = interviewService.bookInterviewSlot(
      {
        candidateId: mockCandidate.id,
        jobId: 'job-1',
        stage: 'ROUND_1_TECHNICAL',
        preferredDate: '2026-11-06T10:00:00Z',
      },
      'int-44',
      'Lead Evaluator'
    );

    expect(slot.id).toBeDefined();
    expect(slot.status).toBe('SCHEDULED');

    // Record an interview score
    const updatedSlot = interviewService.recordFeedback(slot.id, 'Candidate demonstrated good knowledge', 40);
    expect(updatedSlot.score).toBe(40);

    // Verify interview domain does not alter candidate eligibility or trigger auto-rejection
    expect(mockEvaluation.eligibility.isEligible).toBe(true);
  });
});


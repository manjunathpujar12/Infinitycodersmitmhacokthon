import { HrRankingWeights, CandidateProfile, RoleMatchScoreBreakdown } from '../types/matching';

export const DEFAULT_HR_RANKING_WEIGHTS: HrRankingWeights = {
  ruleName: 'Balanced Standard',
  skillWeight: 0.40,
  experienceWeight: 0.25,
  educationWeight: 0.15,
  locationPreferenceWeight: 0.15,
  joiningDateWeight: 0.05,
  interviewScoreWeight: 0.00, // Safe default: 0% weight to avoid auto-rejecting
  minEligibilityThreshold: 50.0,
  autoWaitlistBelowThreshold: true,
};

export const RANKING_PRESETS: Record<string, HrRankingWeights> = {
  BALANCED: {
    ruleName: 'Balanced Standard',
    skillWeight: 0.40,
    experienceWeight: 0.25,
    educationWeight: 0.15,
    locationPreferenceWeight: 0.15,
    joiningDateWeight: 0.05,
    interviewScoreWeight: 0.00,
    minEligibilityThreshold: 50,
    autoWaitlistBelowThreshold: true,
  },
  SKILL_FIRST: {
    ruleName: 'Skill-First Priority',
    skillWeight: 0.60,
    experienceWeight: 0.20,
    educationWeight: 0.10,
    locationPreferenceWeight: 0.05,
    joiningDateWeight: 0.05,
    interviewScoreWeight: 0.00,
    minEligibilityThreshold: 55,
    autoWaitlistBelowThreshold: true,
  },
  EXPERIENCE_HEAVY: {
    ruleName: 'Experience-Heavy Priority',
    skillWeight: 0.30,
    experienceWeight: 0.45,
    educationWeight: 0.10,
    locationPreferenceWeight: 0.10,
    joiningDateWeight: 0.05,
    interviewScoreWeight: 0.00,
    minEligibilityThreshold: 50,
    autoWaitlistBelowThreshold: true,
  },
  URGENT_JOINING: {
    ruleName: 'Immediate Joining Urgency',
    skillWeight: 0.35,
    experienceWeight: 0.20,
    educationWeight: 0.10,
    locationPreferenceWeight: 0.10,
    joiningDateWeight: 0.25,
    interviewScoreWeight: 0.00,
    minEligibilityThreshold: 45,
    autoWaitlistBelowThreshold: false,
  },
};

/**
 * Normalizes HR weights so that they reliably sum up to 1.0
 */
export function normalizeWeights(weights: HrRankingWeights): HrRankingWeights {
  const sum =
    weights.skillWeight +
    weights.experienceWeight +
    weights.educationWeight +
    weights.locationPreferenceWeight +
    weights.joiningDateWeight +
    weights.interviewScoreWeight;

  if (sum === 0) return { ...DEFAULT_HR_RANKING_WEIGHTS };

  return {
    ...weights,
    skillWeight: weights.skillWeight / sum,
    experienceWeight: weights.experienceWeight / sum,
    educationWeight: weights.educationWeight / sum,
    locationPreferenceWeight: weights.locationPreferenceWeight / sum,
    joiningDateWeight: weights.joiningDateWeight / sum,
    interviewScoreWeight: weights.interviewScoreWeight / sum,
  };
}

/**
 * Calculates joining date urgency score (100 if candidate can join immediately or within 7 days,
 * decreasing proportionally for later dates up to 60 days).
 */
export function calculateJoiningDateScore(availableFromIso: string): number {
  try {
    const target = new Date(availableFromIso).getTime();
    const now = Date.now();
    const daysUntilAvailable = Math.max(0, Math.round((target - now) / (1000 * 60 * 60 * 24)));

    if (daysUntilAvailable <= 7) return 100;
    if (daysUntilAvailable <= 15) return 85;
    if (daysUntilAvailable <= 30) return 65;
    if (daysUntilAvailable <= 60) return 40;
    return 20;
  } catch {
    return 50;
  }
}

export interface CandidateRankResult {
  candidateId: string;
  candidateName: string;
  finalRankScore: number; // 0 - 100
  breakdown: {
    skillScore: number;
    experienceScore: number;
    educationScore: number;
    locationScore: number;
    joiningScore: number;
    interviewScore: number;
  };
  evaluation: RoleMatchScoreBreakdown;
  appliedWeights: HrRankingWeights;
}

/**
 * Computes the HR-weighted ranking score for a candidate.
 * Explicitly guards against auto-rejecting candidates purely due to interview or AI score.
 */
export function rankCandidateWithRules(
  candidate: CandidateProfile,
  evaluation: RoleMatchScoreBreakdown,
  weights: HrRankingWeights = DEFAULT_HR_RANKING_WEIGHTS,
  targetCityName?: string
): CandidateRankResult {
  const normWeights = normalizeWeights(weights);

  // 1. Location preference alignment score
  let locationScore = 40; // Default baseline if no preference specified
  if (targetCityName && candidate.preferredCities && candidate.preferredCities.length > 0) {
    const idx = candidate.preferredCities.findIndex(
      (c) => c.toLowerCase().trim() === targetCityName.toLowerCase().trim()
    );
    if (idx === 0) locationScore = 100; // 1st choice
    else if (idx === 1) locationScore = 80; // 2nd choice
    else if (idx === 2) locationScore = 65; // 3rd choice
    else if (candidate.willingToRelocate) locationScore = 50;
    else locationScore = 20;
  } else if (candidate.willingToRelocate) {
    locationScore = 70;
  }

  // 2. Joining date score
  const joiningScore = calculateJoiningDateScore(candidate.availableFrom);

  // 3. Optional interview/AI score (informational booster only, clamped 0-100)
  const interviewScore = candidate.interviewScore ?? 70;

  // 4. Weighted formula calculation
  const finalRankScore = Math.round(
    evaluation.skillMatchPercentage * normWeights.skillWeight +
      evaluation.experienceScore * normWeights.experienceWeight +
      evaluation.educationScore * normWeights.educationWeight +
      locationScore * normWeights.locationPreferenceWeight +
      joiningScore * normWeights.joiningDateWeight +
      interviewScore * normWeights.interviewScoreWeight
  );

  return {
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    finalRankScore,
    breakdown: {
      skillScore: evaluation.skillMatchPercentage,
      experienceScore: evaluation.experienceScore,
      educationScore: evaluation.educationScore,
      locationScore,
      joiningScore,
      interviewScore,
    },
    evaluation,
    appliedWeights: normWeights,
  };
}


// ============================================================================
// HireSlot Core Architecture: Domain Types for Role Matching & Scoring
// ============================================================================

export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface SkillRequirement {
  name: string;
  minYears?: number;
  minProficiency?: ProficiencyLevel;
  isRequired: boolean; // true = mandatory required skill, false = nice-to-have / bonus
  category?: 'core' | 'framework' | 'database' | 'cloud' | 'soft_skill';
}

export interface CandidateSkill {
  name: string;
  yearsOfExperience: number;
  proficiency: ProficiencyLevel;
  verified?: boolean;
}

export interface JobRole {
  id: string;
  title: string;
  department: string;
  minExperienceYears: number;
  maxExperienceYears?: number;
  requiredEducation?: string[]; // e.g. ["B.Tech", "B.E.", "BCA", "M.Tech"]
  requiredSkills: SkillRequirement[];
  description?: string;
  isOpen: boolean;
  createdAt: string;
}

export interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  totalExperienceYears: number;
  education: string;
  skills: CandidateSkill[];
  preferredCities: string[]; // Ordered by preference: [1st choice, 2nd choice, ...]
  currentCoordinates?: {
    latitude: number;
    longitude: number;
  };
  currentCity?: string;
  availableFrom: string; // ISO date format e.g. "2026-11-15"
  willingToRelocate: boolean;
  interviewScore?: number; // Optional 0-100 score from teammate's module (strictly informational)
  resumeUrl?: string;
}

export interface SkillMatchDetail {
  skillName: string;
  matched: boolean;
  isRequired: boolean;
  candidateYears: number;
  requiredYears?: number;
  candidateProficiency?: ProficiencyLevel;
  requiredProficiency?: ProficiencyLevel;
  scoreContribution: number; // 0 to 1
  comment: string;
}

export interface SkillGapHint {
  skillName: string;
  severity: 'CRITICAL_REQUIRED' | 'RECOMMENDED_BONUS';
  requiredYears?: number;
  candidateYears?: number;
  gapExplanation: string;
  recommendedAction: string;
}

export interface EligibilityResult {
  isEligible: boolean;
  experienceMet: boolean;
  educationMet: boolean;
  criticalSkillsMet: boolean;
  ineligibilityReasons: string[];
}

export interface RoleMatchScoreBreakdown {
  overallScore: number; // 0 - 100
  skillMatchPercentage: number; // 0 - 100
  experienceScore: number; // 0 - 100
  educationScore: number; // 0 - 100
  eligibility: EligibilityResult;
  skillDetails: SkillMatchDetail[];
  skillGaps: SkillGapHint[];
  explainabilitySummary: string[];
}

/**
 * HR Configurable Ranking Weights
 * Total weights typically sum to 1.0 (or normalized automatically)
 */
export interface HrRankingWeights {
  id?: string;
  ruleName: string;
  jobId?: string; // specific job or global default
  skillWeight: number; // e.g., 0.40
  experienceWeight: number; // e.g., 0.25
  educationWeight: number; // e.g., 0.15
  locationPreferenceWeight: number; // e.g., 0.15
  joiningDateWeight: number; // e.g., 0.05
  interviewScoreWeight: number; // e.g., 0.00 to 0.10 (Informational rank booster, NEVER hard rejection)
  minEligibilityThreshold: number; // min overall score to recommend direct allocation (e.g. 50)
  autoWaitlistBelowThreshold: boolean;
}


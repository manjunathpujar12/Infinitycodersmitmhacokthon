import { CandidateProfile, JobRole, SkillRequirement } from '../types';

export interface SkillMatchResult {
  skillName: string;
  isMandatory: boolean;
  requiredProficiency: number;
  candidateProficiency: number;
  isSatisfied: boolean;
  weight: number;
  gapPoints: number;
}

export interface RoleMatchAnalysis {
  roleId: string;
  roleTitle: string;
  department: string;
  matchScorePercentage: number; // 0 - 100
  meetsCutoff: boolean;
  experienceMatch: {
    candidateYears: number;
    requiredYears: number;
    meetsRequirement: boolean;
  };
  skillsAnalysis: SkillMatchResult[];
  matchedSkillsCount: number;
  totalSkillsCount: number;
  missingSkillsCount: number;
  recommendations: string[];
}

export const analyzeCandidateRoleMatch = (
  candidate: CandidateProfile,
  role: JobRole
): RoleMatchAnalysis => {
  const candidateSkillsMap = new Map<string, number>();
  candidate.skills.forEach((s) => {
    candidateSkillsMap.set(s.skillName.toLowerCase(), s.rating);
  });

  const skillsAnalysis: SkillMatchResult[] = [];
  let totalWeightedScore = 0;
  let maxPossibleWeight = 0;
  let matchedSkillsCount = 0;
  let missingSkillsCount = 0;
  const recommendations: string[] = [];

  role.requiredSkills.forEach((req) => {
    const candidateRating = candidateSkillsMap.get(req.name.toLowerCase()) || 0;
    const isSatisfied = candidateRating >= req.minProficiency;
    const gapPoints = Math.max(0, req.minProficiency - candidateRating);

    if (isSatisfied) {
      matchedSkillsCount++;
      totalWeightedScore += req.weight;
    } else {
      missingSkillsCount++;
      // Partial credit
      const partialRatio = candidateRating / req.minProficiency;
      totalWeightedScore += Math.round(req.weight * partialRatio * 0.6);

      if (req.isMandatory) {
        recommendations.push(
          `Upskill in mandatory competency: ${req.name} (Current level: ${candidateRating || 'Not listed'}/5, Target: ${req.minProficiency}/5).`
        );
      } else {
        recommendations.push(
          `Recommended boost: ${req.name} (Target: ${req.minProficiency}/5) to strengthen candidacy.`
        );
      }
    }

    maxPossibleWeight += req.weight;

    skillsAnalysis.push({
      skillName: req.name,
      isMandatory: req.isMandatory,
      requiredProficiency: req.minProficiency,
      candidateProficiency: candidateRating,
      isSatisfied,
      weight: req.weight,
      gapPoints
    });
  });

  // Factor in experience alignment
  const meetsExperience = candidate.experienceYears >= role.minExperienceYears;
  let expBonus = meetsExperience ? 10 : Math.round((candidate.experienceYears / role.minExperienceYears) * 8);

  // Overall match score
  const rawScore = maxPossibleWeight > 0 ? (totalWeightedScore / maxPossibleWeight) * 90 + expBonus : 85;
  const matchScorePercentage = Math.min(100, Math.max(20, Math.round(rawScore)));

  const meetsCutoff = matchScorePercentage >= role.cutoffScore;

  if (recommendations.length === 0) {
    recommendations.push('Excellent profile match! All mandatory and preferred technical competencies are satisfied.');
  }

  return {
    roleId: role.id,
    roleTitle: role.title,
    department: role.department,
    matchScorePercentage,
    meetsCutoff,
    experienceMatch: {
      candidateYears: candidate.experienceYears,
      requiredYears: role.minExperienceYears,
      meetsRequirement: meetsExperience
    },
    skillsAnalysis,
    matchedSkillsCount,
    totalSkillsCount: role.requiredSkills.length,
    missingSkillsCount,
    recommendations
  };
};


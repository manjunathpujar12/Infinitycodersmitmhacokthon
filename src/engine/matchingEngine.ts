import {
  JobRole,
  CandidateProfile,
  RoleMatchScoreBreakdown,
  SkillMatchDetail,
  SkillGapHint,
  EligibilityResult,
  ProficiencyLevel,
  SkillRequirement,
} from '../types/matching';

const PROFICIENCY_LEVEL_SCORES: Record<ProficiencyLevel, number> = {
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

/**
 * Normalizes skill strings for robust case-insensitive and symbol-agnostic matching
 * (e.g., "React.js" -> "react", "PostgreSQL" -> "postgresql")
 */
export function normalizeSkillName(skill: string): string {
  return skill
    .toLowerCase()
    .replace(/\.js$/i, '')
    .replace(/[#]/g, 'sharp')
    .replace(/[+]/g, 'plus')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Evaluates Candidate against Job Role using explainable skill, experience, and eligibility rules.
 * Generates transparent score breakdown, skill gaps, and decision explanations.
 */
export function evaluateCandidateRoleMatch(
  candidate: CandidateProfile,
  job: JobRole
): RoleMatchScoreBreakdown {
  const skillDetails: SkillMatchDetail[] = [];
  const skillGaps: SkillGapHint[] = [];
  const explainabilitySummary: string[] = [];

  // Normalize candidate skills map
  const candidateSkillMap = new Map<
    string,
    { years: number; proficiency: ProficiencyLevel; originalName: string }
  >();

  for (const skill of candidate.skills) {
    candidateSkillMap.set(normalizeSkillName(skill.name), {
      years: skill.yearsOfExperience,
      proficiency: skill.proficiency,
      originalName: skill.name,
    });
  }

  // 1. SKILL MATCH EVALUATION
  let totalSkillWeight = 0;
  let earnedSkillScore = 0;
  let criticalSkillsCount = 0;
  let criticalSkillsMetCount = 0;

  for (const req of job.requiredSkills) {
    const normReqName = normalizeSkillName(req.name);
    const candidateSkill = candidateSkillMap.get(normReqName);
    const weight = req.isRequired ? 2.0 : 1.0;
    totalSkillWeight += weight;

    if (req.isRequired) {
      criticalSkillsCount++;
    }

    if (!candidateSkill) {
      // Skill missing entirely
      skillDetails.push({
        skillName: req.name,
        matched: false,
        isRequired: req.isRequired,
        candidateYears: 0,
        requiredYears: req.minYears,
        scoreContribution: 0,
        comment: `Missing ${req.isRequired ? 'mandatory' : 'optional'} skill`,
      });

      if (req.isRequired) {
        skillGaps.push({
          skillName: req.name,
          severity: 'CRITICAL_REQUIRED',
          requiredYears: req.minYears,
          candidateYears: 0,
          gapExplanation: `Candidate lacks required mandatory skill "${req.name}" (minimum ${req.minYears || 1} years required).`,
          recommendedAction: `Complete certified upskilling or project milestone in ${req.name} before role allocation.`,
        });
      } else {
        skillGaps.push({
          skillName: req.name,
          severity: 'RECOMMENDED_BONUS',
          requiredYears: req.minYears,
          candidateYears: 0,
          gapExplanation: `Candidate does not have nice-to-have skill "${req.name}".`,
          recommendedAction: `Self-paced learning in ${req.name} will improve candidate competitiveness.`,
        });
      }
    } else {
      // Skill matched, evaluate depth and proficiency
      let factor = 1.0;
      let gapFound = false;

      // Experience years check for this skill
      if (req.minYears && req.minYears > 0) {
        if (candidateSkill.years < req.minYears) {
          factor = Math.max(0.3, candidateSkill.years / req.minYears);
          gapFound = true;
          skillGaps.push({
            skillName: req.name,
            severity: req.isRequired ? 'CRITICAL_REQUIRED' : 'RECOMMENDED_BONUS',
            requiredYears: req.minYears,
            candidateYears: candidateSkill.years,
            gapExplanation: `Skill "${req.name}" has ${candidateSkill.years} yr(s) exp, but ${req.minYears} yr(s) is expected.`,
            recommendedAction: `Pair programming or mentor-supervised tasks recommended to bridge the experience delta in ${req.name}.`,
          });
        }
      }

      // Proficiency level check
      if (req.minProficiency) {
        const reqLvl = PROFICIENCY_LEVEL_SCORES[req.minProficiency];
        const candLvl = PROFICIENCY_LEVEL_SCORES[candidateSkill.proficiency];
        if (candLvl < reqLvl) {
          factor *= 0.8;
        }
      }

      const contribution = weight * factor;
      earnedSkillScore += contribution;

      if (req.isRequired && factor >= 0.7) {
        criticalSkillsMetCount++;
      }

      skillDetails.push({
        skillName: req.name,
        matched: true,
        isRequired: req.isRequired,
        candidateYears: candidateSkill.years,
        requiredYears: req.minYears,
        candidateProficiency: candidateSkill.proficiency,
        requiredProficiency: req.minProficiency,
        scoreContribution: Math.round((factor) * 100) / 100,
        comment: gapFound
          ? `Matched partially (${candidateSkill.years}/${req.minYears || 1} yrs)`
          : `Fully matched (${candidateSkill.proficiency}, ${candidateSkill.years} yrs)`,
      });
    }
  }

  const skillMatchPercentage =
    totalSkillWeight > 0
      ? Math.round((earnedSkillScore / totalSkillWeight) * 100)
      : 100;

  // 2. EXPERIENCE EVALUATION
  let experienceScore = 0;
  let experienceMet = false;

  if (candidate.totalExperienceYears >= job.minExperienceYears) {
    experienceMet = true;
    experienceScore = 100;
    explainabilitySummary.push(
      `Candidate has ${candidate.totalExperienceYears} years of total experience, meeting the required minimum of ${job.minExperienceYears} years.`
    );
  } else {
    const diff = job.minExperienceYears - candidate.totalExperienceYears;
    experienceScore = Math.max(
      0,
      Math.round((candidate.totalExperienceYears / job.minExperienceYears) * 100)
    );
    explainabilitySummary.push(
      `Experience shortfall: ${diff.toFixed(1)} years below the requirement of ${job.minExperienceYears} years.`
    );
  }

  // 3. EDUCATION EVALUATION
  let educationMet = true;
  let educationScore = 100;

  if (job.requiredEducation && job.requiredEducation.length > 0) {
    const candEduNorm = candidate.education.toLowerCase();
    educationMet = job.requiredEducation.some((edu) =>
      candEduNorm.includes(edu.toLowerCase())
    );
    educationScore = educationMet ? 100 : 50;
    if (!educationMet) {
      explainabilitySummary.push(
        `Education background "${candidate.education}" does not directly match requested degrees: [${job.requiredEducation.join(
          ', '
        )}].`
      );
    } else {
      explainabilitySummary.push(
        `Candidate's education "${candidate.education}" satisfies role requirements.`
      );
    }
  }

  // 4. ELIGIBILITY DETERMINATION
  const criticalSkillsMet =
    criticalSkillsCount === 0 || criticalSkillsMetCount >= criticalSkillsCount * 0.7;

  const ineligibilityReasons: string[] = [];
  if (!experienceMet && candidate.totalExperienceYears < job.minExperienceYears * 0.7) {
    ineligibilityReasons.push(
      `Total experience (${candidate.totalExperienceYears} yrs) is significantly below role baseline (${job.minExperienceYears} yrs).`
    );
  }
  if (!criticalSkillsMet) {
    ineligibilityReasons.push(
      `Candidate is missing one or more essential mandatory skills (${criticalSkillsMetCount}/${criticalSkillsCount} met).`
    );
  }

  const isEligible = ineligibilityReasons.length === 0;

  // Explainability summary
  explainabilitySummary.unshift(
    `Skill match evaluation: ${skillMatchPercentage}% matched based on ${job.requiredSkills.length} evaluated criteria.`
  );
  if (isEligible) {
    explainabilitySummary.push(
      `Candidate is qualified and eligible for location allocation.`
    );
  } else {
    explainabilitySummary.push(
      `Candidate requires review due to: ${ineligibilityReasons.join('; ')}`
    );
  }

  // Base composite score before HR weighting:
  // 60% skills, 25% experience, 15% education
  const overallScore = Math.round(
    skillMatchPercentage * 0.6 + experienceScore * 0.25 + educationScore * 0.15
  );

  return {
    overallScore,
    skillMatchPercentage,
    experienceScore,
    educationScore,
    eligibility: {
      isEligible,
      experienceMet,
      educationMet,
      criticalSkillsMet,
      ineligibilityReasons,
    },
    skillDetails,
    skillGaps,
    explainabilitySummary,
  };
}


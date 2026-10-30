import type { Candidate, JobRole, CityVacancy, RankingRulesConfig, RecommendationBreakdown } from '../types/index.ts';

export function calculateCandidateMatch(
  candidate: Candidate,
  role: JobRole,
  vacancy: CityVacancy,
  rules: RankingRulesConfig
): RecommendationBreakdown {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // 1. Skill Match Calculation
  const candidateSkills = (candidate.skills || []).map(s => s.toLowerCase().trim());
  const requiredSkills = role.requiredSkills || [];
  
  let matchedSkillsCount = 0;
  const missingMandatory: string[] = [];

  requiredSkills.forEach(req => {
    const isMatched = candidateSkills.some(cs => cs.includes(req.name.toLowerCase()) || req.name.toLowerCase().includes(cs));
    if (isMatched) {
      matchedSkillsCount++;
    } else if (req.isMandatory) {
      missingMandatory.push(req.name);
    }
  });

  const skillMatchRatio = requiredSkills.length > 0 ? (matchedSkillsCount / requiredSkills.length) : 0.8;
  const skillScore = Math.round(skillMatchRatio * rules.skillMatchWeight);
  
  if (skillMatchRatio >= 0.8) {
    reasons.push(`${Math.round(skillMatchRatio * 100)}% Skill match across required competencies (+${skillScore} pts)`);
  } else if (skillMatchRatio >= 0.5) {
    reasons.push(`Partial skill match (${Math.round(skillMatchRatio * 100)}%) with core requirements (+${skillScore} pts)`);
  } else {
    warnings.push(`Low skill coverage (${Math.round(skillMatchRatio * 100)}%) against job role`);
  }

  if (missingMandatory.length > 0) {
    warnings.push(`Missing mandatory competency: ${missingMandatory.join(', ')}`);
  }

  // 2. Experience Match Calculation
  const minExp = role.minYearsExperience || 2;
  const candidateExp = candidate.yearsExperience || 0;
  let expRatio = Math.min(1.2, candidateExp / minExp);
  const expScore = Math.round(Math.min(rules.experienceWeight, (candidateExp >= minExp ? rules.experienceWeight : (candidateExp / minExp) * rules.experienceWeight)));

  if (candidateExp >= minExp + 2) {
    reasons.push(`${candidateExp} yrs experience substantially exceeds role benchmark of ${minExp} yrs (+${expScore} pts)`);
  } else if (candidateExp >= minExp) {
    reasons.push(`${candidateExp} yrs experience meets role requirements (+${expScore} pts)`);
  } else {
    warnings.push(`${candidateExp} yrs experience is below standard ${minExp} yrs threshold`);
  }

  // 3. Location Preference Match Calculation
  const targetCity = vacancy.city.toLowerCase().trim();
  const prefCities = (candidate.preferredCities || []).map(c => c.toLowerCase().trim());
  let locationRatio = 0.15; // default fallback
  let prefChoice = -1;

  prefCities.forEach((city, index) => {
    if (city === targetCity || city.includes(targetCity) || targetCity.includes(city)) {
      if (prefChoice === -1) prefChoice = index + 1;
    }
  });

  if (prefChoice === 1) {
    locationRatio = 1.0;
    reasons.push(`Top 1st preferred city: ${vacancy.city} (+${rules.locationMatchWeight} pts)`);
  } else if (prefChoice === 2) {
    locationRatio = 0.75;
    reasons.push(`Secondary preferred city (#2): ${vacancy.city} (+${Math.round(rules.locationMatchWeight * 0.75)} pts)`);
  } else if (candidate.currentCity.toLowerCase().trim() === targetCity) {
    locationRatio = 0.9;
    reasons.push(`Locally based in ${vacancy.city} (no relocation friction, +${Math.round(rules.locationMatchWeight * 0.9)} pts)`);
  } else if (candidate.relocationReadiness === 'HIGH') {
    locationRatio = 0.5;
    reasons.push(`Willing to relocate to ${vacancy.city} (+${Math.round(rules.locationMatchWeight * 0.5)} pts)`);
  } else {
    warnings.push(`${vacancy.city} is not in candidate's preferred location list`);
  }

  const cityMatchScore = Math.round(locationRatio * rules.locationMatchWeight);

  // 4. Relocation Readiness
  let reloRatio = 0;
  switch (candidate.relocationReadiness) {
    case 'HIGH':
      reloRatio = 1.0;
      reasons.push(`Immediate relocation readiness: High (+${rules.relocationWillingnessWeight} pts)`);
      break;
    case 'MEDIUM':
      reloRatio = 0.65;
      reasons.push(`Relocation readiness: Medium with standard support (+${Math.round(rules.relocationWillingnessWeight * 0.65)} pts)`);
      break;
    case 'LOW':
      reloRatio = 0.3;
      warnings.push(`Low relocation flexibility without high relocation allowance`);
      break;
    case 'NOT_WILLING':
      reloRatio = 0;
      if (candidate.currentCity.toLowerCase().trim() !== targetCity) {
        warnings.push(`Candidate marked 'NOT_WILLING' to relocate outside ${candidate.currentCity}`);
      }
      break;
  }
  const relocationScore = Math.round(reloRatio * rules.relocationWillingnessWeight);

  // 5. Assessment Score Normalized
  const assessmentRatio = (candidate.assessmentScore || 0) / 100;
  const assessmentScore = Math.round(assessmentRatio * rules.assessmentScoreWeight);
  if (candidate.assessmentScore >= (vacancy.minBarScore || 70)) {
    reasons.push(`Technical assessment score ${candidate.assessmentScore}% meets/exceeds bar (+${assessmentScore} pts)`);
  } else {
    warnings.push(`Technical score ${candidate.assessmentScore}% is below recommended bar ${vacancy.minBarScore}%`);
  }

  const totalScore = Math.min(100, skillScore + expScore + cityMatchScore + relocationScore + assessmentScore);

  return {
    totalScore,
    cityMatchScore,
    skillMatchScore: skillScore,
    experienceScore: expScore,
    relocationScore,
    reasons,
    warnings,
  };
}

import { describe, it, expect } from 'vitest';
import { evaluateCandidateRoleMatch, normalizeSkillName } from '../engine/matchingEngine';
import { JobRole, CandidateProfile } from '../types/matching';

describe('Matching Engine & Skill-Gap Analysis', () => {
  const mockJob: JobRole = {
    id: 'job-1',
    title: 'Senior Full Stack Engineer',
    department: 'Engineering',
    minExperienceYears: 4,
    requiredEducation: ['B.Tech', 'B.E.'],
    requiredSkills: [
      { name: 'TypeScript', minYears: 3, isRequired: true, minProficiency: 'advanced' },
      { name: 'React', minYears: 3, isRequired: true, minProficiency: 'advanced' },
      { name: 'Node.js', minYears: 2, isRequired: true, minProficiency: 'intermediate' },
      { name: 'AWS', minYears: 1, isRequired: false, minProficiency: 'intermediate' },
    ],
    isOpen: true,
    createdAt: new Date().toISOString(),
  };

  it('normalizes skill strings correctly across varying formatting', () => {
    expect(normalizeSkillName('React.js')).toBe('react');
    expect(normalizeSkillName('Node.js')).toBe('node');
    expect(normalizeSkillName('C#')).toBe('csharp');
    expect(normalizeSkillName('C++')).toBe('cplusplus');
    expect(normalizeSkillName(' TypeScript ')).toBe('typescript');
  });

  it('evaluates fully qualified candidate with high match score and zero critical gaps', () => {
    const candidate: CandidateProfile = {
      id: 'c1',
      fullName: 'Alice Developer',
      email: 'alice@example.com',
      totalExperienceYears: 5,
      education: 'B.Tech Computer Science',
      preferredCities: ['Bengaluru'],
      availableFrom: '2026-11-01',
      willingToRelocate: true,
      skills: [
        { name: 'TypeScript', yearsOfExperience: 4, proficiency: 'advanced' },
        { name: 'React', yearsOfExperience: 4, proficiency: 'expert' },
        { name: 'Node.js', yearsOfExperience: 3, proficiency: 'advanced' },
        { name: 'AWS', yearsOfExperience: 2, proficiency: 'intermediate' },
      ],
    };

    const result = evaluateCandidateRoleMatch(candidate, mockJob);

    expect(result.skillMatchPercentage).toBe(100);
    expect(result.eligibility.isEligible).toBe(true);
    expect(result.eligibility.criticalSkillsMet).toBe(true);
    expect(result.skillGaps.length).toBe(0);
    expect(result.explainabilitySummary.length).toBeGreaterThan(0);
  });

  it('identifies critical skill gaps and provides actionable hints for missing required skills', () => {
    const candidate: CandidateProfile = {
      id: 'c2',
      fullName: 'Bob Novice',
      email: 'bob@example.com',
      totalExperienceYears: 2, // Less than required 4 years
      education: 'BCA',
      preferredCities: ['Pune'],
      availableFrom: '2026-11-15',
      willingToRelocate: true,
      skills: [
        // Missing TypeScript & Node.js completely
        { name: 'React', yearsOfExperience: 1.5, proficiency: 'intermediate' }, // Less than required 3 yrs
      ],
    };

    const result = evaluateCandidateRoleMatch(candidate, mockJob);

    expect(result.skillMatchPercentage).toBeLessThan(50);
    expect(result.skillGaps.length).toBeGreaterThanOrEqual(2);

    // Verify critical gap hints
    const tsGap = result.skillGaps.find((g) => g.skillName === 'TypeScript');
    expect(tsGap).toBeDefined();
    expect(tsGap?.severity).toBe('CRITICAL_REQUIRED');
    expect(tsGap?.gapExplanation).toContain('lacks required mandatory skill "TypeScript"');

    const reactGap = result.skillGaps.find((g) => g.skillName === 'React');
    expect(reactGap).toBeDefined();
    expect(reactGap?.candidateYears).toBe(1.5);
    expect(reactGap?.recommendedAction).toBeDefined();
  });

  it('never automatically rejects candidate because of AI or interview score', () => {
    const candidateWithLowInterviewScore: CandidateProfile = {
      id: 'c3',
      fullName: 'Charlie Tech',
      email: 'charlie@example.com',
      totalExperienceYears: 6,
      education: 'B.Tech Information Technology',
      preferredCities: ['Bengaluru'],
      availableFrom: '2026-11-01',
      willingToRelocate: true,
      interviewScore: 20, // Low AI/Interview score
      skills: [
        { name: 'TypeScript', yearsOfExperience: 4, proficiency: 'advanced' },
        { name: 'React', yearsOfExperience: 4, proficiency: 'advanced' },
        { name: 'Node.js', yearsOfExperience: 3, proficiency: 'intermediate' },
      ],
    };

    const result = evaluateCandidateRoleMatch(candidateWithLowInterviewScore, mockJob);

    // Verification: Low interview score does NOT cause ineligibility in the matching engine
    expect(result.eligibility.isEligible).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
  });
});


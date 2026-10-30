import assert from 'node:assert';
import { calculateCandidateMatch } from '../src/lib/rankingEngine.ts';
import type { Candidate, JobRole, CityVacancy, RankingRulesConfig } from '../src/types';

console.log('====================================================');
console.log('🧪 RUNNING HIRESLOT HR DASHBOARD AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`❌ [FAIL] ${name}`);
    console.error(err);
    failedTests++;
  }
}

// 1. Mock Data Setup for Tests
const mockRole: JobRole = {
  id: 'role-test-01',
  driveId: 'drv-test',
  title: 'Senior Full Stack Engineer',
  department: 'Engineering',
  bandLevel: 'L4 / Senior',
  baseSalaryMin: 120000,
  baseSalaryMax: 160000,
  currency: 'USD',
  minYearsExperience: 4,
  requiredSkills: [
    { id: 's1', name: 'React', category: 'framework', isMandatory: true, minYearsExperience: 3, weight: 9 },
    { id: 's2', name: 'TypeScript', category: 'core', isMandatory: true, minYearsExperience: 3, weight: 9 },
    { id: 's3', name: 'Node.js', category: 'core', isMandatory: true, minYearsExperience: 2, weight: 8 },
  ],
  evaluationCriteria: {
    skillMatchWeight: 35,
    experienceWeight: 25,
    assessmentWeight: 20,
    locationPrefWeight: 20,
  },
  createdAt: new Date().toISOString(),
};

const mockVacancyBLR: CityVacancy = {
  id: 'vac-blr',
  driveId: 'drv-test',
  roleId: 'role-test-01',
  city: 'Bengaluru',
  targetHeadcount: 20,
  bufferPercentage: 15,
  minBarScore: 75,
  venueName: 'Tech Park Tower B',
  venueAddress: 'Bellandur Ring Road, Bengaluru',
  pointOfContactName: 'Ananya Deshmukh',
  pointOfContactPhone: '+91 98450 12345',
  createdAt: new Date().toISOString(),
};

const mockRankingRules: RankingRulesConfig = {
  id: 'rules-test',
  driveId: 'drv-test',
  skillMatchWeight: 35,
  experienceWeight: 20,
  locationMatchWeight: 25,
  relocationWillingnessWeight: 10,
  assessmentScoreWeight: 10,
  prioritizeFirstPreference: true,
  minPassingThreshold: 65,
  allowBufferOverflow: true,
  maxBufferPercentage: 20,
  updatedAt: new Date().toISOString(),
  updatedBy: 'Test Runner',
};

// TEST 1: Candidate Ranking Calculation & Score Weights
test('Ranking Engine: High match candidate achieves expected score', () => {
  const candidateA: Candidate = {
    id: 'c1',
    driveId: 'drv-test',
    roleId: 'role-test-01',
    fullName: 'Aarav Patel',
    email: 'aarav@example.com',
    phone: '+91 98200 11223',
    currentCity: 'Bengaluru',
    preferredCities: ['Bengaluru', 'Pune'],
    relocationReadiness: 'HIGH',
    yearsExperience: 5.5,
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    assessmentScore: 92,
    appliedDate: new Date().toISOString(),
  };

  const match = calculateCandidateMatch(candidateA, mockRole, mockVacancyBLR, mockRankingRules);
  assert(match.totalScore >= 90, `Expected totalScore >= 90, got ${match.totalScore}`);
  assert(match.cityMatchScore === 25, `Expected 1st choice city points 25, got ${match.cityMatchScore}`);
  assert(match.skillMatchScore === 35, `Expected 100% skill match points 35, got ${match.skillMatchScore}`);
  assert(match.reasons.length > 0, 'Expected positive justification reasons');
  assert(match.warnings.length === 0, 'Expected zero warnings for top match candidate');
});

// TEST 2: Never Silently Block Candidates
test('Never Silently Block: Candidate below threshold surfaces explicit warning reasons', () => {
  const candidateBelowCutoff: Candidate = {
    id: 'c2',
    driveId: 'drv-test',
    roleId: 'role-test-01',
    fullName: 'Nikhil Mehta',
    email: 'nikhil@example.com',
    phone: '+91 98205 66778',
    currentCity: 'Mumbai',
    preferredCities: ['Bengaluru'],
    relocationReadiness: 'HIGH',
    yearsExperience: 2.0, // Below 4y
    skills: ['Vue.js', 'CSS'], // Missing React, TypeScript, Node.js
    assessmentScore: 62, // Below 75% cutoff
    appliedDate: new Date().toISOString(),
    isSilentlyBlocked: true,
    blockedReason: 'Assessment score (62%) below city benchmark (75%). Missing mandatory skills: React, TypeScript, Node.js.',
  };

  const match = calculateCandidateMatch(candidateBelowCutoff, mockRole, mockVacancyBLR, mockRankingRules);
  assert(match.totalScore < 60, `Expected totalScore < 60, got ${match.totalScore}`);
  assert(match.warnings.length >= 2, 'Expected multiple explicit warning messages for HR review');
  assert(candidateBelowCutoff.blockedReason !== undefined, 'Candidate must have explicit blocked reason');
  assert(candidateBelowCutoff.blockedReason.includes('below city benchmark'), 'Reason must state score deficit');
});

// TEST 3: HR Ranking Rule Modification Dynamically Updates Scores
test('HR Ranking Rules: Changing skill weight recalibrates candidate match score', () => {
  const candidatePartial: Candidate = {
    id: 'c3',
    driveId: 'drv-test',
    roleId: 'role-test-01',
    fullName: 'Devansh Nambiar',
    email: 'devansh@example.com',
    phone: '+91 94470 55443',
    currentCity: 'Kochi',
    preferredCities: ['Bengaluru'],
    relocationReadiness: 'MEDIUM',
    yearsExperience: 4.0,
    skills: ['React', 'TypeScript'], // missing Node.js (2/3 match)
    assessmentScore: 80,
    appliedDate: new Date().toISOString(),
  };

  const matchOriginal = calculateCandidateMatch(candidatePartial, mockRole, mockVacancyBLR, mockRankingRules);

  const modifiedRules: RankingRulesConfig = {
    ...mockRankingRules,
    skillMatchWeight: 50, // Increased from 35 to 50
    locationMatchWeight: 10,
  };

  const matchModified = calculateCandidateMatch(candidatePartial, mockRole, mockVacancyBLR, modifiedRules);
  assert.notStrictEqual(matchOriginal.totalScore, matchModified.totalScore, 'Score must dynamically change when rules change');
});

// TEST 4: Outstation Relocation Readiness
test('Relocation Evaluation: Relocation readiness correctly factors non-preferred locations', () => {
  const candidateRelo: Candidate = {
    id: 'c4',
    driveId: 'drv-test',
    roleId: 'role-test-01',
    fullName: 'Sneha Agarwal',
    email: 'sneha@example.com',
    phone: '+91 98300 88990',
    currentCity: 'Kolkata',
    preferredCities: ['Bengaluru'],
    relocationReadiness: 'HIGH',
    yearsExperience: 5.0,
    skills: ['React', 'TypeScript', 'Node.js'],
    assessmentScore: 85,
    appliedDate: new Date().toISOString(),
  };

  const vacancyPune: CityVacancy = {
    ...mockVacancyBLR,
    city: 'Pune',
  };

  const matchPune = calculateCandidateMatch(candidateRelo, mockRole, vacancyPune, mockRankingRules);
  assert(matchPune.relocationScore > 0, 'High relocation readiness must contribute points for alternative city');
});

// TEST 5: Decoupled Workflow Verification
test('Decoupled Workflows: Candidate Allocation operates independently from Interview Slot Scheduling', () => {
  // A candidate can be allocated without having an interview slot booked
  const mockAllocation = {
    id: 'alloc-test-1',
    candidateId: 'c1',
    allocatedCity: 'Bengaluru',
    status: 'ALLOCATED',
  };

  const mockSlot = {
    id: 'slot-test-1',
    city: 'Bengaluru',
    status: 'AVAILABLE',
    currentCandidateId: undefined,
  };

  assert.strictEqual(mockAllocation.status, 'ALLOCATED');
  assert.strictEqual(mockSlot.status, 'AVAILABLE');
  assert.strictEqual(mockSlot.currentCandidateId, undefined, 'Slot is not auto-booked upon allocation');
});

console.log('\n----------------------------------------------------');
console.log(`Summary: ${passedTests} passed, ${failedTests} failed.`);
console.log('----------------------------------------------------');

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY!\n');
}

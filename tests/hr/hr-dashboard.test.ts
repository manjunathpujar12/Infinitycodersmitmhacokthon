import { describe, it, expect } from 'vitest';
import { calculateCandidateMatch } from '../../src/hr/lib/rankingEngine';
import {
  mapHiringDriveFromDB,
  mapHiringDriveToDB,
  mapJobRoleFromDB,
  mapJobRoleToDB,
  mapCityVacancyFromDB,
  mapCityVacancyToDB,
  mapCandidateFromDB,
  mapCandidateAllocationFromDB,
  mapInterviewSlotFromDB,
} from '../../src/hr/lib/supabaseMappers';
import type { Candidate, JobRole, CityVacancy, RankingRulesConfig, UserRole } from '../../src/hr/types';

// ==========================================
// Test Fixtures
// ==========================================
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

// ==========================================
// 1. Multi-factor Ranking Engine Tests
// ==========================================
describe('Multi-factor Ranking Engine', () => {
  it('calculates top score for high-match candidate with positive justifications and zero warnings', () => {
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
    expect(match.totalScore).toBeGreaterThanOrEqual(90);
    expect(match.cityMatchScore).toBe(25);
    expect(match.skillMatchScore).toBe(35);
    expect(match.reasons.length).toBeGreaterThan(0);
    expect(match.warnings.length).toBe(0);
  });

  it('surfaces explicit warning reasons for low-scoring candidate without silent blocking', () => {
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
      yearsExperience: 2.0,
      skills: ['Vue.js', 'CSS'],
      assessmentScore: 62,
      appliedDate: new Date().toISOString(),
      isSilentlyBlocked: true,
      blockedReason: 'Assessment score (62%) below city benchmark (75%). Missing mandatory skills: React, TypeScript, Node.js.',
    };

    const match = calculateCandidateMatch(candidateBelowCutoff, mockRole, mockVacancyBLR, mockRankingRules);
    expect(match.totalScore).toBeLessThan(60);
    expect(match.warnings.length).toBeGreaterThanOrEqual(2);
    expect(candidateBelowCutoff.blockedReason).toBeDefined();
    expect(candidateBelowCutoff.blockedReason).toContain('below city benchmark');
  });

  it('dynamically recalibrates candidate score when HR changes ranking weights', () => {
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
      skills: ['React', 'TypeScript'],
      assessmentScore: 80,
      appliedDate: new Date().toISOString(),
    };

    const matchOriginal = calculateCandidateMatch(candidatePartial, mockRole, mockVacancyBLR, mockRankingRules);

    const modifiedRules: RankingRulesConfig = {
      ...mockRankingRules,
      skillMatchWeight: 50,
      locationMatchWeight: 10,
    };

    const matchModified = calculateCandidateMatch(candidatePartial, mockRole, mockVacancyBLR, modifiedRules);
    expect(matchOriginal.totalScore).not.toEqual(matchModified.totalScore);
  });

  it('rewards high relocation readiness when evaluating outstation candidates for alternative cities', () => {
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
    expect(matchPune.relocationScore).toBeGreaterThan(0);
  });
});

// ==========================================
// 2. Supabase Bidirectional Mappers Tests
// ==========================================
describe('Supabase Bidirectional Mappers', () => {
  it('maps hiring drive DB row to TypeScript model and back to DB payload', () => {
    const dbRow = {
      id: 'drv-uuid-1',
      code: 'DRV-2026-ENG',
      title: 'Global Tech Drive 2026',
      description: 'Annual campus and lateral recruitment drive',
      mode: 'HYBRID',
      status: 'ACTIVE',
      start_date: '2026-11-01T00:00:00Z',
      end_date: '2026-11-15T00:00:00Z',
      total_target_headcount: 50,
      created_at: '2026-10-01T10:00:00Z',
      updated_at: '2026-10-02T10:00:00Z',
    };

    const appDrive = mapHiringDriveFromDB(dbRow, 4, 3);
    expect(appDrive.id).toBe('drv-uuid-1');
    expect(appDrive.code).toBe('DRV-2026-ENG');
    expect(appDrive.startDate).toBe('2026-11-01');
    expect(appDrive.totalTargetHeadcount).toBe(50);
    expect(appDrive.rolesCount).toBe(4);
    expect(appDrive.citiesCount).toBe(3);

    const dbPayload = mapHiringDriveToDB(appDrive);
    expect(dbPayload.code).toBe('DRV-2026-ENG');
    expect(dbPayload.total_target_headcount).toBe(50);
    expect(dbPayload.start_date).toBe('2026-11-01');
    expect(dbPayload.updated_at).toBeDefined();
  });

  it('maps job role DB row to TypeScript model and back', () => {
    const dbRow = {
      id: 'role-uuid-1',
      drive_id: 'drv-uuid-1',
      title: 'Full Stack Engineer',
      department: 'Engineering',
      band_level: 'L3 / Mid',
      base_salary_min: 90000,
      base_salary_max: 130000,
      currency: 'USD',
      min_years_experience: 3,
      required_skills: [{ id: 's1', name: 'React', category: 'framework', isMandatory: true, minYearsExperience: 2, weight: 8 }],
      evaluation_criteria: { skillMatchWeight: 40, experienceWeight: 25, assessmentWeight: 20, locationPrefWeight: 15 },
      created_at: '2026-10-01T10:00:00Z',
    };

    const appRole = mapJobRoleFromDB(dbRow);
    expect(appRole.id).toBe('role-uuid-1');
    expect(appRole.minYearsExperience).toBe(3);
    expect(appRole.requiredSkills).toHaveLength(1);

    const dbPayload = mapJobRoleToDB(appRole);
    expect(dbPayload.drive_id).toBe('drv-uuid-1');
    expect(dbPayload.base_salary_min).toBe(90000);
    expect(dbPayload.min_years_experience).toBe(3);
  });

  it('maps city vacancy DB row with numerical coercions and defaults', () => {
    const dbRow = {
      id: 'vac-uuid-1',
      drive_id: 'drv-uuid-1',
      role_id: 'role-uuid-1',
      city: 'Hyderabad',
      target_headcount: '25', // string from raw postgres
      buffer_percentage: '15',
      min_bar_score: '72',
      venue_name: 'HITEC Convention Centre',
      venue_address: 'HITEC City, Hyderabad',
      point_of_contact_name: 'Priya Sharma',
      point_of_contact_phone: '+91 99887 76655',
      created_at: '2026-10-01T10:00:00Z',
    };

    const appVacancy = mapCityVacancyFromDB(dbRow);
    expect(appVacancy.city).toBe('Hyderabad');
    expect(appVacancy.targetHeadcount).toBe(25);
    expect(appVacancy.bufferPercentage).toBe(15);
    expect(appVacancy.minBarScore).toBe(72);

    const dbPayload = mapCityVacancyToDB(appVacancy);
    expect(dbPayload.target_headcount).toBe(25);
    expect(dbPayload.venue_name).toBe('HITEC Convention Centre');
  });

  it('maps candidate DB row including arrays, readiness, and exemption states', () => {
    const dbRow = {
      id: 'cand-uuid-1',
      drive_id: 'drv-uuid-1',
      role_id: 'role-uuid-1',
      full_name: 'Ananya Deshmukh',
      email: 'ananya@example.com',
      phone: '+91 98450 12345',
      current_city: 'Bengaluru',
      preferred_cities: ['Bengaluru', 'Chennai'],
      relocation_readiness: 'HIGH',
      years_experience: 6,
      skills: ['React', 'Node.js', 'PostgreSQL'],
      assessment_score: 88,
      resume_url: 'https://storage.example.com/resumes/cand-1.pdf',
      is_silently_blocked: false,
      blocked_reason: null,
      hr_exemption_granted: true,
      hr_exemption_note: 'Approved by Engineering Director',
      applied_date: '2026-10-20T10:00:00Z',
    };

    const appCand = mapCandidateFromDB(dbRow);
    expect(appCand.fullName).toBe('Ananya Deshmukh');
    expect(appCand.preferredCities).toEqual(['Bengaluru', 'Chennai']);
    expect(appCand.hrExemptionGranted).toBe(true);
    expect(appCand.hrExemptionNote).toBe('Approved by Engineering Director');
  });

  it('maps candidate allocation DB row and preserves recommendation breakdown', () => {
    const dbRow = {
      id: 'alloc-uuid-1',
      drive_id: 'drv-uuid-1',
      candidate_id: 'cand-uuid-1',
      role_id: 'role-uuid-1',
      allocated_city: 'Bengaluru',
      status: 'ALLOCATED',
      rank: 1,
      match_score: 95,
      recommendation_breakdown: {
        totalScore: 95,
        cityMatchScore: 35,
        skillMatchScore: 30,
        experienceScore: 15,
        relocationScore: 15,
        reasons: ['Top skill match', 'Primary city preferred'],
        warnings: [],
      },
      allocated_by: 'HR_ADMIN',
      allocated_at: '2026-10-25T10:00:00Z',
      updated_at: '2026-10-25T10:00:00Z',
    };

    const appAlloc = mapCandidateAllocationFromDB(dbRow);
    expect(appAlloc.allocatedCity).toBe('Bengaluru');
    expect(appAlloc.status).toBe('ALLOCATED');
    expect(appAlloc.recommendationBreakdown.reasons).toHaveLength(2);
  });

  it('maps interview slot DB row with candidate name join and recycled metadata', () => {
    const dbRow = {
      id: 'slot-uuid-1',
      drive_id: 'drv-uuid-1',
      role_id: 'role-uuid-1',
      city: 'Bengaluru',
      slot_date: '2026-11-05T00:00:00Z',
      start_time: '14:00:00',
      end_time: '15:00:00',
      interviewer_name: 'Vikram Joshi',
      interviewer_email: 'vikram@example.com',
      room_or_link: 'Room 302, Tower B',
      max_capacity: 1,
      current_candidate_id: 'cand-uuid-1',
      candidates: { full_name: 'Ananya Deshmukh' },
      status: 'BOOKED',
      recycled_from_candidate_id: null,
      created_at: '2026-10-01T10:00:00Z',
    };

    const appSlot = mapInterviewSlotFromDB(dbRow);
    expect(appSlot.slotDate).toBe('2026-11-05');
    expect(appSlot.startTime).toBe('14:00');
    expect(appSlot.candidateName).toBe('Ananya Deshmukh');
    expect(appSlot.status).toBe('BOOKED');
  });
});

// ==========================================
// 3. Role-Based Security & Permissions Tests
// ==========================================
describe('Role-Based Security & Finance Authorization', () => {
  function checkFinanceDisbursementAccess(role: UserRole | null): { allowed: boolean; reason?: string } {
    if (!role) {
      return { allowed: false, reason: 'Authentication required. No role assigned.' };
    }
    const isAuthorizedFinance = role === 'HR_ADMIN' || role === 'FINANCE_OFFICER';
    if (!isAuthorizedFinance) {
      return {
        allowed: false,
        reason: 'Restricted: Batch disbursement & manifest generation requires HR_ADMIN or FINANCE_OFFICER privileges.',
      };
    }
    return { allowed: true };
  }

  function maskBankAccountForRole(accountNumber: string, role: UserRole | null): string {
    const isAuthorizedFinance = role === 'HR_ADMIN' || role === 'FINANCE_OFFICER';
    if (!isAuthorizedFinance) {
      return '•••••••• (Restricted)';
    }
    return `••••${accountNumber.slice(-4)}`;
  }

  it('permits HR_ADMIN to disburse payroll batches and view account numbers', () => {
    const role: UserRole = 'HR_ADMIN';
    const auth = checkFinanceDisbursementAccess(role);
    expect(auth.allowed).toBe(true);

    const masked = maskBankAccountForRole('987654321012', role);
    expect(masked).toBe('••••1012');
  });

  it('permits FINANCE_OFFICER to disburse payroll batches and view account numbers', () => {
    const role: UserRole = 'FINANCE_OFFICER';
    const auth = checkFinanceDisbursementAccess(role);
    expect(auth.allowed).toBe(true);

    const masked = maskBankAccountForRole('987654321012', role);
    expect(masked).toBe('••••1012');
  });

  it('denies HR_RECRUITER from executing payroll disbursement and redacts account numbers', () => {
    const role: UserRole = 'HR_RECRUITER';
    const auth = checkFinanceDisbursementAccess(role);
    expect(auth.allowed).toBe(false);
    expect(auth.reason).toContain('HR_ADMIN or FINANCE_OFFICER privileges');

    const masked = maskBankAccountForRole('987654321012', role);
    expect(masked).toBe('•••••••• (Restricted)');
  });

  it('denies INTERVIEW_COORDINATOR from executing payroll disbursement and redacts account numbers', () => {
    const role: UserRole = 'INTERVIEW_COORDINATOR';
    const auth = checkFinanceDisbursementAccess(role);
    expect(auth.allowed).toBe(false);

    const masked = maskBankAccountForRole('987654321012', role);
    expect(masked).toBe('•••••••• (Restricted)');
  });

  it('denies unauthenticated / null roles with clear reason', () => {
    const auth = checkFinanceDisbursementAccess(null);
    expect(auth.allowed).toBe(false);
    expect(auth.reason).toContain('Authentication required');
  });
});

// ==========================================
// 4. City Capacity & Overflow Evaluation Tests
// ==========================================
describe('City Capacity & Overflow Evaluation', () => {
  interface CapacityCheckResult {
    status: 'ALLOCATED' | 'OVERFLOW';
    currentCount: number;
    targetCapacity: number;
    maxBufferCapacity: number;
    exceededTarget: boolean;
  }

  function evaluateCapacityAssignment(
    currentConfirmedAllocations: number,
    vacancy: CityVacancy
  ): CapacityCheckResult {
    const targetCapacity = vacancy.targetHeadcount;
    const maxBufferCapacity = Math.round(targetCapacity * (1 + vacancy.bufferPercentage / 100));

    if (currentConfirmedAllocations < targetCapacity) {
      return {
        status: 'ALLOCATED',
        currentCount: currentConfirmedAllocations + 1,
        targetCapacity,
        maxBufferCapacity,
        exceededTarget: false,
      };
    } else {
      return {
        status: 'OVERFLOW',
        currentCount: currentConfirmedAllocations,
        targetCapacity,
        maxBufferCapacity,
        exceededTarget: true,
      };
    }
  }

  it('allocates candidate when city headcount is below target', () => {
    const vacancy: CityVacancy = {
      ...mockVacancyBLR,
      targetHeadcount: 20,
      bufferPercentage: 15,
    };

    const result = evaluateCapacityAssignment(10, vacancy);
    expect(result.status).toBe('ALLOCATED');
    expect(result.currentCount).toBe(11);
    expect(result.exceededTarget).toBe(false);
  });

  it('triggers OVERFLOW status when city headcount reaches target capacity', () => {
    const vacancy: CityVacancy = {
      ...mockVacancyBLR,
      targetHeadcount: 20,
      bufferPercentage: 15,
    };

    const result = evaluateCapacityAssignment(20, vacancy);
    expect(result.status).toBe('OVERFLOW');
    expect(result.exceededTarget).toBe(true);
    expect(result.maxBufferCapacity).toBe(23); // 20 * 1.15 = 23
  });
});


import { describe, it, expect } from 'vitest';
import { runAllocationForCandidate } from '../engine/allocationEngine';
import { JobRole, CandidateProfile } from '../types/matching';
import { CityVacancy } from '../types/location';
import { JobAllocation } from '../types/allocation';

describe('Transactional Allocation Engine', () => {
  const mockJob: JobRole = {
    id: 'job-alloc-1',
    title: 'Senior Cloud Engineer',
    department: 'Infrastructure',
    minExperienceYears: 4,
    requiredSkills: [
      { name: 'TypeScript', minYears: 3, isRequired: true },
      { name: 'Node.js', minYears: 3, isRequired: true },
    ],
    isOpen: true,
    createdAt: new Date().toISOString(),
  };

  const qualifiedCandidate: CandidateProfile = {
    id: 'cand-alloc-1',
    fullName: 'Kavita Reddy',
    email: 'kavita@example.com',
    totalExperienceYears: 5,
    education: 'B.Tech',
    preferredCities: ['Bengaluru', 'Pune'],
    currentCity: 'Bengaluru',
    currentCoordinates: { latitude: 12.9716, longitude: 77.5946 },
    availableFrom: '2026-11-10',
    willingToRelocate: true,
    skills: [
      { name: 'TypeScript', yearsOfExperience: 4, proficiency: 'advanced' },
      { name: 'Node.js', yearsOfExperience: 4, proficiency: 'advanced' },
    ],
  };

  it('allocates candidate to 1st preferred city when open capacity exists', () => {
    const vacancies: CityVacancy[] = [
      {
        id: 'v-blr',
        jobId: mockJob.id,
        cityId: 'c-blr',
        cityName: 'Bengaluru',
        totalCapacity: 5,
        allocatedCount: 2,
        reservedCount: 0,
        availableCapacity: 3,
        status: 'AVAILABLE',
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = runAllocationForCandidate({
      candidate: qualifiedCandidate,
      job: mockJob,
      vacancies,
      existingAllocations: [],
    });

    expect(result.success).toBe(true);
    expect(result.allocation).toBeDefined();
    expect(result.allocation?.status).toBe('ALLOCATED');
    expect(result.allocation?.allocatedCityName).toBe('Bengaluru');
    expect(result.decision.type).toBe('PREFERRED_LOCATION_MATCH');

    // Vacancy capacity must be decremented
    const blrVac = result.updatedVacancies.find((v) => v.cityName === 'Bengaluru');
    expect(blrVac?.allocatedCount).toBe(3);
    expect(blrVac?.availableCapacity).toBe(2);

    // Audit log generated
    expect(result.auditLog.action).toBe('ALLOCATION_CONFIRMED');
    expect(result.auditLog.toStatus).toBe('ALLOCATED');
  });

  it('never assigns candidate to a full city; cascades to secondary preferred city', () => {
    const vacancies: CityVacancy[] = [
      {
        id: 'v-blr',
        jobId: mockJob.id,
        cityId: 'c-blr',
        cityName: 'Bengaluru', // 1st choice is FULL
        totalCapacity: 3,
        allocatedCount: 3,
        reservedCount: 0,
        availableCapacity: 0,
        status: 'FULL',
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v-pun',
        jobId: mockJob.id,
        cityId: 'c-pun',
        cityName: 'Pune', // 2nd choice is AVAILABLE
        totalCapacity: 4,
        allocatedCount: 1,
        reservedCount: 0,
        availableCapacity: 3,
        status: 'AVAILABLE',
        coordinates: { latitude: 18.5204, longitude: 73.8567 },
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = runAllocationForCandidate({
      candidate: qualifiedCandidate,
      job: mockJob,
      vacancies,
      existingAllocations: [],
    });

    expect(result.success).toBe(true);
    // Bengaluru must NEVER be assigned since it is FULL
    expect(result.allocation?.allocatedCityName).toBe('Pune');
    expect(result.decision.type).toBe('SECONDARY_LOCATION_MATCH');

    const blrVac = result.updatedVacancies.find((v) => v.cityName === 'Bengaluru');
    expect(blrVac?.allocatedCount).toBe(3); // Unchanged, never overbooked

    const punVac = result.updatedVacancies.find((v) => v.cityName === 'Pune');
    expect(punVac?.allocatedCount).toBe(2);
    expect(punVac?.availableCapacity).toBe(2);
  });

  it('prevents duplicate allocations for the same candidate and job', () => {
    const existingAllocation: JobAllocation = {
      id: 'existing-alloc-1',
      candidateId: qualifiedCandidate.id,
      candidateName: qualifiedCandidate.fullName,
      jobId: mockJob.id,
      jobTitle: mockJob.title,
      allocatedCityName: 'Bengaluru',
      status: 'ALLOCATED',
      matchScore: 90,
      decisionExplanation: 'Previous confirmed allocation',
      isAlternativeOffer: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const vacancies: CityVacancy[] = [
      {
        id: 'v-blr',
        jobId: mockJob.id,
        cityId: 'c-blr',
        cityName: 'Bengaluru',
        totalCapacity: 5,
        allocatedCount: 1,
        reservedCount: 0,
        availableCapacity: 4,
        status: 'AVAILABLE',
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = runAllocationForCandidate({
      candidate: qualifiedCandidate,
      job: mockJob,
      vacancies,
      existingAllocations: [existingAllocation],
    });

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Duplicate allocation prevented');
    expect(result.auditLog.action).toBe('ALLOCATION_BLOCKED_DUPLICATE');
  });

  it('triggers Haversine alternative city offer when all preferred cities are full', () => {
    const candidateOnlyChennai: CandidateProfile = {
      ...qualifiedCandidate,
      preferredCities: ['Chennai'], // Only Chennai
      currentCoordinates: { latitude: 13.0827, longitude: 80.2707 },
    };

    const vacancies: CityVacancy[] = [
      {
        id: 'v-chn',
        jobId: mockJob.id,
        cityId: 'c-chn',
        cityName: 'Chennai',
        totalCapacity: 2,
        allocatedCount: 2,
        reservedCount: 0,
        availableCapacity: 0, // FULL
        status: 'FULL',
        coordinates: { latitude: 13.0827, longitude: 80.2707 },
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v-blr',
        jobId: mockJob.id,
        cityId: 'c-blr',
        cityName: 'Bengaluru', // Open nearby city (~290 km)
        totalCapacity: 5,
        allocatedCount: 1,
        reservedCount: 0,
        availableCapacity: 4,
        status: 'AVAILABLE',
        coordinates: { latitude: 12.9716, longitude: 77.5946 },
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = runAllocationForCandidate({
      candidate: candidateOnlyChennai,
      job: mockJob,
      vacancies,
      existingAllocations: [],
    });

    expect(result.success).toBe(true);
    expect(result.allocation?.status).toBe('OFFERED_ALTERNATIVE');
    expect(result.alternativeOffer).toBeDefined();
    expect(result.alternativeOffer?.offeredCityName).toBe('Bengaluru');
    expect(result.decision.factors.haversineApplied).toBe(true);

    // Reserved count in alternative city must increment
    const blrVac = result.updatedVacancies.find((v) => v.cityName === 'Bengaluru');
    expect(blrVac?.reservedCount).toBe(1);
    expect(blrVac?.availableCapacity).toBe(3);
  });
});


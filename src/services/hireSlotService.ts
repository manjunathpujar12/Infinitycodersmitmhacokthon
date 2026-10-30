import { JobRole, CandidateProfile, HrRankingWeights, RoleMatchScoreBreakdown } from '../types/matching';
import { CityVacancy, CityLocation, CityDistanceRecommendation } from '../types/location';
import {
  JobAllocation,
  AlternativeCityOffer,
  AllocationAuditLog,
} from '../types/allocation';
import { WaitlistEntry } from '../types/waitlist';
import { evaluateCandidateRoleMatch } from '../engine/matchingEngine';
import { rankCandidateWithRules, DEFAULT_HR_RANKING_WEIGHTS } from '../engine/rankingEngine';
import { runAllocationForCandidate, AllocationExecutionResult } from '../engine/allocationEngine';
import { handleCandidateAlternativeOfferResponse } from '../engine/alternativeCityManager';
import { calculateAvailableCapacity, determineVacancyStatus } from '../engine/vacancyTracker';
import { createAuditLogEntry, queryAuditLogs } from '../engine/auditLogger';
import { calculateHaversineDistanceKm, getNearestAvailableCities } from '../lib/haversine';
import { supabase, isRealSupabaseConfigured } from '../lib/supabaseClient';

export interface SeedDataset {
  jobs: JobRole[];
  candidates: CandidateProfile[];
  cities: CityLocation[];
  vacancies: CityVacancy[];
  rankingWeights: HrRankingWeights;
}

/**
 * Seed data for development, testing and interactive demo
 */
export function getInitialSeedData(): SeedDataset {
  const jobs: JobRole[] = [
    {
      id: 'job-fs-01',
      title: 'Senior Full-Stack Cloud Engineer',
      department: 'Core Platform Engineering',
      minExperienceYears: 4,
      maxExperienceYears: 8,
      requiredEducation: ['B.Tech', 'B.E.', 'MCA', 'Computer Science'],
      requiredSkills: [
        { name: 'TypeScript', minYears: 3, isRequired: true, minProficiency: 'advanced', category: 'core' },
        { name: 'React', minYears: 3, isRequired: true, minProficiency: 'advanced', category: 'framework' },
        { name: 'Node.js', minYears: 3, isRequired: true, minProficiency: 'intermediate', category: 'framework' },
        { name: 'PostgreSQL', minYears: 2, isRequired: true, minProficiency: 'intermediate', category: 'database' },
        { name: 'Docker', minYears: 1, isRequired: false, minProficiency: 'intermediate', category: 'cloud' },
        { name: 'AWS', minYears: 2, isRequired: false, minProficiency: 'intermediate', category: 'cloud' },
      ],
      description: 'Lead architecture and end-to-end full-stack feature delivery on distributed cloud services.',
      isOpen: true,
      createdAt: '2026-10-01T10:00:00Z',
    },
    {
      id: 'job-fe-02',
      title: 'Frontend Platform Architect',
      department: 'Design Systems & UI',
      minExperienceYears: 5,
      requiredEducation: ['B.Tech', 'B.E.', 'BCA'],
      requiredSkills: [
        { name: 'React', minYears: 4, isRequired: true, minProficiency: 'expert', category: 'framework' },
        { name: 'TypeScript', minYears: 4, isRequired: true, minProficiency: 'expert', category: 'core' },
        { name: 'Tailwind CSS', minYears: 2, isRequired: true, minProficiency: 'advanced', category: 'framework' },
        { name: 'Web Performance', minYears: 2, isRequired: false, minProficiency: 'intermediate', category: 'core' },
      ],
      description: 'Spearhead frontend design system and micro-frontends across web clients.',
      isOpen: true,
      createdAt: '2026-10-05T10:00:00Z',
    },
  ];

  const cities: CityLocation[] = [
    {
      id: 'city-blr',
      cityName: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
      coordinates: { latitude: 12.9716, longitude: 77.5946 },
      tier: 1,
    },
    {
      id: 'city-hyd',
      cityName: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      coordinates: { latitude: 17.3850, longitude: 78.4867 },
      tier: 1,
    },
    {
      id: 'city-chn',
      cityName: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      coordinates: { latitude: 13.0827, longitude: 80.2707 },
      tier: 1,
    },
    {
      id: 'city-pun',
      cityName: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      coordinates: { latitude: 18.5204, longitude: 73.8567 },
      tier: 1,
    },
    {
      id: 'city-mum',
      cityName: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      coordinates: { latitude: 19.0760, longitude: 72.8777 },
      tier: 1,
    },
  ];

  // Specific initial vacancy counts to showcase:
  // - Bengaluru: 2 open seats
  // - Chennai: 0 open seats (FULL) -> Triggers nearest Haversine overflow!
  // - Hyderabad: 1 open seat
  // - Pune: 3 open seats
  const vacancies: CityVacancy[] = [
    {
      id: 'vac-fs-blr',
      jobId: 'job-fs-01',
      cityId: 'city-blr',
      cityName: 'Bengaluru',
      totalCapacity: 5,
      allocatedCount: 3,
      reservedCount: 0,
      availableCapacity: 2,
      status: 'AVAILABLE',
      coordinates: { latitude: 12.9716, longitude: 77.5946 },
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'vac-fs-chn',
      jobId: 'job-fs-01',
      cityId: 'city-chn',
      cityName: 'Chennai',
      totalCapacity: 4,
      allocatedCount: 4,
      reservedCount: 0,
      availableCapacity: 0, // FULL: Never assign to full city
      status: 'FULL',
      coordinates: { latitude: 13.0827, longitude: 80.2707 },
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'vac-fs-hyd',
      jobId: 'job-fs-01',
      cityId: 'city-hyd',
      cityName: 'Hyderabad',
      totalCapacity: 3,
      allocatedCount: 2,
      reservedCount: 0,
      availableCapacity: 1,
      status: 'LIMITED',
      coordinates: { latitude: 17.3850, longitude: 78.4867 },
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'vac-fs-pun',
      jobId: 'job-fs-01',
      cityId: 'city-pun',
      cityName: 'Pune',
      totalCapacity: 4,
      allocatedCount: 1,
      reservedCount: 0,
      availableCapacity: 3,
      status: 'AVAILABLE',
      coordinates: { latitude: 18.5204, longitude: 73.8567 },
      updatedAt: new Date().toISOString(),
    },
  ];

  const candidates: CandidateProfile[] = [
    {
      id: 'cand-01',
      fullName: 'Aditi Sharma',
      email: 'aditi.sharma@example.com',
      totalExperienceYears: 5.5,
      education: 'B.Tech in Computer Science',
      preferredCities: ['Bengaluru', 'Hyderabad'],
      currentCity: 'Bengaluru',
      currentCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      availableFrom: '2026-11-05',
      willingToRelocate: true,
      interviewScore: 88,
      skills: [
        { name: 'TypeScript', yearsOfExperience: 4, proficiency: 'advanced' },
        { name: 'React', yearsOfExperience: 4.5, proficiency: 'advanced' },
        { name: 'Node.js', yearsOfExperience: 3.5, proficiency: 'intermediate' },
        { name: 'PostgreSQL', yearsOfExperience: 3, proficiency: 'intermediate' },
        { name: 'AWS', yearsOfExperience: 2, proficiency: 'intermediate' },
      ],
    },
    {
      id: 'cand-02',
      fullName: 'Priya Nair',
      email: 'priya.nair@example.com',
      totalExperienceYears: 6.0,
      education: 'B.E. Information Technology',
      preferredCities: ['Chennai'], // Chennai is FULL! This will trigger Haversine alternative city offer
      currentCity: 'Chennai',
      currentCoordinates: { latitude: 13.0827, longitude: 80.2707 },
      availableFrom: '2026-11-15',
      willingToRelocate: true,
      interviewScore: 84,
      skills: [
        { name: 'TypeScript', yearsOfExperience: 5, proficiency: 'advanced' },
        { name: 'React', yearsOfExperience: 5, proficiency: 'expert' },
        { name: 'Node.js', yearsOfExperience: 4, proficiency: 'advanced' },
        { name: 'PostgreSQL', yearsOfExperience: 3, proficiency: 'intermediate' },
      ],
    },
    {
      id: 'cand-03',
      fullName: 'Rahul Verma',
      email: 'rahul.verma@example.com',
      totalExperienceYears: 2.0, // Experience gap + missing critical required skill PostgreSQL
      education: 'BCA',
      preferredCities: ['Bengaluru'],
      currentCity: 'Bengaluru',
      currentCoordinates: { latitude: 12.9716, longitude: 77.5946 },
      availableFrom: '2026-12-01',
      willingToRelocate: false,
      interviewScore: 65,
      skills: [
        { name: 'React', yearsOfExperience: 2, proficiency: 'intermediate' },
        { name: 'TypeScript', yearsOfExperience: 1, proficiency: 'beginner' },
        { name: 'Node.js', yearsOfExperience: 1, proficiency: 'beginner' },
      ],
    },
    {
      id: 'cand-04',
      fullName: 'Siddharth Rao',
      email: 'siddharth.rao@example.com',
      totalExperienceYears: 4.5,
      education: 'B.Tech Electrical & Electronics',
      preferredCities: ['Chennai'], // Chennai is FULL, and not willing to relocate -> Will demonstrate Waitlist!
      currentCity: 'Chennai',
      currentCoordinates: { latitude: 13.0827, longitude: 80.2707 },
      availableFrom: '2026-11-20',
      willingToRelocate: false,
      interviewScore: 82,
      skills: [
        { name: 'TypeScript', yearsOfExperience: 3.5, proficiency: 'advanced' },
        { name: 'React', yearsOfExperience: 4, proficiency: 'advanced' },
        { name: 'Node.js', yearsOfExperience: 3, proficiency: 'intermediate' },
        { name: 'PostgreSQL', yearsOfExperience: 2.5, proficiency: 'intermediate' },
      ],
    },
  ];

  return {
    jobs,
    candidates,
    cities,
    vacancies,
    rankingWeights: { ...DEFAULT_HR_RANKING_WEIGHTS },
  };
}

/**
 * Full-stack orchestrator service for HireSlot Allocation Platform
 */
export class HireSlotService {
  private jobs: JobRole[] = [];
  private candidates: CandidateProfile[] = [];
  private cities: CityLocation[] = [];
  private vacancies: CityVacancy[] = [];
  private allocations: JobAllocation[] = [];
  private alternativeOffers: AlternativeCityOffer[] = [];
  private waitlist: WaitlistEntry[] = [];
  private auditLogs: AllocationAuditLog[] = [];
  private rankingWeights: HrRankingWeights = { ...DEFAULT_HR_RANKING_WEIGHTS };

  constructor(seedData?: SeedDataset) {
    const data = seedData || getInitialSeedData();
    this.jobs = data.jobs;
    this.candidates = data.candidates;
    this.cities = data.cities;
    this.vacancies = data.vacancies;
    this.rankingWeights = data.rankingWeights;
  }

  // --- QUERY APIS ---
  public getJobs(): JobRole[] {
    return [...this.jobs];
  }

  public getCandidates(): CandidateProfile[] {
    return [...this.candidates];
  }

  public getCities(): CityLocation[] {
    return [...this.cities];
  }

  public getVacancies(jobId?: string): CityVacancy[] {
    if (jobId) {
      return this.vacancies.filter((v) => v.jobId === jobId);
    }
    return [...this.vacancies];
  }

  public getAllocations(jobId?: string): JobAllocation[] {
    if (jobId) {
      return this.allocations.filter((a) => a.jobId === jobId);
    }
    return [...this.allocations];
  }

  public getAlternativeOffers(): AlternativeCityOffer[] {
    return [...this.alternativeOffers];
  }

  public getWaitlist(jobId?: string): WaitlistEntry[] {
    if (jobId) {
      return this.waitlist.filter((w) => w.jobId === jobId);
    }
    return [...this.waitlist];
  }

  public getAuditLogs(allocationId?: string): AllocationAuditLog[] {
    if (allocationId) {
      return this.auditLogs.filter((l) => l.allocationId === allocationId);
    }
    return queryAuditLogs(this.auditLogs);
  }

  public getRankingWeights(): HrRankingWeights {
    return { ...this.rankingWeights };
  }

  public updateRankingWeights(newWeights: HrRankingWeights): void {
    this.rankingWeights = { ...newWeights };
  }

  // --- ROLE MATCHING & SKILL GAP ENGINE API ---
  public evaluateCandidate(
    candidateId: string,
    jobId: string
  ): RoleMatchScoreBreakdown {
    const candidate = this.candidates.find((c) => c.id === candidateId);
    const job = this.jobs.find((j) => j.id === jobId);

    if (!candidate) throw new Error(`Candidate with ID "${candidateId}" not found`);
    if (!job) throw new Error(`Job with ID "${jobId}" not found`);

    return evaluateCandidateRoleMatch(candidate, job);
  }

  // --- LOCATION PROXIMITY & HAVERSINE API ---
  public getNearestCityRecommendations(
    candidateId: string,
    jobId: string
  ): CityDistanceRecommendation[] {
    const candidate = this.candidates.find((c) => c.id === candidateId);
    if (!candidate) throw new Error(`Candidate ${candidateId} not found`);

    const vacancies = this.vacancies.filter((v) => v.jobId === jobId);
    const origin = candidate.currentCoordinates || { latitude: 12.9716, longitude: 77.5946 };

    return getNearestAvailableCities(origin, vacancies, candidate.preferredCities, 5);
  }

  // --- TRANSACTIONAL ALLOCATION EXECUTION API ---
  public allocateCandidate(
    candidateId: string,
    jobId: string
  ): AllocationExecutionResult {
    const candidate = this.candidates.find((c) => c.id === candidateId);
    const job = this.jobs.find((j) => j.id === jobId);

    if (!candidate) throw new Error(`Candidate with ID "${candidateId}" not found`);
    if (!job) throw new Error(`Job with ID "${jobId}" not found`);

    const jobVacancies = this.vacancies.filter((v) => v.jobId === jobId);

    const result = runAllocationForCandidate({
      candidate,
      job,
      vacancies: jobVacancies,
      existingAllocations: this.allocations,
      rankingWeights: this.rankingWeights,
    });

    // Update state atomically if successful
    if (result.success) {
      // 1. Update vacancies
      for (const updated of result.updatedVacancies) {
        const idx = this.vacancies.findIndex((v) => v.id === updated.id);
        if (idx !== -1) {
          this.vacancies[idx] = updated;
        }
      }

      // 2. Add allocation if created
      if (result.allocation) {
        this.allocations.push(result.allocation);
      }

      // 3. Add alternative offer if generated
      if (result.alternativeOffer) {
        this.alternativeOffers.push(result.alternativeOffer);
      }

      // 4. Add waitlist entry if queued
      if (result.waitlistEntry) {
        this.waitlist.push(result.waitlistEntry);
      }
    }

    // Always record audit log
    this.auditLogs.unshift(result.auditLog);

    return result;
  }

  // --- ALTERNATIVE CITY OFFER ACCEPT/REJECT WORKFLOW ---
  public respondToAlternativeCityOffer(
    allocationId: string,
    candidateId: string,
    accepted: boolean,
    candidateReason?: string
  ): { success: boolean; message: string; allocation?: JobAllocation } {
    const allocationIndex = this.allocations.findIndex((a) => a.id === allocationId);
    if (allocationIndex === -1) {
      return { success: false, message: `Allocation ${allocationId} not found` };
    }

    const offerIndex = this.alternativeOffers.findIndex(
      (o) => o.allocationId === allocationId
    );
    if (offerIndex === -1) {
      return { success: false, message: `No active alternative offer found for allocation ${allocationId}` };
    }

    const allocation = this.allocations[allocationIndex];
    const offer = this.alternativeOffers[offerIndex];

    const decisionResult = handleCandidateAlternativeOfferResponse(
      allocation,
      offer,
      accepted,
      candidateReason
    );

    // Update state
    this.allocations[allocationIndex] = decisionResult.allocation;
    this.alternativeOffers[offerIndex] = decisionResult.offer;

    // Mutate city vacancy reservation/allocation
    const vacancyIndex = this.vacancies.findIndex(
      (v) => v.jobId === allocation.jobId && v.cityId === offer.offeredCityId
    );

    if (vacancyIndex !== -1) {
      if (accepted) {
        // Reserved seat converts to permanently allocated
        this.vacancies[vacancyIndex].reservedCount = Math.max(0, this.vacancies[vacancyIndex].reservedCount - 1);
        this.vacancies[vacancyIndex].allocatedCount += 1;
      } else {
        // Reserved seat released back to open pool
        this.vacancies[vacancyIndex].reservedCount = Math.max(0, this.vacancies[vacancyIndex].reservedCount - 1);
      }

      this.vacancies[vacancyIndex].availableCapacity = calculateAvailableCapacity(
        this.vacancies[vacancyIndex].totalCapacity,
        this.vacancies[vacancyIndex].allocatedCount,
        this.vacancies[vacancyIndex].reservedCount
      );
      this.vacancies[vacancyIndex].status = determineVacancyStatus(
        this.vacancies[vacancyIndex].totalCapacity,
        this.vacancies[vacancyIndex].allocatedCount,
        this.vacancies[vacancyIndex].reservedCount
      );
    }

    // If candidate declined alternative, automatically enroll into waitlist for their 1st choice
    if (!accepted) {
      const candidate = this.candidates.find((c) => c.id === candidateId);
      if (candidate) {
        const topPref = candidate.preferredCities[0] || 'Primary Hub';
        const targetCity = this.cities.find((c) => c.cityName === topPref);
        const cityId = targetCity ? targetCity.id : 'pref-city';

        const waitlistEntry: WaitlistEntry = {
          id: `wl-${Date.now()}`,
          candidateId: candidate.id,
          candidateName: candidate.fullName,
          jobId: allocation.jobId,
          jobTitle: allocation.jobTitle,
          preferredCityId: cityId,
          preferredCityName: topPref,
          availableFrom: candidate.availableFrom,
          matchScore: allocation.matchScore,
          priorityScore: Math.round(allocation.matchScore * 0.85),
          status: 'QUEUED',
          waitlistReason: `Candidate declined alternative offer (${offer.offeredCityName}). Queued for preferred city ${topPref}.`,
          enrolledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.waitlist.push(waitlistEntry);
      }
    }

    // Audit log
    const auditLog = createAuditLogEntry({
      allocationId: allocation.id,
      candidateId,
      jobId: allocation.jobId,
      action: accepted ? 'ALTERNATIVE_OFFER_ACCEPTED' : 'ALTERNATIVE_OFFER_REJECTED',
      fromStatus: 'OFFERED_ALTERNATIVE',
      toStatus: decisionResult.allocation.status,
      actor: 'CANDIDATE',
      reason: decisionResult.message,
    });
    this.auditLogs.unshift(auditLog);

    return {
      success: true,
      message: decisionResult.message,
      allocation: decisionResult.allocation,
    };
  }

  // --- RELEASE / REVOKE ALLOCATION API ---
  public releaseAllocation(
    allocationId: string,
    reason: string = 'Candidate withdrawn or reassigned by HR'
  ): { success: boolean; message: string } {
    const idx = this.allocations.findIndex((a) => a.id === allocationId);
    if (idx === -1) {
      return { success: false, message: `Allocation ${allocationId} not found` };
    }

    const allocation = this.allocations[idx];
    const prevStatus = allocation.status;

    // Release capacity if previously allocated or reserved
    if (allocation.allocatedCityId) {
      const vIdx = this.vacancies.findIndex(
        (v) => v.jobId === allocation.jobId && v.cityId === allocation.allocatedCityId
      );
      if (vIdx !== -1) {
        this.vacancies[vIdx].allocatedCount = Math.max(0, this.vacancies[vIdx].allocatedCount - 1);
        this.vacancies[vIdx].availableCapacity = calculateAvailableCapacity(
          this.vacancies[vIdx].totalCapacity,
          this.vacancies[vIdx].allocatedCount,
          this.vacancies[vIdx].reservedCount
        );
        this.vacancies[vIdx].status = determineVacancyStatus(
          this.vacancies[vIdx].totalCapacity,
          this.vacancies[vIdx].allocatedCount,
          this.vacancies[vIdx].reservedCount
        );
      }
    }

    this.allocations[idx].status = 'RELEASED';
    this.allocations[idx].updatedAt = new Date().toISOString();

    const auditLog = createAuditLogEntry({
      allocationId: allocation.id,
      candidateId: allocation.candidateId,
      jobId: allocation.jobId,
      action: 'ALLOCATION_RELEASED',
      fromStatus: prevStatus,
      toStatus: 'RELEASED',
      actor: 'HR_ADMIN',
      reason,
    });
    this.auditLogs.unshift(auditLog);

    return { success: true, message: `Allocation released successfully. Vacancy updated.` };
  }
}

export const hireSlotService = new HireSlotService();


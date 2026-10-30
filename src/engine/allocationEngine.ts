import {
  CandidateProfile,
  JobRole,
  RoleMatchScoreBreakdown,
  HrRankingWeights,
} from '../types/matching';
import { CityVacancy, CityDistanceRecommendation } from '../types/location';
import {
  JobAllocation,
  AllocationDecision,
  AllocationAuditLog,
  AlternativeCityOffer,
} from '../types/allocation';
import { WaitlistEntry } from '../types/waitlist';
import { evaluateCandidateRoleMatch } from './matchingEngine';
import { rankCandidateWithRules, DEFAULT_HR_RANKING_WEIGHTS } from './rankingEngine';
import { isCityAvailableForAllocation, calculateAvailableCapacity, determineVacancyStatus } from './vacancyTracker';
import { recommendAlternativeCitiesForCandidate, createAlternativeOffer } from './alternativeCityManager';
import { enrollCandidateInWaitlist } from './waitlistManager';
import { createAuditLogEntry } from './auditLogger';

export interface AllocationContext {
  candidate: CandidateProfile;
  job: JobRole;
  vacancies: CityVacancy[];
  existingAllocations: JobAllocation[];
  rankingWeights?: HrRankingWeights;
}

export interface AllocationExecutionResult {
  success: boolean;
  allocation?: JobAllocation;
  alternativeOffer?: AlternativeCityOffer;
  waitlistEntry?: WaitlistEntry;
  updatedVacancies: CityVacancy[];
  auditLog: AllocationAuditLog;
  decision: AllocationDecision;
  errorMessage?: string;
}

/**
 * Core transactional allocation engine.
 * Implements:
 * - Preferred-location-first allocation
 * - Strict full-city rejection (Never assign to a full city)
 * - Duplicate allocation prevention
 * - Concurrency state mutation safety
 * - Haversine nearest-city overflow recommendation
 * - Future-date and location waitlist fallback
 * - Full explainability audit trail
 */
export function runAllocationForCandidate(
  context: AllocationContext
): AllocationExecutionResult {
  const { candidate, job, existingAllocations } = context;
  const vacancies = context.vacancies.map((v) => ({ ...v })); // Shallow copy to mutate safely in transaction
  const weights = context.rankingWeights || DEFAULT_HR_RANKING_WEIGHTS;

  const now = new Date().toISOString();

  // 1. PREVENT DUPLICATE ALLOCATIONS
  const activeExisting = existingAllocations.find(
    (a) =>
      a.candidateId === candidate.id &&
      a.jobId === job.id &&
      ['ALLOCATED', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_ACCEPTED'].includes(a.status)
  );

  if (activeExisting) {
    const errorMsg = `Duplicate allocation prevented: Candidate "${candidate.fullName}" already has an active allocation for job "${job.title}" (Status: ${activeExisting.status}, City: ${activeExisting.allocatedCityName || 'Pending'}).`;
    const auditLog = createAuditLogEntry({
      allocationId: activeExisting.id,
      candidateId: candidate.id,
      jobId: job.id,
      action: 'ALLOCATION_BLOCKED_DUPLICATE',
      toStatus: activeExisting.status,
      actor: 'SYSTEM_ALLOCATOR',
      reason: errorMsg,
    });

    return {
      success: false,
      errorMessage: errorMsg,
      updatedVacancies: vacancies,
      auditLog,
      decision: {
        type: 'PREFERRED_LOCATION_MATCH',
        isAlternative: false,
        explanation: errorMsg,
        factors: {
          matchScore: activeExisting.matchScore,
          vacancyRemainingBeforeAllocation: 0,
          haversineApplied: false,
        },
      },
    };
  }

  // 2. EXPLAINABLE ROLE MATCHING & ELIGIBILITY EVALUATION
  const matchEvaluation = evaluateCandidateRoleMatch(candidate, job);
  const rankingResult = rankCandidateWithRules(candidate, matchEvaluation, weights);

  // If candidate is severely ineligible for the job role baseline
  if (!matchEvaluation.eligibility.isEligible && matchEvaluation.overallScore < weights.minEligibilityThreshold) {
    const ineligibilityReason = `Candidate did not meet role threshold (Score: ${matchEvaluation.overallScore}%, Min: ${weights.minEligibilityThreshold}%). Reasons: ${matchEvaluation.eligibility.ineligibilityReasons.join('; ')}`;
    
    const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const auditLog = createAuditLogEntry({
      allocationId,
      candidateId: candidate.id,
      jobId: job.id,
      action: 'ALLOCATION_REJECTED_INELIGIBLE',
      toStatus: 'CANCELLED',
      actor: 'SYSTEM_ALLOCATOR',
      reason: ineligibilityReason,
      metadata: { matchEvaluation },
    });

    return {
      success: false,
      errorMessage: ineligibilityReason,
      updatedVacancies: vacancies,
      auditLog,
      decision: {
        type: 'INELIGIBLE_FOR_ROLE',
        isAlternative: false,
        explanation: ineligibilityReason,
        factors: {
          matchScore: matchEvaluation.overallScore,
          vacancyRemainingBeforeAllocation: 0,
          haversineApplied: false,
        },
      },
    };
  }

  // 3. PREFERRED-LOCATION-FIRST ALLOCATION STRATEGY
  const candidatePreferredCities = candidate.preferredCities || [];
  let allocatedVacancy: CityVacancy | null = null;
  let matchedPreferenceRank: number | null = null;

  for (let i = 0; i < candidatePreferredCities.length; i++) {
    const prefName = candidatePreferredCities[i].toLowerCase().trim();
    const foundVacancy = vacancies.find(
      (v) => v.cityName.toLowerCase().trim() === prefName
    );

    // Strict requirement: Never assign a candidate to a full city
    if (foundVacancy && isCityAvailableForAllocation(foundVacancy)) {
      allocatedVacancy = foundVacancy;
      matchedPreferenceRank = i + 1;
      break;
    }
  }

  // CASE A: Successfully matched to a preferred location with open capacity
  if (allocatedVacancy && matchedPreferenceRank !== null) {
    const vacancyIndex = vacancies.findIndex((v) => v.id === allocatedVacancy!.id);
    const prevAvailable = allocatedVacancy.availableCapacity;

    // Transactional atomic increment
    vacancies[vacancyIndex].allocatedCount += 1;
    vacancies[vacancyIndex].availableCapacity = calculateAvailableCapacity(
      vacancies[vacancyIndex].totalCapacity,
      vacancies[vacancyIndex].allocatedCount,
      vacancies[vacancyIndex].reservedCount
    );
    vacancies[vacancyIndex].status = determineVacancyStatus(
      vacancies[vacancyIndex].totalCapacity,
      vacancies[vacancyIndex].allocatedCount,
      vacancies[vacancyIndex].reservedCount
    );
    vacancies[vacancyIndex].updatedAt = now;

    const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const explanation = `Direct allocation to candidate's #${matchedPreferenceRank} preferred location (${allocatedVacancy.cityName}). Candidate qualified with ${matchEvaluation.overallScore}% role match and ${rankingResult.finalRankScore} rank score. Capacity remaining: ${vacancies[vacancyIndex].availableCapacity}.`;

    const allocation: JobAllocation = {
      id: allocationId,
      candidateId: candidate.id,
      candidateName: candidate.fullName,
      jobId: job.id,
      jobTitle: job.title,
      allocatedCityId: allocatedVacancy.cityId,
      allocatedCityName: allocatedVacancy.cityName,
      status: 'ALLOCATED',
      matchScore: matchEvaluation.overallScore,
      decisionExplanation: explanation,
      isAlternativeOffer: false,
      allocatedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    const auditLog = createAuditLogEntry({
      allocationId,
      candidateId: candidate.id,
      jobId: job.id,
      action: 'ALLOCATION_CONFIRMED',
      fromStatus: 'PENDING',
      toStatus: 'ALLOCATED',
      actor: 'SYSTEM_ALLOCATOR',
      reason: explanation,
      metadata: {
        preferenceRank: matchedPreferenceRank,
        city: allocatedVacancy.cityName,
        capacityBefore: prevAvailable,
        capacityAfter: vacancies[vacancyIndex].availableCapacity,
        rankingScore: rankingResult.finalRankScore,
      },
    });

    return {
      success: true,
      allocation,
      updatedVacancies: vacancies,
      auditLog,
      decision: {
        type: matchedPreferenceRank === 1 ? 'PREFERRED_LOCATION_MATCH' : 'SECONDARY_LOCATION_MATCH',
        assignedCity: allocatedVacancy.cityName,
        assignedCityId: allocatedVacancy.cityId,
        isAlternative: false,
        explanation,
        factors: {
          preferenceRankMatched: matchedPreferenceRank,
          matchScore: matchEvaluation.overallScore,
          vacancyRemainingBeforeAllocation: prevAvailable,
          haversineApplied: false,
        },
      },
    };
  }

  // CASE B: OVERFLOW MANAGEMENT - ALL PREFERRED LOCATIONS ARE FULL OR NONE SPECIFIED
  // Use Haversine formula to find nearest available non-full city
  const nearestRecommendations = recommendAlternativeCitiesForCandidate(
    candidate,
    vacancies,
    undefined,
    3
  );

  if (nearestRecommendations.length > 0 && candidate.willingToRelocate) {
    const bestAlternative = nearestRecommendations[0];
    const altVacancyIndex = vacancies.findIndex((v) => v.cityId === bestAlternative.cityId);

    if (altVacancyIndex !== -1 && vacancies[altVacancyIndex].availableCapacity > 0) {
      // Tentatively reserve seat in alternative city to guarantee capacity during candidate review
      vacancies[altVacancyIndex].reservedCount += 1;
      vacancies[altVacancyIndex].availableCapacity = calculateAvailableCapacity(
        vacancies[altVacancyIndex].totalCapacity,
        vacancies[altVacancyIndex].allocatedCount,
        vacancies[altVacancyIndex].reservedCount
      );
      vacancies[altVacancyIndex].status = determineVacancyStatus(
        vacancies[altVacancyIndex].totalCapacity,
        vacancies[altVacancyIndex].allocatedCount,
        vacancies[altVacancyIndex].reservedCount
      );
      vacancies[altVacancyIndex].updatedAt = now;

      const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const alternativeOffer = createAlternativeOffer(
        allocationId,
        candidate,
        job.id,
        bestAlternative,
        48 // 48-hour reservation hold
      );

      const explanation = `Preferred cities [${candidatePreferredCities.join(', ')}] have reached full capacity. Recommended nearest city (${bestAlternative.cityName}, ${bestAlternative.distanceKm} km away) using Haversine calculation. Reserved temporary seat pending candidate acceptance.`;

      const allocation: JobAllocation = {
        id: allocationId,
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        jobId: job.id,
        jobTitle: job.title,
        status: 'OFFERED_ALTERNATIVE',
        matchScore: matchEvaluation.overallScore,
        decisionExplanation: explanation,
        isAlternativeOffer: true,
        alternativeOfferedCityId: bestAlternative.cityId,
        alternativeOfferedCityName: bestAlternative.cityName,
        offerExpiresAt: alternativeOffer.expiresAt,
        createdAt: now,
        updatedAt: now,
      };

      const auditLog = createAuditLogEntry({
        allocationId,
        candidateId: candidate.id,
        jobId: job.id,
        action: 'ALTERNATIVE_OFFER_DISPATCHED',
        fromStatus: 'PENDING',
        toStatus: 'OFFERED_ALTERNATIVE',
        actor: 'SYSTEM_ALLOCATOR',
        reason: explanation,
        metadata: {
          distanceKm: bestAlternative.distanceKm,
          offeredCity: bestAlternative.cityName,
          expiresAt: alternativeOffer.expiresAt,
        },
      });

      return {
        success: true,
        allocation,
        alternativeOffer,
        updatedVacancies: vacancies,
        auditLog,
        decision: {
          type: 'OVERFLOW_ALTERNATIVE_OFFER',
          assignedCity: bestAlternative.cityName,
          assignedCityId: bestAlternative.cityId,
          isAlternative: true,
          explanation,
          factors: {
            matchScore: matchEvaluation.overallScore,
            vacancyRemainingBeforeAllocation: bestAlternative.availableCapacity,
            distanceKmFromCandidate: bestAlternative.distanceKm,
            haversineApplied: true,
          },
        },
      };
    }
  }

  // CASE C: NO CITIES AVAILABLE OR CANDIDATE UNWILLING TO RELOCATE -> ENROLL IN WAITLIST
  const topPrefCityName = candidatePreferredCities[0] || 'Primary Hub';
  const matchedCity = vacancies.find(
    (v) => v.cityName.toLowerCase().trim() === topPrefCityName.toLowerCase().trim()
  );
  const preferredCityId = matchedCity?.cityId || 'default-hub';

  const waitlistReason = candidatePreferredCities.length > 0
    ? `All preferred cities [${candidatePreferredCities.join(', ')}] are at maximum capacity. Placed on waitlist for future vacancies.`
    : `No location vacancies currently open. Waitlisted for next expansion batch.`;

  const waitlistEntry = enrollCandidateInWaitlist(
    candidate,
    job.id,
    job.title,
    preferredCityId,
    topPrefCityName,
    matchEvaluation.overallScore,
    waitlistReason
  );

  const allocationId = `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const allocation: JobAllocation = {
    id: allocationId,
    candidateId: candidate.id,
    candidateName: candidate.fullName,
    jobId: job.id,
    jobTitle: job.title,
    status: 'WAITLISTED',
    matchScore: matchEvaluation.overallScore,
    decisionExplanation: waitlistReason,
    isAlternativeOffer: false,
    createdAt: now,
    updatedAt: now,
  };

  const auditLog = createAuditLogEntry({
    allocationId,
    candidateId: candidate.id,
    jobId: job.id,
    action: 'WAITLIST_ENROLLED',
    fromStatus: 'PENDING',
    toStatus: 'WAITLISTED',
    actor: 'SYSTEM_ALLOCATOR',
    reason: waitlistReason,
    metadata: {
      waitlistEntryId: waitlistEntry.id,
      priorityScore: waitlistEntry.priorityScore,
      availableFrom: candidate.availableFrom,
    },
  });

  return {
    success: true,
    allocation,
    waitlistEntry,
    updatedVacancies: vacancies,
    auditLog,
    decision: {
      type: 'WAITLISTED_ALL_LOCATIONS_FULL',
      isAlternative: false,
      explanation: waitlistReason,
      factors: {
        matchScore: matchEvaluation.overallScore,
        vacancyRemainingBeforeAllocation: 0,
        haversineApplied: false,
      },
    },
  };
}


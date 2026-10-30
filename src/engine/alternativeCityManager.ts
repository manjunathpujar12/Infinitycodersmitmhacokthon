import { Coordinates, CityVacancy, CityDistanceRecommendation } from '../types/location';
import { AlternativeCityOffer, JobAllocation } from '../types/allocation';
import { calculateHaversineDistanceKm, getNearestAvailableCities } from '../lib/haversine';
import { CandidateProfile } from '../types/matching';

/**
 * Recommends nearest available cities when candidate's preferred location is unavailable or full.
 * Uses Haversine distance from candidate's current coordinates (or 1st preferred city coords).
 */
export function recommendAlternativeCitiesForCandidate(
  candidate: CandidateProfile,
  allVacancies: CityVacancy[],
  referenceCoordinates?: Coordinates,
  maxResults: number = 3
): CityDistanceRecommendation[] {
  // Use candidate's current coordinates if available, otherwise fallback to reference coordinates
  const origin: Coordinates = candidate.currentCoordinates || referenceCoordinates || {
    latitude: 12.9716, // Default Bangalore center if completely unspecified
    longitude: 77.5946,
  };

  // Filter out any city with 0 available seats
  const availableVacancies = allVacancies.filter((v) => v.availableCapacity > 0);

  return getNearestAvailableCities(
    origin,
    availableVacancies,
    candidate.preferredCities,
    maxResults
  );
}

/**
 * Generates an alternative city offer with a temporary reservation hold
 */
export function createAlternativeOffer(
  allocationId: string,
  candidate: CandidateProfile,
  jobId: string,
  recommendedCity: CityDistanceRecommendation,
  holdDurationHours: number = 48
): AlternativeCityOffer {
  const expiresAt = new Date(Date.now() + holdDurationHours * 3600 * 1000).toISOString();

  return {
    allocationId,
    candidateId: candidate.id,
    jobId,
    offeredCityId: recommendedCity.cityId,
    offeredCityName: recommendedCity.cityName,
    originalPreferredCities: candidate.preferredCities,
    distanceKm: recommendedCity.distanceKm,
    reason: `Preferred location was full. Offered nearest open city (${recommendedCity.cityName}, ${recommendedCity.distanceKm} km away) with guaranteed vacancy.`,
    expiresAt,
    status: 'PENDING',
  };
}

export interface OfferDecisionResult {
  allocation: JobAllocation;
  offer: AlternativeCityOffer;
  actionTaken: 'CONFIRMED_SEAT' | 'RELEASED_SEAT_OFFERED_WAITLIST';
  message: string;
}

/**
 * Handles candidate response (Acceptance or Rejection) to an alternative city offer
 */
export function handleCandidateAlternativeOfferResponse(
  allocation: JobAllocation,
  offer: AlternativeCityOffer,
  accepted: boolean,
  candidateReason?: string
): OfferDecisionResult {
  const now = new Date().toISOString();

  if (accepted) {
    const updatedAllocation: JobAllocation = {
      ...allocation,
      status: 'ALTERNATIVE_ACCEPTED',
      allocatedCityId: offer.offeredCityId,
      allocatedCityName: offer.offeredCityName,
      isAlternativeOffer: true,
      allocatedAt: now,
      updatedAt: now,
      decisionExplanation: `Candidate accepted alternative city assignment: ${offer.offeredCityName} (${offer.distanceKm} km from origin). Original preferred cities: [${offer.originalPreferredCities.join(', ')}].`,
    };

    const updatedOffer: AlternativeCityOffer = {
      ...offer,
      status: 'ACCEPTED',
    };

    return {
      allocation: updatedAllocation,
      offer: updatedOffer,
      actionTaken: 'CONFIRMED_SEAT',
      message: `Candidate accepted offer for ${offer.offeredCityName}. Seat confirmed.`,
    };
  } else {
    const updatedAllocation: JobAllocation = {
      ...allocation,
      status: 'ALTERNATIVE_REJECTED',
      updatedAt: now,
      decisionExplanation: `Candidate declined alternative offer for ${offer.offeredCityName}${candidateReason ? `: ${candidateReason}` : ''}. Candidate queued for preferred location waitlist.`,
    };

    const updatedOffer: AlternativeCityOffer = {
      ...offer,
      status: 'REJECTED',
    };

    return {
      allocation: updatedAllocation,
      offer: updatedOffer,
      actionTaken: 'RELEASED_SEAT_OFFERED_WAITLIST',
      message: `Candidate declined alternative offer. Reserved seat in ${offer.offeredCityName} released back to vacancy pool. Candidate eligible for waitlist.`,
    };
  }
}


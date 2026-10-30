import { Coordinates, CityVacancy, CityDistanceRecommendation } from '../types/location';

const EARTH_RADIUS_KM = 6371;

/**
 * Converts degrees to radians
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Computes great-circle distance between two geographic coordinates using the Haversine formula.
 * Formula:
 *   a = sin²(Δφ/2) + cos(φ1) * cos(φ2) * sin²(Δλ/2)
 *   c = 2 * atan2(√a, √(1−a))
 *   d = R * c
 *
 * @param coord1 Origin coordinate (lat, lon)
 * @param coord2 Destination coordinate (lat, lon)
 * @returns Distance in kilometers, rounded to 2 decimal places
 */
export function calculateHaversineDistanceKm(
  coord1: Coordinates,
  coord2: Coordinates
): number {
  if (
    coord1.latitude === coord2.latitude &&
    coord1.longitude === coord2.longitude
  ) {
    return 0;
  }

  const dLat = toRadians(coord2.latitude - coord1.latitude);
  const dLon = toRadians(coord2.longitude - coord1.longitude);

  const lat1 = toRadians(coord1.latitude);
  const lat2 = toRadians(coord2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Safe clamping to avoid floating precision Math.sqrt negative domain
  const clampedA = Math.min(1, Math.max(0, a));
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 100) / 100;
}

/**
 * Finds and ranks available cities by proximity using the Haversine formula.
 * Filters out cities with 0 available capacity (Never assign a candidate to a full city).
 *
 * @param origin Candidate's coordinate or preferred city's coordinate
 * @param vacancies All city vacancies for the job
 * @param preferredCities Ordered list of candidate's preferred city names
 * @param maxRecommendations Maximum recommendations to return (default 5)
 */
export function getNearestAvailableCities(
  origin: Coordinates,
  vacancies: CityVacancy[],
  preferredCities: string[] = [],
  maxRecommendations: number = 5
): CityDistanceRecommendation[] {
  // REQUIREMENT: Never assign a candidate to a full city
  const availableVacancies = vacancies.filter((v) => v.availableCapacity > 0);

  const recommendations: CityDistanceRecommendation[] = availableVacancies.map(
    (vacancy) => {
      const distance = calculateHaversineDistanceKm(origin, vacancy.coordinates);
      const prefIndex = preferredCities.findIndex(
        (p) => p.toLowerCase().trim() === vacancy.cityName.toLowerCase().trim()
      );
      const isPreferred = prefIndex !== -1;

      return {
        cityId: vacancy.cityId,
        cityName: vacancy.cityName,
        distanceKm: distance,
        availableCapacity: vacancy.availableCapacity,
        coordinates: vacancy.coordinates,
        isPreferred,
        preferenceRank: isPreferred ? prefIndex + 1 : undefined,
        recommendationReason: isPreferred
          ? `Preferred location (Choice #${prefIndex + 1}) with ${vacancy.availableCapacity} vacancy remaining.`
          : `Nearest alternative with open capacity: ${distance} km away (${vacancy.availableCapacity} seats remaining).`,
      };
    }
  );

  // Sort primarily by preference rank (if preferred), then by geographic proximity (distance ascending)
  return recommendations
    .sort((a, b) => {
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      if (a.isPreferred && b.isPreferred) {
        return (a.preferenceRank || 99) - (b.preferenceRank || 99);
      }
      return a.distanceKm - b.distanceKm;
    })
    .slice(0, maxRecommendations);
}


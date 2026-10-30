// ============================================================================
// HireSlot Core Architecture: Domain Types for Location, Capacity & Geo
// ============================================================================

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface CityLocation {
  id: string;
  cityName: string;
  state: string;
  country: string;
  coordinates: Coordinates;
  timezone?: string;
  tier?: 1 | 2 | 3;
}

export interface CityVacancy {
  id: string;
  jobId: string;
  cityId: string;
  cityName: string;
  totalCapacity: number;
  allocatedCount: number;
  reservedCount: number; // Temporarily reserved for pending alternative offers
  availableCapacity: number; // totalCapacity - (allocatedCount + reservedCount)
  status: 'AVAILABLE' | 'LIMITED' | 'FULL';
  coordinates: Coordinates;
  updatedAt: string;
}

export interface CityDistanceRecommendation {
  cityId: string;
  cityName: string;
  distanceKm: number;
  availableCapacity: number;
  coordinates: Coordinates;
  isPreferred: boolean;
  preferenceRank?: number; // 1 for first choice, 2 for second, etc.
  recommendationReason: string;
}


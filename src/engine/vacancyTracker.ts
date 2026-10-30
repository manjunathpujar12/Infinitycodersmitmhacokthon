import { CityVacancy } from '../types/location';

/**
 * Calculates remaining available capacity for a city vacancy record.
 * availableCapacity = totalCapacity - (allocatedCount + reservedCount)
 */
export function calculateAvailableCapacity(
  totalCapacity: number,
  allocatedCount: number,
  reservedCount: number = 0
): number {
  const remaining = totalCapacity - (allocatedCount + reservedCount);
  return Math.max(0, remaining);
}

/**
 * Derives operational status based on capacity thresholds:
 * - FULL: 0 available capacity remaining
 * - LIMITED: Available capacity <= 20% of total
 * - AVAILABLE: Healthy buffer remaining
 */
export function determineVacancyStatus(
  totalCapacity: number,
  allocatedCount: number,
  reservedCount: number = 0
): 'AVAILABLE' | 'LIMITED' | 'FULL' {
  const remaining = calculateAvailableCapacity(totalCapacity, allocatedCount, reservedCount);
  if (remaining <= 0) return 'FULL';
  if (remaining <= Math.ceil(totalCapacity * 0.2)) return 'LIMITED';
  return 'AVAILABLE';
}

/**
 * Strict verification check: Ensures no candidate is ever assigned to a full city.
 */
export function isCityAvailableForAllocation(vacancy: CityVacancy): boolean {
  const available = calculateAvailableCapacity(
    vacancy.totalCapacity,
    vacancy.allocatedCount,
    vacancy.reservedCount
  );
  return available > 0 && vacancy.status !== 'FULL';
}

/**
 * Validates whether an allocation or reservation attempt can proceed safely.
 */
export function validateAllocationSafety(
  vacancy: CityVacancy,
  additionalCount: number = 1
): { allowed: boolean; errorReason?: string; remainingAfter?: number } {
  const available = calculateAvailableCapacity(
    vacancy.totalCapacity,
    vacancy.allocatedCount,
    vacancy.reservedCount
  );

  if (available <= 0) {
    return {
      allowed: false,
      errorReason: `Target city "${vacancy.cityName}" has zero capacity available (Capacity: ${vacancy.totalCapacity}, Allocated: ${vacancy.allocatedCount}, Reserved: ${vacancy.reservedCount}). Never assign a candidate to a full city.`,
      remainingAfter: 0,
    };
  }

  if (available < additionalCount) {
    return {
      allowed: false,
      errorReason: `Insufficient capacity in "${vacancy.cityName}". Requested: ${additionalCount}, Available: ${available}.`,
      remainingAfter: available,
    };
  }

  return {
    allowed: true,
    remainingAfter: available - additionalCount,
  };
}

export interface VacancyCapacitySummary {
  jobId: string;
  totalCapacity: number;
  totalAllocated: number;
  totalReserved: number;
  totalAvailable: number;
  utilizationPercentage: number;
  fullCitiesCount: number;
  openCitiesCount: number;
}

/**
 * Summarizes multi-city vacancy metrics for HR dashboards and allocation overview
 */
export function summarizeCityVacancies(
  jobId: string,
  vacancies: CityVacancy[]
): VacancyCapacitySummary {
  let totalCapacity = 0;
  let totalAllocated = 0;
  let totalReserved = 0;
  let fullCitiesCount = 0;
  let openCitiesCount = 0;

  for (const v of vacancies) {
    totalCapacity += v.totalCapacity;
    totalAllocated += v.allocatedCount;
    totalReserved += v.reservedCount;
    if (v.availableCapacity <= 0 || v.status === 'FULL') {
      fullCitiesCount++;
    } else {
      openCitiesCount++;
    }
  }

  const totalAvailable = Math.max(0, totalCapacity - (totalAllocated + totalReserved));
  const utilizationPercentage =
    totalCapacity > 0
      ? Math.round(((totalAllocated + totalReserved) / totalCapacity) * 100)
      : 100;

  return {
    jobId,
    totalCapacity,
    totalAllocated,
    totalReserved,
    totalAvailable,
    utilizationPercentage,
    fullCitiesCount,
    openCitiesCount,
  };
}


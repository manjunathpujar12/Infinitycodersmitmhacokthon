import { describe, it, expect } from 'vitest';
import { calculateHaversineDistanceKm, getNearestAvailableCities } from '../lib/haversine';
import { CityVacancy } from '../types/location';

describe('Haversine Distance & Proximity Recommendations', () => {
  const blrCoords = { latitude: 12.9716, longitude: 77.5946 }; // Bengaluru
  const chnCoords = { latitude: 13.0827, longitude: 80.2707 }; // Chennai
  const hydCoords = { latitude: 17.3850, longitude: 78.4867 }; // Hyderabad
  const mumCoords = { latitude: 19.0760, longitude: 72.8777 }; // Mumbai

  it('calculates 0 km distance between identical points', () => {
    expect(calculateHaversineDistanceKm(blrCoords, blrCoords)).toBe(0);
  });

  it('accurately computes great-circle distance between Indian metro cities', () => {
    const distBlrToChn = calculateHaversineDistanceKm(blrCoords, chnCoords);
    // Real approximate straight-line distance is ~290 km
    expect(distBlrToChn).toBeGreaterThan(280);
    expect(distBlrToChn).toBeLessThan(300);

    const distBlrToHyd = calculateHaversineDistanceKm(blrCoords, hydCoords);
    // Real approximate distance is ~500 km
    expect(distBlrToHyd).toBeGreaterThan(480);
    expect(distBlrToHyd).toBeLessThan(510);
  });

  it('ranks available cities by proximity and strictly filters out full cities', () => {
    const vacancies: CityVacancy[] = [
      {
        id: 'v1',
        jobId: 'j1',
        cityId: 'c-chn',
        cityName: 'Chennai',
        totalCapacity: 5,
        allocatedCount: 5,
        reservedCount: 0,
        availableCapacity: 0, // FULL
        status: 'FULL',
        coordinates: chnCoords,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v2',
        jobId: 'j1',
        cityId: 'c-hyd',
        cityName: 'Hyderabad',
        totalCapacity: 5,
        allocatedCount: 2,
        reservedCount: 0,
        availableCapacity: 3, // AVAILABLE (~500 km)
        status: 'AVAILABLE',
        coordinates: hydCoords,
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'v3',
        jobId: 'j1',
        cityId: 'c-mum',
        cityName: 'Mumbai',
        totalCapacity: 5,
        allocatedCount: 1,
        reservedCount: 0,
        availableCapacity: 4, // AVAILABLE (~840 km)
        status: 'AVAILABLE',
        coordinates: mumCoords,
        updatedAt: new Date().toISOString(),
      },
    ];

    const recommendations = getNearestAvailableCities(blrCoords, vacancies, [], 5);

    // Strict Rule: Never include a city with 0 available capacity (Chennai is full)
    const chennaiIncluded = recommendations.some((r) => r.cityName === 'Chennai');
    expect(chennaiIncluded).toBe(false);

    // Nearest available should be Hyderabad, followed by Mumbai
    expect(recommendations.length).toBe(2);
    expect(recommendations[0].cityName).toBe('Hyderabad');
    expect(recommendations[1].cityName).toBe('Mumbai');
    expect(recommendations[0].distanceKm).toBeLessThan(recommendations[1].distanceKm);
  });
});


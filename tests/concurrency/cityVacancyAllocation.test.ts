import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

/**
 * City Vacancy Allocation Concurrency Suite
 * Validates atomic city-wise quota allocations under concurrent demand
 */

interface CityVacancyState {
  jobOpeningId: string;
  locationId: string;
  totalCapacity: number;
  allocatedCount: number;
}

class SimulatedVacancyEngine {
  private vacancy: CityVacancyState;
  private isLocked: boolean = false;

  constructor(jobOpeningId: string, locationId: string, totalCapacity: number) {
    this.vacancy = {
      jobOpeningId,
      locationId,
      totalCapacity,
      allocatedCount: 0,
    };
  }

  getState() {
    return { ...this.vacancy };
  }

  async allocateVacancyAtomic(count: number = 1): Promise<{ success: boolean; remaining: number; error?: string }> {
    while (this.isLocked) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.isLocked = true;

    try {
      if (this.vacancy.allocatedCount + count > this.vacancy.totalCapacity) {
        return {
          success: false,
          remaining: this.vacancy.totalCapacity - this.vacancy.allocatedCount,
          error: `Capacity exceeded. Total: ${this.vacancy.totalCapacity}, Allocated: ${this.vacancy.allocatedCount}`,
        };
      }

      this.vacancy.allocatedCount += count;
      return {
        success: true,
        remaining: this.vacancy.totalCapacity - this.vacancy.allocatedCount,
      };
    } finally {
      this.isLocked = false;
    }
  }
}

describe('City Vacancy Quota Concurrency', () => {
  it('guarantees atomic quota limits during 15 concurrent single-vacancy allocations', async () => {
    // Vacancy quota of 5 for Austin location
    const engine = new SimulatedVacancyEngine('job-eng-lead', 'loc-austin', 5);

    // 15 parallel requests
    const requests = Array.from({ length: 15 }, () => engine.allocateVacancyAtomic(1));
    const results = await Promise.all(requests);

    const successful = results.filter((r) => r.success);
    const rejected = results.filter((r) => !r.success);

    // Invariant: Exactly 5 succeed, 10 rejected
    assert.equal(successful.length, 5);
    assert.equal(rejected.length, 10);

    // Final state check
    const finalState = engine.getState();
    assert.equal(finalState.allocatedCount, 5);
    assert.equal(finalState.totalCapacity - finalState.allocatedCount, 0);
  });
});

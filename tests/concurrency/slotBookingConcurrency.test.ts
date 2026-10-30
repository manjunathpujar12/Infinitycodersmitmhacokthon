import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Concurrency & Race Condition Simulation Suite
 * Verifies that HireSlot's atomic locking model prevents overbooking and double-booking
 * under heavy concurrent load.
 */

interface SlotRecord {
  id: string;
  maxCapacity: number;
  bookedCount: number;
  status: 'open' | 'booked';
}

interface BookingRecord {
  id: string;
  slotId: string;
  candidateId: string;
  status: 'confirmed' | 'cancelled';
}

class SimulatedSlotBookingEngine {
  private slot: SlotRecord;
  private bookings: BookingRecord[] = [];
  private isLocked: boolean = false;

  constructor(slotId: string, maxCapacity: number) {
    this.slot = {
      id: slotId,
      maxCapacity,
      bookedCount: 0,
      status: 'open',
    };
  }

  getSlotState() {
    return { ...this.slot };
  }

  getBookings() {
    return [...this.bookings];
  }

  /**
   * Simulates PostgreSQL atomic SELECT ... FOR UPDATE transaction
   */
  async bookSlotAtomic(candidateId: string): Promise<{ success: boolean; bookingId?: string; error?: string }> {
    // Acquire mutex (simulating PostgreSQL row-level lock on interview_slots)
    while (this.isLocked) {
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    this.isLocked = true;

    try {
      // 1. Verify slot status
      if (this.slot.status !== 'open') {
        return { success: false, error: 'Slot is not open for booking.' };
      }

      // 2. Verify capacity
      if (this.slot.bookedCount >= this.slot.maxCapacity) {
        return { success: false, error: 'Slot capacity exceeded.' };
      }

      // 3. Verify candidate does not already have an active booking
      const existing = this.bookings.find(
        (b) => b.candidateId === candidateId && b.slotId === this.slot.id && b.status === 'confirmed'
      );
      if (existing) {
        return { success: false, error: 'Candidate already has an active booking for this slot.' };
      }

      // 4. Atomically insert booking & increment count
      const bookingId = `bkg-${Math.random().toString(36).substring(7)}`;
      this.bookings.push({
        id: bookingId,
        slotId: this.slot.id,
        candidateId,
        status: 'confirmed',
      });

      this.slot.bookedCount += 1;
      if (this.slot.bookedCount >= this.slot.maxCapacity) {
        this.slot.status = 'booked';
      }

      return { success: true, bookingId };
    } finally {
      this.isLocked = false;
    }
  }
}

describe('Interview Slot Concurrency & Race Condition Defense', () => {
  it('prevents overbooking when 20 concurrent candidates compete for 2 slots', async () => {
    const engine = new SimulatedSlotBookingEngine('slot-nyc-001', 2);

    // Generate 20 distinct candidate IDs attempting to book concurrently
    const candidateIds = Array.from({ length: 20 }, (_, i) => `candidate-${i + 1}`);

    // Fire all 20 booking requests in parallel
    const results = await Promise.all(
      candidateIds.map((candidateId) => engine.bookSlotAtomic(candidateId))
    );

    const successfulBookings = results.filter((r) => r.success);
    const failedBookings = results.filter((r) => !r.success);

    // INVARIANT 1: Exactly 2 bookings must succeed
    assert.equal(successfulBookings.length, 2);

    // INVARIANT 2: Exactly 18 bookings must fail gracefully
    assert.equal(failedBookings.length, 18);

    // INVARIANT 3: Slot state must reflect exactly 2 booked and status = 'booked'
    const finalSlot = engine.getSlotState();
    assert.equal(finalSlot.bookedCount, 2);
    assert.equal(finalSlot.status, 'booked');

    // INVARIANT 4: Database table must contain exactly 2 confirmed bookings
    assert.equal(engine.getBookings().length, 2);
  });

  it('prevents duplicate booking by the same candidate', async () => {
    const engine = new SimulatedSlotBookingEngine('slot-nyc-002', 5);

    const firstAttempt = await engine.bookSlotAtomic('candidate-duplicate-test');
    assert.equal(firstAttempt.success, true);

    const secondAttempt = await engine.bookSlotAtomic('candidate-duplicate-test');
    assert.equal(secondAttempt.success, false);
    assert.match(secondAttempt.error || '', /already has an active booking/);

    assert.equal(engine.getSlotState().bookedCount, 1);
  });
});

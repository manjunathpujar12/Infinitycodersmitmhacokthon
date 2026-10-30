/**
 * Post-Import Integrity and Consistency Validator
 * HireSlot Backend Infrastructure
 */

import {
  TransformedLocation,
  TransformedProfile,
  TransformedJobOpening,
  TransformedCityVacancy,
  TransformedInterviewStage,
  TransformedInterviewSlot,
  TransformedBooking,
  TransformedWaitlist,
  TransformedAttendance,
  TransformedAbsenceCase,
} from './types.js';

export interface IntegrityCheckResult {
  passed: boolean;
  name: string;
  expected: number | string;
  actual: number | string;
  details?: string;
}

export class PostImportValidator {
  /**
   * Validates transformed in-memory data structures prior to database ingestion.
   * Asserts referential integrity, record count fidelity, and capacity invariants.
   */
  static validateInMemoryStructures(data: {
    locations: Map<string, TransformedLocation>;
    profiles: TransformedProfile[];
    jobs: TransformedJobOpening[];
    vacancies: TransformedCityVacancy[];
    stages: TransformedInterviewStage[];
    slots: TransformedInterviewSlot[];
    bookings: TransformedBooking[];
    waitlists: TransformedWaitlist[];
    attendance: TransformedAttendance[];
    absenceCases: TransformedAbsenceCase[];
  }): { allPassed: boolean; results: IntegrityCheckResult[] } {
    const results: IntegrityCheckResult[] = [];

    // 1. Candidate Record Count
    results.push({
      passed: data.profiles.length === 500,
      name: 'Candidate Profile Count',
      expected: 500,
      actual: data.profiles.length,
    });

    // 2. Job Openings Count
    results.push({
      passed: data.jobs.length === 20,
      name: 'Job Openings Count',
      expected: 20,
      actual: data.jobs.length,
    });

    // 3. City Vacancies Count
    results.push({
      passed: data.vacancies.length === 20,
      name: 'City Vacancies Count',
      expected: 20,
      actual: data.vacancies.length,
    });

    // 4. Interview Slots Count
    results.push({
      passed: data.slots.length === 210,
      name: 'Interview Slots Count',
      expected: 210,
      actual: data.slots.length,
    });

    // 5. Total Bookings Count (405 Scheduled + 18 Cancelled)
    results.push({
      passed: data.bookings.length === 423,
      name: 'Interview Bookings Count',
      expected: 423,
      actual: data.bookings.length,
    });

    // 6. Waitlisted Candidates Count
    results.push({
      passed: data.waitlists.length === 40,
      name: 'Waitlist Entries Count',
      expected: 40,
      actual: data.waitlists.length,
    });

    // 7. Attendance Records Count
    results.push({
      passed: data.attendance.length === 405,
      name: 'Attendance Records Count',
      expected: 405,
      actual: data.attendance.length,
    });

    // 8. Absence Cases Count (68 Absent + 30 Rescheduled = 98 total absence/reschedule workflow cases)
    results.push({
      passed: data.absenceCases.length === 98,
      name: 'Absence Cases Count (68 Absent + 30 Rescheduled)',
      expected: 98,
      actual: data.absenceCases.length,
    });

    // 9. Referential Integrity: All bookings must point to an existing slot and candidate
    const slotIdSet = new Set(data.slots.map((s) => s.id));
    const profileIdSet = new Set(data.profiles.map((p) => p.id));
    let orphanBookings = 0;

    for (const b of data.bookings) {
      if (!slotIdSet.has(b.slot_id) || !profileIdSet.has(b.candidate_id)) {
        orphanBookings++;
      }
    }
    results.push({
      passed: orphanBookings === 0,
      name: 'Booking Foreign-Key Integrity (Zero Orphans)',
      expected: 0,
      actual: orphanBookings,
    });

    // 10. Referential Integrity: All attendance records must point to an existing booking
    const bookingIdSet = new Set(data.bookings.map((b) => b.id));
    let orphanAttendance = 0;

    for (const a of data.attendance) {
      if (!bookingIdSet.has(a.booking_id)) {
        orphanAttendance++;
      }
    }
    results.push({
      passed: orphanAttendance === 0,
      name: 'Attendance Booking Integrity (Zero Orphans)',
      expected: 0,
      actual: orphanAttendance,
    });

    // 11. Invariant: Booked count must never exceed slot max capacity
    let overCapacitySlots = 0;
    for (const s of data.slots) {
      if (s.booked_count > s.max_capacity) {
        overCapacitySlots++;
      }
    }
    results.push({
      passed: overCapacitySlots === 0,
      name: 'Slot Capacity Invariant (Zero Overbooking)',
      expected: 0,
      actual: overCapacitySlots,
    });

    // 12. Invariant: Candidate cannot have multiple active bookings for the same slot
    const candidateSlotMap = new Map<string, number>();
    let duplicateCandidateSlots = 0;

    for (const b of data.bookings) {
      if (b.status === 'confirmed') {
        const key = `${b.candidate_id}:${b.slot_id}`;
        const count = (candidateSlotMap.get(key) || 0) + 1;
        candidateSlotMap.set(key, count);
        if (count > 1) duplicateCandidateSlots++;
      }
    }
    results.push({
      passed: duplicateCandidateSlots === 0,
      name: 'Duplicate Candidate Slot Invariant (Zero Duplicates)',
      expected: 0,
      actual: duplicateCandidateSlots,
    });

    const allPassed = results.every((r) => r.passed);
    return { allPassed, results };
  }
}

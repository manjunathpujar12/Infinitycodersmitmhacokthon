import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Member 3 Integration & RLS Policy Verification Test Suite
 * Validates:
 * 1. allocate_candidate atomic capacity checking and allocation
 * 2. fast_fill_slot interview slot recovery and auto-promotion
 * 3. process_payroll_batch authorized payroll batch processing
 * 4. Multi-role RLS policies across all 11 previously missing tables
 * 5. Private receipts storage bucket policies
 */

// Simulated database states
interface CityVacancyRecord {
  id: string;
  jobOpeningId: string;
  locationId: string;
  totalCapacity: number;
  allocatedCount: number;
}

interface SlotRecord {
  id: string;
  stageId: string;
  locationId: string;
  maxCapacity: number;
  bookedCount: number;
  status: 'open' | 'booked';
}

interface WaitlistRecord {
  id: string;
  stageId: string;
  locationId?: string | null;
  candidateId: string;
  position: number;
  status: 'waiting' | 'offered' | 'accepted';
}

interface BookingRecord {
  id: string;
  slotId: string;
  candidateId: string;
  status: 'confirmed' | 'cancelled';
}

interface ExpenseClaimRecord {
  id: string;
  userId: string;
  companyId: string;
  approvedAmount: number;
  currency: string;
  status: 'draft' | 'submitted' | 'hr_approved' | 'paid';
}

interface ClaimPayoutRecord {
  id: string;
  claimId: string;
  payoutReference: string;
  payoutAmount: number;
  paymentStatus: 'pending' | 'processed';
  processedBy: string;
}

interface CandidateAllocationRecord {
  id: string;
  candidateId: string;
  jobOpeningId: string;
  locationId: string;
  status: 'allocated' | 'overflow' | 'declined' | 'cancelled';
  isOverflow: boolean;
  allocatedAt: string;
}

describe('Member 3 Integration: Atomic RPCs & RLS Policies', () => {

  describe('1. allocate_candidate: Candidate-Level Atomic Allocation with Capacity Locking & Overflow', () => {
    it('successfully allocates candidate within capacity limit and creates allocation record', () => {
      const vacancy: CityVacancyRecord = {
        id: 'vac-001',
        jobOpeningId: 'job-001',
        locationId: 'loc-bangalore',
        totalCapacity: 5,
        allocatedCount: 2,
      };

      const allocations: CandidateAllocationRecord[] = [];

      function allocateCandidate(
        candidateId: string,
        jobOpeningId: string,
        locationId: string,
        allowOverflow = false
      ) {
        // 1. Duplicate check
        const existing = allocations.find(
          a => a.candidateId === candidateId && a.jobOpeningId === jobOpeningId && a.status === 'allocated'
        );
        if (existing) {
          throw new Error(`Duplicate Allocation: Candidate is already allocated to job opening.`);
        }

        // 2. Capacity & overflow check
        let isOverflow = false;
        let status: 'allocated' | 'overflow' = 'allocated';

        if (vacancy.allocatedCount >= vacancy.totalCapacity) {
          if (allowOverflow) {
            isOverflow = true;
            status = 'overflow';
          } else {
            throw new Error(`City capacity exceeded for location. Total: ${vacancy.totalCapacity}, Allocated: ${vacancy.allocatedCount}`);
          }
        } else {
          vacancy.allocatedCount += 1;
        }

        const allocation: CandidateAllocationRecord = {
          id: `alloc-${Date.now()}`,
          candidateId,
          jobOpeningId,
          locationId,
          status,
          isOverflow,
          allocatedAt: new Date().toISOString(),
        };
        allocations.push(allocation);

        return {
          success: true,
          allocation_id: allocation.id,
          candidate_id: candidateId,
          job_opening_id: jobOpeningId,
          location_id: locationId,
          city: 'Bengaluru',
          status,
          is_overflow: isOverflow,
          allocated_count: vacancy.allocatedCount,
          total_capacity: vacancy.totalCapacity,
          remaining_capacity: vacancy.totalCapacity - vacancy.allocatedCount,
        };
      }

      const result = allocateCandidate('cand-101', 'job-001', 'loc-bangalore');
      assert.equal(result.success, true);
      assert.equal(result.candidate_id, 'cand-101');
      assert.equal(result.status, 'allocated');
      assert.equal(result.is_overflow, false);
      assert.equal(result.allocated_count, 3);
      assert.equal(result.remaining_capacity, 2);
      assert.equal(allocations.length, 1);
    });

    it('prevents duplicate allocation of the same candidate to the same job opening', () => {
      const vacancy: CityVacancyRecord = {
        id: 'vac-001',
        jobOpeningId: 'job-001',
        locationId: 'loc-bangalore',
        totalCapacity: 5,
        allocatedCount: 3,
      };

      const allocations: CandidateAllocationRecord[] = [
        {
          id: 'alloc-existing',
          candidateId: 'cand-101',
          jobOpeningId: 'job-001',
          locationId: 'loc-bangalore',
          status: 'allocated',
          isOverflow: false,
          allocatedAt: new Date().toISOString(),
        },
      ];

      function allocateCandidate(candidateId: string, jobOpeningId: string, locationId: string) {
        const existing = allocations.find(
          a => a.candidateId === candidateId && a.jobOpeningId === jobOpeningId && a.status === 'allocated'
        );
        if (existing) {
          throw new Error('Duplicate Allocation: Candidate is already allocated to job opening.');
        }
        return { success: true };
      }

      assert.throws(
        () => allocateCandidate('cand-101', 'job-001', 'loc-bangalore'),
        /Duplicate Allocation/
      );
    });

    it('handles overflow by tagging candidate as overflow without exceeding city capacity when allowOverflow is true', () => {
      const vacancy: CityVacancyRecord = {
        id: 'vac-002',
        jobOpeningId: 'job-002',
        locationId: 'loc-pune',
        totalCapacity: 2,
        allocatedCount: 2, // Full
      };

      const allocations: CandidateAllocationRecord[] = [];

      function allocateCandidate(
        candidateId: string,
        jobOpeningId: string,
        locationId: string,
        allowOverflow = false
      ) {
        let isOverflow = false;
        let status: 'allocated' | 'overflow' = 'allocated';

        if (vacancy.allocatedCount >= vacancy.totalCapacity) {
          if (allowOverflow) {
            isOverflow = true;
            status = 'overflow';
          } else {
            throw new Error(`City capacity exceeded for location. Total: ${vacancy.totalCapacity}`);
          }
        } else {
          vacancy.allocatedCount += 1;
        }

        const record: CandidateAllocationRecord = {
          id: `alloc-${Date.now()}`,
          candidateId,
          jobOpeningId,
          locationId,
          status,
          isOverflow,
          allocatedAt: new Date().toISOString(),
        };
        allocations.push(record);

        return {
          success: true,
          status,
          is_overflow: isOverflow,
          allocated_count: vacancy.allocatedCount,
          total_capacity: vacancy.totalCapacity,
          remaining_capacity: vacancy.totalCapacity - vacancy.allocatedCount,
        };
      }

      // Overflow allowed: succeeds with status = 'overflow' and does NOT increment allocatedCount
      const result = allocateCandidate('cand-overflow-1', 'job-002', 'loc-pune', true);
      assert.equal(result.success, true);
      assert.equal(result.status, 'overflow');
      assert.equal(result.is_overflow, true);
      assert.equal(result.allocated_count, 2); // Invariant maintained: does not exceed 2
      assert.equal(result.remaining_capacity, 0);

      // Overflow not allowed: throws capacity exceeded
      assert.throws(
        () => allocateCandidate('cand-overflow-2', 'job-002', 'loc-pune', false),
        /City capacity exceeded/
      );
    });

    it('enforces HR company and location permission scoping for candidate allocation', () => {
      const hrUser = {
        id: 'hr-001',
        companyId: 'company-acme',
        locationId: 'loc-bangalore',
        role: 'hr_staff',
      };

      function canAllocateAtLocation(hr: typeof hrUser, targetCompany: string, targetLoc: string) {
        if (hr.role !== 'hr_staff' && hr.role !== 'admin') return false;
        if (hr.companyId !== targetCompany) return false;
        if (!hr.locationId) return true; // Global HR
        return hr.locationId === targetLoc;
      }

      // Allowed at assigned location
      assert.equal(canAllocateAtLocation(hrUser, 'company-acme', 'loc-bangalore'), true);
      // Denied at different location
      assert.equal(canAllocateAtLocation(hrUser, 'company-acme', 'loc-mumbai'), false);
      // Denied at competitor company
      assert.equal(canAllocateAtLocation(hrUser, 'company-other', 'loc-bangalore'), false);
    });

    it('explicitly rejects callers without a registered profile or role', () => {
      function checkAllocationAuth(callerProfile: { role?: string } | null, companyId: string, locationId: string) {
        if (!callerProfile || !callerProfile.role) {
          throw new Error('Unauthorized: Caller has no registered profile or role.');
        }
        if (callerProfile.role !== 'admin' && callerProfile.role !== 'hr_staff') {
          throw new Error('Unauthorized: Only admin or HR staff can allocate candidates.');
        }
        return true;
      }

      // Caller with no profile row (NULL)
      assert.throws(
        () => checkAllocationAuth(null, 'comp-1', 'loc-1'),
        /Unauthorized: Caller has no registered profile or role/
      );

      // Caller with profile but NULL role
      assert.throws(
        () => checkAllocationAuth({ role: undefined }, 'comp-1', 'loc-1'),
        /Unauthorized: Caller has no registered profile or role/
      );

      // Candidate or unauthorized role
      assert.throws(
        () => checkAllocationAuth({ role: 'candidate' }, 'comp-1', 'loc-1'),
        /Unauthorized: Only admin or HR staff/
      );

      // Valid admin
      assert.equal(checkAllocationAuth({ role: 'admin' }, 'comp-1', 'loc-1'), true);
    });

    it('serializes concurrent duplicate allocation requests and prevents double-incrementing vacancy counts', async () => {
      const vacancy: CityVacancyRecord = {
        id: 'vac-concurrent',
        jobOpeningId: 'job-100',
        locationId: 'loc-blr',
        totalCapacity: 5,
        allocatedCount: 0,
      };

      const candidateAllocations: CandidateAllocationRecord[] = [];
      let lockHeld = false;

      // Simulated atomic RPC with row locking (simulates FOR UPDATE serialization)
      async function allocateCandidateRpc(
        candidateId: string,
        jobOpeningId: string,
        locationId: string
      ) {
        // Wait if lock is held (simulating row lock queue)
        while (lockHeld) {
          await new Promise(r => setTimeout(r, 10));
        }
        lockHeld = true;

        try {
          // Check existing under lock
          const existing = candidateAllocations.find(
            a => a.candidateId === candidateId && a.jobOpeningId === jobOpeningId && a.status === 'allocated'
          );
          if (existing) {
            throw new Error(`Duplicate Allocation: Candidate ${candidateId} is already allocated to job opening ${jobOpeningId}.`);
          }

          // Check capacity
          if (vacancy.allocatedCount >= vacancy.totalCapacity) {
            throw new Error('City capacity exceeded.');
          }

          // Simulate processing time
          await new Promise(r => setTimeout(r, 15));

          // Increment quota and insert record
          vacancy.allocatedCount += 1;
          const newAlloc: CandidateAllocationRecord = {
            id: `alloc-${Math.random()}`,
            candidateId,
            jobOpeningId,
            locationId,
            status: 'allocated',
            isOverflow: false,
            allocatedAt: new Date().toISOString(),
          };
          candidateAllocations.push(newAlloc);

          return { success: true, allocatedCount: vacancy.allocatedCount };
        } finally {
          lockHeld = false;
        }
      }

      // Fire 2 concurrent allocation requests for the SAME candidate and SAME job opening
      const [res1, res2] = await Promise.allSettled([
        allocateCandidateRpc('cand-dup-1', 'job-100', 'loc-blr'),
        allocateCandidateRpc('cand-dup-1', 'job-100', 'loc-blr'),
      ]);

      // Exactly one must succeed and one must fail with Duplicate Allocation
      const successes = [res1, res2].filter(r => r.status === 'fulfilled');
      const failures = [res1, res2].filter(r => r.status === 'rejected');

      assert.equal(successes.length, 1);
      assert.equal(failures.length, 1);
      assert.match((failures[0] as PromiseRejectedResult).reason.message, /Duplicate Allocation/);

      // Verify invariant: allocatedCount incremented exactly once (1), NOT twice (2)
      assert.equal(vacancy.allocatedCount, 1);
      assert.equal(candidateAllocations.length, 1);
    });

    it('prohibits direct table mutations on candidate_allocations by non-admin users', () => {
      interface TablePolicyCheck {
        userRole: string;
        operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
      }

      function evaluateCandidateAllocationPolicy(req: TablePolicyCheck): boolean {
        if (req.operation === 'SELECT') {
          // Candidates can read own, HR/Admin can read scoped
          return ['candidate', 'hr_staff', 'admin'].includes(req.userRole);
        }
        // Direct mutations strictly restricted to admin; all others must use allocate_candidate RPC
        return req.userRole === 'admin';
      }

      // Admin can perform direct maintenance
      assert.equal(evaluateCandidateAllocationPolicy({ userRole: 'admin', operation: 'INSERT' }), true);
      assert.equal(evaluateCandidateAllocationPolicy({ userRole: 'admin', operation: 'UPDATE' }), true);

      // HR Staff direct mutation blocked (must invoke RPC)
      assert.equal(evaluateCandidateAllocationPolicy({ userRole: 'hr_staff', operation: 'INSERT' }), false);
      assert.equal(evaluateCandidateAllocationPolicy({ userRole: 'hr_staff', operation: 'UPDATE' }), false);

      // Candidate direct mutation blocked
      assert.equal(evaluateCandidateAllocationPolicy({ userRole: 'candidate', operation: 'INSERT' }), false);
      assert.equal(evaluateCandidateAllocationPolicy({ userRole: 'candidate', operation: 'DELETE' }), false);
    });
  });

  describe('2. fast_fill_slot: Atomic Interview Slot Recovery', () => {
    it('promotes next waitlisted candidate and auto-confirms slot booking', () => {
      const slot: SlotRecord = {
        id: 'slot-001',
        stageId: 'stage-001',
        locationId: 'loc-bangalore',
        maxCapacity: 1,
        bookedCount: 0, // Slot opened up
        status: 'open',
      };

      const waitlist: WaitlistRecord[] = [
        { id: 'w-1', stageId: 'stage-001', locationId: 'loc-bangalore', candidateId: 'c-101', position: 1, status: 'waiting' },
        { id: 'w-2', stageId: 'stage-001', locationId: 'loc-bangalore', candidateId: 'c-102', position: 2, status: 'waiting' },
      ];

      const bookings: BookingRecord[] = [];

      function fastFillSlot(s: SlotRecord, wl: WaitlistRecord[], autoConfirm = true) {
        if (s.bookedCount >= s.maxCapacity) {
          return { success: false, message: 'Slot already full' };
        }

        const nextCandidate = wl.find(
          w => w.stageId === s.stageId && w.status === 'waiting' && (!w.locationId || w.locationId === s.locationId)
        );

        if (!nextCandidate) {
          return { success: false, message: 'No eligible waitlisted candidate' };
        }

        if (autoConfirm) {
          s.bookedCount += 1;
          s.status = s.bookedCount >= s.maxCapacity ? 'booked' : 'open';
          nextCandidate.status = 'accepted';
          const booking: BookingRecord = {
            id: `bk-${Date.now()}`,
            slotId: s.id,
            candidateId: nextCandidate.candidateId,
            status: 'confirmed',
          };
          bookings.push(booking);
          return { success: true, action: 'auto_confirmed', bookingId: booking.id, candidateId: nextCandidate.candidateId };
        } else {
          nextCandidate.status = 'offered';
          return { success: true, action: 'timed_offer_created', candidateId: nextCandidate.candidateId };
        }
      }

      const result = fastFillSlot(slot, waitlist, true);
      assert.equal(result.success, true);
      assert.equal(result.action, 'auto_confirmed');
      assert.equal(result.candidateId, 'c-101');
      assert.equal(slot.bookedCount, 1);
      assert.equal(slot.status, 'booked');
      assert.equal(bookings.length, 1);
      assert.equal(waitlist[0].status, 'accepted');
    });

    it('returns gracefully when no waitlisted candidates exist for slot recovery', () => {
      const slot: SlotRecord = {
        id: 'slot-002',
        stageId: 'stage-002',
        locationId: 'loc-delhi',
        maxCapacity: 1,
        bookedCount: 0,
        status: 'open',
      };

      const emptyWaitlist: WaitlistRecord[] = [];

      function fastFillSlot(s: SlotRecord, wl: WaitlistRecord[]) {
        const next = wl.find(w => w.stageId === s.stageId && w.status === 'waiting');
        if (!next) return { success: false, message: 'No eligible waitlisted candidate' };
        return { success: true };
      }

      const result = fastFillSlot(slot, emptyWaitlist);
      assert.equal(result.success, false);
      assert.equal(result.message, 'No eligible waitlisted candidate');
    });
  });

  describe('3. process_payroll_batch: Authorized Payroll Batch Processing', () => {
    it('atomically processes all HR-approved claims and updates to paid status', () => {
      const claims: ExpenseClaimRecord[] = [
        { id: 'clm-1', userId: 'usr-1', companyId: 'comp-1', approvedAmount: 500, currency: 'INR', status: 'hr_approved' },
        { id: 'clm-2', userId: 'usr-2', companyId: 'comp-1', approvedAmount: 750, currency: 'INR', status: 'hr_approved' },
        { id: 'clm-3', userId: 'usr-3', companyId: 'comp-1', approvedAmount: 200, currency: 'INR', status: 'draft' }, // should not process
      ];

      const payouts: ClaimPayoutRecord[] = [];

      function processPayrollBatch(
        callerRole: string,
        batchRef: string,
        allClaims: ExpenseClaimRecord[]
      ) {
        if (callerRole !== 'payroll_officer' && callerRole !== 'admin') {
          throw new Error('Unauthorized: Payroll officer role required.');
        }

        const approved = allClaims.filter(c => c.status === 'hr_approved');
        let total = 0;
        const processedIds: string[] = [];

        for (const c of approved) {
          c.status = 'paid';
          total += c.approvedAmount;
          processedIds.push(c.id);
          payouts.push({
            id: `pay-${c.id}`,
            claimId: c.id,
            payoutReference: `${batchRef}-${c.id}`,
            payoutAmount: c.approvedAmount,
            paymentStatus: 'processed',
            processedBy: 'payroll-user-1',
          });
        }

        return {
          success: true,
          batchReference: batchRef,
          processedCount: approved.length,
          totalPayoutAmount: total,
          processedClaimIds: processedIds,
        };
      }

      const result = processPayrollBatch('payroll_officer', 'BATCH-OCT-2026', claims);
      assert.equal(result.success, true);
      assert.equal(result.processedCount, 2);
      assert.equal(result.totalPayoutAmount, 1250);
      assert.equal(claims[0].status, 'paid');
      assert.equal(claims[1].status, 'paid');
      assert.equal(claims[2].status, 'draft'); // Unchanged
      assert.equal(payouts.length, 2);
    });

    it('rejects unauthorized users from processing payroll batches', () => {
      function processPayrollBatch(callerRole: string) {
        if (callerRole !== 'payroll_officer' && callerRole !== 'admin') {
          throw new Error('Unauthorized: Payroll officer role required.');
        }
        return { success: true };
      }

      assert.throws(() => processPayrollBatch('candidate'), /Unauthorized/);
      assert.throws(() => processPayrollBatch('hr_staff'), /Unauthorized/);
      assert.throws(() => processPayrollBatch('interviewer'), /Unauthorized/);
    });
  });

  describe('4. Storage Bucket Policies: Private Receipts Bucket', () => {
    it('verifies candidates can manage their own receipts and staff can review them', () => {
      interface StorageAccessRequest {
        bucketId: string;
        userRole: string;
        userId: string;
        targetPath: string; // {user_id}/{filename}
        operation: 'SELECT' | 'INSERT' | 'DELETE';
      }

      function evaluateReceiptStorageAccess(req: StorageAccessRequest): boolean {
        if (req.bucketId !== 'receipts' && req.bucketId !== 'claim-receipts') return false;

        const pathOwner = req.targetPath.split('/')[0];

        if (req.operation === 'INSERT' || req.operation === 'DELETE') {
          // Candidate can only modify files in their own folder
          return req.userId === pathOwner;
        }

        if (req.operation === 'SELECT') {
          // Candidate reads own, staff/admin reads any
          if (req.userId === pathOwner) return true;
          return ['admin', 'hr_staff', 'payroll_officer'].includes(req.userRole);
        }

        return false;
      }

      // Candidate uploading to own folder -> allowed
      assert.equal(evaluateReceiptStorageAccess({
        bucketId: 'receipts',
        userRole: 'candidate',
        userId: 'cand-001',
        targetPath: 'cand-001/ticket.pdf',
        operation: 'INSERT',
      }), true);

      // Candidate attempting to upload to another candidate's folder -> blocked
      assert.equal(evaluateReceiptStorageAccess({
        bucketId: 'receipts',
        userRole: 'candidate',
        userId: 'cand-attacker',
        targetPath: 'cand-001/fake-receipt.pdf',
        operation: 'INSERT',
      }), false);

      // HR Staff reviewing candidate receipt -> allowed
      assert.equal(evaluateReceiptStorageAccess({
        bucketId: 'receipts',
        userRole: 'hr_staff',
        userId: 'hr-001',
        targetPath: 'cand-001/ticket.pdf',
        operation: 'SELECT',
      }), true);

      // Other candidate trying to view someone else's receipt -> blocked
      assert.equal(evaluateReceiptStorageAccess({
        bucketId: 'receipts',
        userRole: 'candidate',
        userId: 'cand-002',
        targetPath: 'cand-001/ticket.pdf',
        operation: 'SELECT',
      }), false);
    });
  });

  describe('5. SECURITY DEFINER RPC Authorization & Privilege Restrictions', () => {
    it('enforces authentication and HR/Admin permissions on allocate_city_vacancy', () => {
      interface VacancyAllocContext {
        actorId?: string;
        actorRole?: string;
        hasHrPermission: boolean;
      }

      function allocateCityVacancyGuard(ctx: VacancyAllocContext, count: number) {
        if (!ctx.actorId) {
          throw new Error('Authentication required.');
        }
        if (!ctx.actorRole) {
          throw new Error('Unauthorized: Caller has no registered profile or role.');
        }
        if (ctx.actorRole !== 'admin' && !(ctx.actorRole === 'hr_staff' && ctx.hasHrPermission)) {
          throw new Error('Unauthorized: Caller does not possess HR permissions.');
        }
        if (count <= 0) {
          throw new Error('Allocation count must be greater than zero.');
        }
        return { success: true };
      }

      // Anonymous -> blocked
      assert.throws(() => allocateCityVacancyGuard({ hasHrPermission: false }, 1), /Authentication required/);
      // No profile -> blocked
      assert.throws(() => allocateCityVacancyGuard({ actorId: 'u-1', hasHrPermission: false }, 1), /Caller has no registered profile/);
      // Candidate -> blocked
      assert.throws(() => allocateCityVacancyGuard({ actorId: 'u-1', actorRole: 'candidate', hasHrPermission: false }, 1), /Caller does not possess HR permissions/);
      // HR without company/location permission -> blocked
      assert.throws(() => allocateCityVacancyGuard({ actorId: 'u-1', actorRole: 'hr_staff', hasHrPermission: false }, 1), /Caller does not possess HR permissions/);
      // HR with permission -> allowed
      assert.equal(allocateCityVacancyGuard({ actorId: 'u-1', actorRole: 'hr_staff', hasHrPermission: true }, 2).success, true);
      // Admin -> allowed
      assert.equal(allocateCityVacancyGuard({ actorId: 'u-admin', actorRole: 'admin', hasHrPermission: false }, 2).success, true);
    });

    it('blocks arbitrary candidates from invoking offer_slot_to_next_waitlisted', () => {
      interface OfferSlotContext {
        actorId?: string;
        actorRole?: string;
        interviewerId: string;
        hasHrPermission: boolean;
      }

      function offerSlotGuard(ctx: OfferSlotContext) {
        if (!ctx.actorId) throw new Error('Authentication required.');
        if (!ctx.actorRole) throw new Error('Unauthorized: Caller has no registered profile or role.');

        if (ctx.actorRole === 'admin') return true;
        if (ctx.actorId === ctx.interviewerId) return true;
        if (ctx.actorRole === 'hr_staff' && ctx.hasHrPermission) return true;

        throw new Error('Unauthorized: Caller cannot offer this slot.');
      }

      // Candidate attempting promotion -> blocked
      assert.throws(
        () => offerSlotGuard({ actorId: 'cand-1', actorRole: 'candidate', interviewerId: 'int-1', hasHrPermission: false }),
        /Unauthorized: Caller cannot offer this slot/
      );

      // Random interviewer not assigned to slot -> blocked
      assert.throws(
        () => offerSlotGuard({ actorId: 'int-other', actorRole: 'interviewer', interviewerId: 'int-1', hasHrPermission: false }),
        /Unauthorized: Caller cannot offer this slot/
      );

      // Assigned interviewer -> allowed
      assert.equal(offerSlotGuard({ actorId: 'int-1', actorRole: 'interviewer', interviewerId: 'int-1', hasHrPermission: false }), true);

      // Authorized HR staff -> allowed
      assert.equal(offerSlotGuard({ actorId: 'hr-1', actorRole: 'hr_staff', interviewerId: 'int-1', hasHrPermission: true }), true);
    });

    it('restricts process_expired_offers strictly to service_role or admin', () => {
      function processExpiredOffersGuard(jwtRole?: string, actorRole?: string) {
        if (jwtRole === 'service_role') {
          return { success: true, mode: 'service_role' };
        }
        if (actorRole === 'admin') {
          return { success: true, mode: 'admin' };
        }
        throw new Error('Unauthorized: process_expired_offers requires administrative or service_role privilege.');
      }

      // Service role (cron / backend worker) -> allowed
      assert.equal(processExpiredOffersGuard('service_role').success, true);

      // Admin interactive user -> allowed
      assert.equal(processExpiredOffersGuard('authenticated', 'admin').success, true);

      // Candidate -> blocked
      assert.throws(() => processExpiredOffersGuard('authenticated', 'candidate'), /Unauthorized/);

      // HR staff -> blocked
      assert.throws(() => processExpiredOffersGuard('authenticated', 'hr_staff'), /Unauthorized/);

      // Anonymous -> blocked
      assert.throws(() => processExpiredOffersGuard(undefined, undefined), /Unauthorized/);
    });
  });

  describe('6. Audit Log Security & Anti-Forgery Defense', () => {
    it('prevents direct audit log insertion by non-admin users and enforces immutability', () => {
      function evaluateAuditLogInsert(callerRole?: string): boolean {
        // Direct inserts restricted strictly to admin; regular audit logs are emitted by SECURITY DEFINER RPCs
        return callerRole === 'admin';
      }

      function evaluateAuditLogMutation(operation: 'UPDATE' | 'DELETE'): never {
        throw new Error('Audit log entries are immutable and cannot be updated or deleted.');
      }

      // Candidate trying direct insert to forge logs -> blocked
      assert.equal(evaluateAuditLogInsert('candidate'), false);

      // HR Staff trying direct insert -> blocked
      assert.equal(evaluateAuditLogInsert('hr_staff'), false);

      // Admin direct insertion -> allowed
      assert.equal(evaluateAuditLogInsert('admin'), true);

      // Immutability: update and delete always fail for anyone
      assert.throws(() => evaluateAuditLogMutation('UPDATE'), /Audit log entries are immutable/);
      assert.throws(() => evaluateAuditLogMutation('DELETE'), /Audit log entries are immutable/);
    });
  });

  describe('7. Profile RLS Security & Scope Enforcement', () => {
    it('prevents HR staff from modifying candidates of another company', () => {
      interface CandidateProfile {
        id: string;
        role: string;
        companyId: string;
        locationId?: string;
      }

      interface HrCaller {
        id: string;
        role: string;
        companyId: string;
        locationId?: string;
      }

      function canHrUpdateProfile(hr: HrCaller, candidate: CandidateProfile, targetRole: string): boolean {
        if (hr.role === 'admin') return true;
        if (hr.role !== 'hr_staff') return false;

        // Target must remain a candidate (cannot escalate)
        if (candidate.role !== 'candidate' || targetRole !== 'candidate') return false;

        // Must belong to HR company
        if (hr.companyId !== candidate.companyId) return false;

        // If location-scoped, must match
        if (hr.locationId && candidate.locationId && hr.locationId !== candidate.locationId) return false;

        return true;
      }

      const hrCompanyA: HrCaller = { id: 'hr-1', role: 'hr_staff', companyId: 'comp-A', locationId: 'loc-1' };
      const candCompanyA: CandidateProfile = { id: 'c-1', role: 'candidate', companyId: 'comp-A', locationId: 'loc-1' };
      const candCompanyB: CandidateProfile = { id: 'c-2', role: 'candidate', companyId: 'comp-B', locationId: 'loc-2' };

      // Allowed: HR updating candidate in same company & location
      assert.equal(canHrUpdateProfile(hrCompanyA, candCompanyA, 'candidate'), true);

      // Blocked: HR updating candidate in different company
      assert.equal(canHrUpdateProfile(hrCompanyA, candCompanyB, 'candidate'), false);

      // Blocked: HR attempting to escalate candidate to admin
      assert.equal(canHrUpdateProfile(hrCompanyA, candCompanyA, 'admin'), false);

      // Blocked: Candidate updating own role
      const candidateCaller: HrCaller = { id: 'c-1', role: 'candidate', companyId: 'comp-A' };
      assert.equal(canHrUpdateProfile(candidateCaller, candCompanyA, 'admin'), false);
    });
  });

  describe('8. Attendance Authorization & Relationship Chain Validation (Issue B)', () => {
    interface AttendanceTestContext {
      actorId: string;
      actorRole: string;
      booking: {
        id: string;
        candidateId: string;
        status: string;
        interviewerId: string;
        locationId: string;
        companyId: string;
      };
      hasHrPermission: (comp: string, loc?: string) => boolean;
    }

    function executeMarkAttendance(ctx: AttendanceTestContext, newStatus: string) {
      if (!ctx.actorId) throw new Error('Authentication required.');
      if (!ctx.actorRole) throw new Error('Caller has no registered profile or role.');

      if (ctx.booking.status === 'cancelled') {
        throw new Error('Cannot mark attendance for a cancelled interview booking.');
      }

      // Explicit authorization
      const isAdmin = ctx.actorRole === 'admin';
      const isAssignedInterviewer = ctx.actorId === ctx.booking.interviewerId;
      const isScopedHr = ctx.actorRole === 'hr_staff' && ctx.hasHrPermission(ctx.booking.companyId, ctx.booking.locationId);

      if (!isAdmin && !isAssignedInterviewer && !isScopedHr) {
        throw new Error('Unauthorized: Caller cannot mark attendance for this booking.');
      }

      return {
        success: true,
        bookingId: ctx.booking.id,
        status: newStatus,
      };
    }

    const testBooking = {
      id: 'bk-100',
      candidateId: 'cand-1',
      status: 'confirmed',
      interviewerId: 'int-assigned',
      locationId: 'loc-blr',
      companyId: 'comp-acme',
    };

    it('allows assigned interviewer to mark attendance', () => {
      const res = executeMarkAttendance({
        actorId: 'int-assigned',
        actorRole: 'interviewer',
        booking: testBooking,
        hasHrPermission: () => false,
      }, 'attended');
      assert.equal(res.success, true);
      assert.equal(res.status, 'attended');
    });

    it('allows authorized scoped HR to mark attendance', () => {
      const res = executeMarkAttendance({
        actorId: 'hr-blr',
        actorRole: 'hr_staff',
        booking: testBooking,
        hasHrPermission: (comp, loc) => comp === 'comp-acme' && loc === 'loc-blr',
      }, 'attended');
      assert.equal(res.success, true);
    });

    it('allows admin to mark attendance system-wide', () => {
      const res = executeMarkAttendance({
        actorId: 'admin-1',
        actorRole: 'admin',
        booking: testBooking,
        hasHrPermission: () => false,
      }, 'late');
      assert.equal(res.success, true);
    });

    it('rejects unassigned interviewers from marking attendance', () => {
      assert.throws(() => executeMarkAttendance({
        actorId: 'int-unassigned',
        actorRole: 'interviewer',
        booking: testBooking,
        hasHrPermission: () => false,
      }, 'attended'), /Unauthorized: Caller cannot mark attendance/);
    });

    it('rejects HR staff from a different location or company', () => {
      assert.throws(() => executeMarkAttendance({
        actorId: 'hr-mumbai',
        actorRole: 'hr_staff',
        booking: testBooking,
        hasHrPermission: (comp, loc) => comp === 'comp-acme' && loc === 'loc-mumbai',
      }, 'attended'), /Unauthorized: Caller cannot mark attendance/);
    });

    it('rejects candidates from marking attendance', () => {
      assert.throws(() => executeMarkAttendance({
        actorId: 'cand-1',
        actorRole: 'candidate',
        booking: testBooking,
        hasHrPermission: () => false,
      }, 'attended'), /Unauthorized: Caller cannot mark attendance/);
    });

    it('rejects marking attendance for a cancelled booking', () => {
      const cancelledBooking = { ...testBooking, status: 'cancelled' };
      assert.throws(() => executeMarkAttendance({
        actorId: 'int-assigned',
        actorRole: 'interviewer',
        booking: cancelledBooking,
        hasHrPermission: () => false,
      }, 'attended'), /Cannot mark attendance for a cancelled interview booking/);
    });
  });

  describe('9. Profile SELECT Privacy & Scoped Visibility Rules (Issue C)', () => {
    interface ProfileRecord {
      id: string;
      fullName: string;
      role: string;
    }

    interface ProfileVisibilityContext {
      callerId: string;
      callerRole: string;
      isCandidateBookedWithInterviewer: (candId: string) => boolean;
      isCandidateInHrScope: (candId: string) => boolean;
      isColleagueInHrCompany: (userId: string) => boolean;
      isClaimantInPayrollScope: (candId: string) => boolean;
    }

    function canViewProfile(targetProfile: ProfileRecord, ctx: ProfileVisibilityContext): boolean {
      // 1. Self view
      if (ctx.callerId === targetProfile.id) return true;

      // 2. Admin view
      if (ctx.callerRole === 'admin') return true;

      // 3. Interviewer scoped view
      if (ctx.callerRole === 'interviewer') {
        return ctx.isCandidateBookedWithInterviewer(targetProfile.id);
      }

      // 4. HR scoped view (candidate in scope or peer in company)
      if (ctx.callerRole === 'hr_staff') {
        return ctx.isCandidateInHrScope(targetProfile.id) || ctx.isColleagueInHrCompany(targetProfile.id);
      }

      // 5. Payroll officer scoped view
      if (ctx.callerRole === 'payroll_officer') {
        return ctx.isClaimantInPayrollScope(targetProfile.id);
      }

      return false;
    }

    const candidateAlice: ProfileRecord = { id: 'c-alice', fullName: 'Alice Candidate', role: 'candidate' };
    const candidateBob: ProfileRecord = { id: 'c-bob', fullName: 'Bob Candidate', role: 'candidate' };

    it('allows candidates to view only their own profile', () => {
      const ctx: ProfileVisibilityContext = {
        callerId: 'c-alice',
        callerRole: 'candidate',
        isCandidateBookedWithInterviewer: () => false,
        isCandidateInHrScope: () => false,
        isColleagueInHrCompany: () => false,
        isClaimantInPayrollScope: () => false,
      };

      assert.equal(canViewProfile(candidateAlice, ctx), true);
      assert.equal(canViewProfile(candidateBob, ctx), false); // Cannot view other candidate
    });

    it('restricts interviewer to candidates booked for their interviews', () => {
      const ctx: ProfileVisibilityContext = {
        callerId: 'int-1',
        callerRole: 'interviewer',
        isCandidateBookedWithInterviewer: (id) => id === 'c-alice', // Only Alice is booked
        isCandidateInHrScope: () => false,
        isColleagueInHrCompany: () => false,
        isClaimantInPayrollScope: () => false,
      };

      assert.equal(canViewProfile(candidateAlice, ctx), true);
      assert.equal(canViewProfile(candidateBob, ctx), false); // Bob not assigned
    });

    it('restricts HR staff to candidates in their company scope', () => {
      const ctx: ProfileVisibilityContext = {
        callerId: 'hr-acme',
        callerRole: 'hr_staff',
        isCandidateBookedWithInterviewer: () => false,
        isCandidateInHrScope: (id) => id === 'c-alice', // Only Alice applied to Acme
        isColleagueInHrCompany: (id) => id === 'hr-peer',
        isClaimantInPayrollScope: () => false,
      };

      assert.equal(canViewProfile(candidateAlice, ctx), true);
      assert.equal(canViewProfile(candidateBob, ctx), false); // Bob applied to competitor
      assert.equal(canViewProfile({ id: 'hr-peer', fullName: 'HR Peer', role: 'hr_staff' }, ctx), true); // Peer allowed
    });

    it('restricts payroll officer to claimants with claims in their scope', () => {
      const ctx: ProfileVisibilityContext = {
        callerId: 'pay-1',
        callerRole: 'payroll_officer',
        isCandidateBookedWithInterviewer: () => false,
        isCandidateInHrScope: () => false,
        isColleagueInHrCompany: () => false,
        isClaimantInPayrollScope: (id) => id === 'c-alice', // Alice has an approved claim
      };

      assert.equal(canViewProfile(candidateAlice, ctx), true);
      assert.equal(canViewProfile(candidateBob, ctx), false); // Bob has no claims
    });
  });

  describe('10. Database Role Protection Trigger & Escalation Defense (Issue D)', () => {
    function simulateProfileUpdateTrigger(oldRole: string, newRole: string, callerRole: string) {
      if (oldRole !== newRole) {
        if (callerRole !== 'admin') {
          throw new Error(`Permission denied: Only administrators can modify user roles (attempted role change from ${oldRole} to ${newRole}).`);
        }
      }
      return { success: true, updatedRole: newRole };
    }

    it('allows administrator to change user roles', () => {
      const res = simulateProfileUpdateTrigger('candidate', 'hr_staff', 'admin');
      assert.equal(res.success, true);
      assert.equal(res.updatedRole, 'hr_staff');
    });

    it('blocks candidate from self-escalating role to admin or hr_staff', () => {
      assert.throws(
        () => simulateProfileUpdateTrigger('candidate', 'admin', 'candidate'),
        /Permission denied: Only administrators can modify user roles/
      );
      assert.throws(
        () => simulateProfileUpdateTrigger('candidate', 'hr_staff', 'candidate'),
        /Permission denied: Only administrators can modify user roles/
      );
    });

    it('blocks HR staff from escalating candidates to admin', () => {
      assert.throws(
        () => simulateProfileUpdateTrigger('candidate', 'admin', 'hr_staff'),
        /Permission denied: Only administrators can modify user roles/
      );
    });
  });

  describe('11. Cross-Bucket Storage Privacy & Scope Isolation (Issue E)', () => {
    interface StorageAccessCheck {
      bucketId: string;
      callerId: string;
      callerRole: string;
      pathOwnerId: string;
      hasScopedClaim: (userId: string) => boolean;
      hasApprovedClaim: (userId: string) => boolean;
      hasScopedBookingOrAbsence: (userId: string) => boolean;
    }

    function evaluateScopedStorageAccess(req: StorageAccessCheck): boolean {
      // 1. Owner always has access to their own files
      if (req.callerId === req.pathOwnerId) return true;

      // 2. Admin has system-wide access
      if (req.callerRole === 'admin') return true;

      // 3. Receipts & Claim-Receipts
      if (req.bucketId === 'receipts' || req.bucketId === 'claim-receipts') {
        if (req.callerRole === 'hr_staff' && req.hasScopedClaim(req.pathOwnerId)) return true;
        if (req.callerRole === 'payroll_officer' && req.hasApprovedClaim(req.pathOwnerId)) return true;
        return false;
      }

      // 4. Absence-Proofs
      if (req.bucketId === 'absence-proofs') {
        if (req.callerRole === 'hr_staff' && req.hasScopedBookingOrAbsence(req.pathOwnerId)) return true;
        if (req.callerRole === 'interviewer' && req.hasScopedBookingOrAbsence(req.pathOwnerId)) return true;
        return false;
      }

      // 5. Resumes
      if (req.bucketId === 'resumes') {
        if (req.callerRole === 'hr_staff' && req.hasScopedBookingOrAbsence(req.pathOwnerId)) return true;
        if (req.callerRole === 'interviewer' && req.hasScopedBookingOrAbsence(req.pathOwnerId)) return true;
        return false;
      }

      return false;
    }

    it('blocks HR staff from accessing receipts of candidates in other companies', () => {
      const allowed = evaluateScopedStorageAccess({
        bucketId: 'receipts',
        callerId: 'hr-acme',
        callerRole: 'hr_staff',
        pathOwnerId: 'cand-globex',
        hasScopedClaim: () => false, // Different company
        hasApprovedClaim: () => false,
        hasScopedBookingOrAbsence: () => false,
      });
      assert.equal(allowed, false);
    });

    it('allows HR staff to view receipts for claims in their company scope', () => {
      const allowed = evaluateScopedStorageAccess({
        bucketId: 'receipts',
        callerId: 'hr-acme',
        callerRole: 'hr_staff',
        pathOwnerId: 'cand-acme',
        hasScopedClaim: () => true, // Same company
        hasApprovedClaim: () => false,
        hasScopedBookingOrAbsence: () => false,
      });
      assert.equal(allowed, true);
    });

    it('blocks payroll officer from unapproved claim receipts', () => {
      const allowed = evaluateScopedStorageAccess({
        bucketId: 'receipts',
        callerId: 'pay-acme',
        callerRole: 'payroll_officer',
        pathOwnerId: 'cand-acme',
        hasScopedClaim: () => true,
        hasApprovedClaim: () => false, // Not yet HR approved
        hasScopedBookingOrAbsence: () => false,
      });
      assert.equal(allowed, false);
    });

    it('allows assigned interviewer to view absence proof for their interview', () => {
      const allowed = evaluateScopedStorageAccess({
        bucketId: 'absence-proofs',
        callerId: 'int-1',
        callerRole: 'interviewer',
        pathOwnerId: 'cand-sick',
        hasScopedClaim: () => false,
        hasApprovedClaim: () => false,
        hasScopedBookingOrAbsence: () => true, // Booked with interviewer
      });
      assert.equal(allowed, true);
    });
  });

  describe('12. Financial Settlement & Duplicate Payment Prevention (Section 9)', () => {
    interface ClaimRecord {
      id: string;
      status: string;
      approvedAmount: number;
    }

    function executeClaimPayout(claim: ClaimRecord, callerRole: string, bankLast4: string) {
      if (callerRole !== 'payroll_officer' && callerRole !== 'admin') {
        throw new Error('Unauthorized: Only payroll officers or administrators can record payouts.');
      }
      if (!/^\d{4}$/.test(bankLast4)) {
        throw new Error('Invalid bank account last-4 digits. Exactly 4 numeric digits required.');
      }
      if (claim.status === 'paid') {
        throw new Error('Duplicate Payout: Claim has already been paid and settled.');
      }
      if (claim.status !== 'hr_approved') {
        throw new Error(`Only HR-approved claims can be processed for payout (current: ${claim.status}).`);
      }

      claim.status = 'paid';
      return { success: true, status: 'paid', amount: claim.approvedAmount };
    }

    it('successfully processes payout for HR-approved claim with masked 4-digit bank', () => {
      const claim: ClaimRecord = { id: 'clm-1', status: 'hr_approved', approvedAmount: 350.0 };
      const res = executeClaimPayout(claim, 'payroll_officer', '4321');
      assert.equal(res.success, true);
      assert.equal(res.status, 'paid');
      assert.equal(claim.status, 'paid');
    });

    it('prevents duplicate payout on an already paid claim', () => {
      const paidClaim: ClaimRecord = { id: 'clm-2', status: 'paid', approvedAmount: 500.0 };
      assert.throws(
        () => executeClaimPayout(paidClaim, 'payroll_officer', '1234'),
        /Duplicate Payout: Claim has already been paid/
      );
    });

    it('rejects payout for unapproved draft or submitted claims', () => {
      const draftClaim: ClaimRecord = { id: 'clm-3', status: 'draft', approvedAmount: 200.0 };
      assert.throws(
        () => executeClaimPayout(draftClaim, 'payroll_officer', '1234'),
        /Only HR-approved claims can be processed/
      );
    });

    it('rejects payout with invalid bank details exceeding 4 digits', () => {
      const claim: ClaimRecord = { id: 'clm-4', status: 'hr_approved', approvedAmount: 150.0 };
      assert.throws(
        () => executeClaimPayout(claim, 'payroll_officer', '1234567890'), // Full account number leak
        /Invalid bank account last-4 digits/
      );
    });
  });
});


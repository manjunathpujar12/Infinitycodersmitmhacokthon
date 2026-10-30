import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HireSlotService, getInitialSeedData } from '../services/hireSlotService';
import { realtimeAllocationService } from '../services/realtimeAllocationService';
import { CandidateAllocation } from '../types/allocation';

describe('Candidate Portal Alternative Offer & Realtime Workflow', () => {
  let service: HireSlotService;

  beforeEach(() => {
    service = new HireSlotService(getInitialSeedData());
  });

  it('generates an alternative city offer when candidate preferred city is full', () => {
    // cand-02 (Priya Nair) prefers Chennai, but Chennai is FULL (4/4 allocated)
    const result = service.allocateCandidate('cand-02', 'job-fs-01');

    expect(result.success).toBe(true);
    expect(result.allocation?.status).toBe('OFFERED_ALTERNATIVE');
    expect(result.alternativeOffer).toBeDefined();
    expect(result.alternativeOffer?.offeredCityName).toBe('Bengaluru'); // Nearest via Haversine
    expect(result.alternativeOffer?.status).toBe('PENDING');

    // Bengaluru reservedCount should be 1
    const blrVac = service.getVacancies('job-fs-01').find((v) => v.cityName === 'Bengaluru');
    expect(blrVac?.reservedCount).toBe(1);
    expect(blrVac?.availableCapacity).toBe(1); // 5 total - (3 allocated + 1 reserved)
  });

  it('STRICT SECURITY RULE: blocks HR from simulating candidate consent', async () => {
    // Generate offer for cand-02
    const allocResult = service.allocateCandidate('cand-02', 'job-fs-01');
    const allocationId = allocResult.allocation!.id;

    // HR attempts to simulate candidate acceptance
    const hrAttempt = await service.respondToAlternativeCityOffer(
      allocationId,
      'cand-02',
      true,
      undefined,
      'HR_ADMIN' // Forbidden caller role
    );

    expect(hrAttempt.success).toBe(false);
    expect(hrAttempt.message).toContain('Forbidden: HR is not permitted to simulate candidate consent');

    // Verify allocation remains unchanged
    const alloc = service.getCandidateAllocation('cand-02', 'job-fs-01');
    expect(alloc?.status).toBe('OFFERED_ALTERNATIVE');
  });

  it('rejects response if caller candidateId does not match allocation candidate', async () => {
    const allocResult = service.allocateCandidate('cand-02', 'job-fs-01');
    const allocationId = allocResult.allocation!.id;

    // Impostor candidate tries to respond
    const imposterAttempt = await service.respondToAlternativeCityOffer(
      allocationId,
      'cand-01', // Mismatched candidate ID
      true,
      undefined,
      'CANDIDATE'
    );

    expect(imposterAttempt.success).toBe(false);
    expect(imposterAttempt.message).toContain('Forbidden: Authenticated candidate ID does not match');
  });

  it('allows candidate to accept the offer themselves, updating status and securing seat', async () => {
    const allocResult = service.allocateCandidate('cand-02', 'job-fs-01');
    const allocationId = allocResult.allocation!.id;

    // Candidate accepts through candidate portal
    const acceptResult = await service.respondToAlternativeCityOffer(
      allocationId,
      'cand-02',
      true,
      undefined,
      'CANDIDATE'
    );

    expect(acceptResult.success).toBe(true);
    expect(acceptResult.allocation?.status).toBe('ALTERNATIVE_ACCEPTED');
    expect(acceptResult.allocation?.allocatedCityName).toBe('Bengaluru');

    // Target city vacancy: reservedCount decremented, allocatedCount incremented
    const blrVac = service.getVacancies('job-fs-01').find((v) => v.cityName === 'Bengaluru');
    expect(blrVac?.reservedCount).toBe(0);
    expect(blrVac?.allocatedCount).toBe(4); // 3 original + 1 newly allocated
    expect(blrVac?.availableCapacity).toBe(1); // 5 - 4
  });

  it('allows candidate to decline the offer, releasing reserved seat and enrolling in waitlist', async () => {
    const allocResult = service.allocateCandidate('cand-02', 'job-fs-01');
    const allocationId = allocResult.allocation!.id;

    // Candidate declines through candidate portal
    const declineResult = await service.respondToAlternativeCityOffer(
      allocationId,
      'cand-02',
      false,
      'Relocation not feasible',
      'CANDIDATE'
    );

    expect(declineResult.success).toBe(true);
    expect(declineResult.allocation?.status).toBe('ALTERNATIVE_REJECTED');

    // Target city vacancy: reserved seat released
    const blrVac = service.getVacancies('job-fs-01').find((v) => v.cityName === 'Bengaluru');
    expect(blrVac?.reservedCount).toBe(0);
    expect(blrVac?.allocatedCount).toBe(3); // Unchanged
    expect(blrVac?.availableCapacity).toBe(2); // 5 - 3

    // Candidate must be automatically added to waitlist for their preferred city (Chennai)
    const waitlist = service.getWaitlist('job-fs-01');
    const candidateWaitlistEntry = waitlist.find((w) => w.candidateId === 'cand-02');
    expect(candidateWaitlistEntry).toBeDefined();
    expect(candidateWaitlistEntry?.preferredCityName).toBe('Chennai');
    expect(candidateWaitlistEntry?.status).toBe('QUEUED');
  });

  it('notifies candidate Realtime subscription filtered to candidate_id and notifies HR subscription', async () => {
    const candidateCallback = vi.fn();
    const otherCandidateCallback = vi.fn();
    const hrCallback = vi.fn();

    // Subscribe cand-02
    const unsubCandidate = realtimeAllocationService.subscribeToCandidateAllocation(
      'cand-02',
      candidateCallback
    );

    // Subscribe cand-01 (should NOT receive cand-02 events)
    const unsubOther = realtimeAllocationService.subscribeToCandidateAllocation(
      'cand-01',
      otherCandidateCallback
    );

    // Subscribe HR monitor
    const unsubHr = realtimeAllocationService.subscribeToHrAllocations(hrCallback);

    // Generate offer for cand-02
    const allocResult = service.allocateCandidate('cand-02', 'job-fs-01');
    const allocationId = allocResult.allocation!.id;

    // Candidate accepts
    await service.respondToAlternativeCityOffer(
      allocationId,
      'cand-02',
      true,
      undefined,
      'CANDIDATE'
    );

    // Verify candidate received Realtime event
    expect(candidateCallback).toHaveBeenCalled();
    const lastCandidateCall = candidateCallback.mock.calls[candidateCallback.mock.calls.length - 1][0];
    expect(lastCandidateCall.status).toBe('ALTERNATIVE_ACCEPTED');
    expect(lastCandidateCall.candidateId).toBe('cand-02');

    // Verify HR received Realtime event
    expect(hrCallback).toHaveBeenCalled();
    const lastHrCall = hrCallback.mock.calls[hrCallback.mock.calls.length - 1][0];
    expect(lastHrCall.status).toBe('ALTERNATIVE_ACCEPTED');

    // Verify other candidate did NOT receive cand-02 event (filtered subscription)
    expect(otherCandidateCallback).not.toHaveBeenCalled();

    // Cleanup
    unsubCandidate();
    unsubOther();
    unsubHr();
  });
});


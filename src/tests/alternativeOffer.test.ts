import { describe, it, expect } from 'vitest';
import { handleCandidateAlternativeOfferResponse } from '../engine/alternativeCityManager';
import { JobAllocation, AlternativeCityOffer } from '../types/allocation';

describe('Alternative City Offer Acceptance and Rejection Workflow', () => {
  const baseAllocation: JobAllocation = {
    id: 'alloc-alt-1',
    candidateId: 'cand-alt-1',
    candidateName: 'Priya Nair',
    jobId: 'job-1',
    jobTitle: 'Senior Full Stack Engineer',
    status: 'OFFERED_ALTERNATIVE',
    matchScore: 92,
    decisionExplanation: 'Preferred city full; offered nearest alternative',
    isAlternativeOffer: true,
    alternativeOfferedCityId: 'c-blr',
    alternativeOfferedCityName: 'Bengaluru',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const baseOffer: AlternativeCityOffer = {
    allocationId: 'alloc-alt-1',
    candidateId: 'cand-alt-1',
    jobId: 'job-1',
    offeredCityId: 'c-blr',
    offeredCityName: 'Bengaluru',
    originalPreferredCities: ['Chennai'],
    distanceKm: 290.5,
    reason: 'Chennai is full; Bengaluru is nearest open hub',
    expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    status: 'PENDING',
  };

  it('handles candidate acceptance: securely confirms allocation and updates status to ALTERNATIVE_ACCEPTED', () => {
    const result = handleCandidateAlternativeOfferResponse(baseAllocation, baseOffer, true);

    expect(result.actionTaken).toBe('CONFIRMED_SEAT');
    expect(result.allocation.status).toBe('ALTERNATIVE_ACCEPTED');
    expect(result.allocation.allocatedCityId).toBe('c-blr');
    expect(result.allocation.allocatedCityName).toBe('Bengaluru');
    expect(result.offer.status).toBe('ACCEPTED');
    expect(result.message).toContain('Seat confirmed');
  });

  it('handles candidate rejection: releases reserved seat and marks allocation as ALTERNATIVE_REJECTED', () => {
    const result = handleCandidateAlternativeOfferResponse(
      baseAllocation,
      baseOffer,
      false,
      'Relocation distance too far from family'
    );

    expect(result.actionTaken).toBe('RELEASED_SEAT_OFFERED_WAITLIST');
    expect(result.allocation.status).toBe('ALTERNATIVE_REJECTED');
    expect(result.offer.status).toBe('REJECTED');
    expect(result.message).toContain('Reserved seat in Bengaluru released');
    expect(result.allocation.decisionExplanation).toContain('Candidate declined alternative offer');
  });
});


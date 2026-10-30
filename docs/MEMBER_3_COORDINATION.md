# Coordination Protocol: Member 1 & Member 3 (HR Dashboard)

## Urgent Coordination Notes: Alternative-City Workflow & Shared `candidate_allocations`

This document outlines the shared schema, Realtime event contract, and security boundaries established between **Member 1 (Architecture & Allocation Engine)** and **Member 3 (HR Dashboard & Recruitment Management)**.

---

### 1. Architectural Invariant: Candidate Consent Protection

> [!IMPORTANT]
> **HR is strictly prohibited from simulating or recording candidate consent on alternative city offers.**
> In accordance with HireSlot Business Rule #8 (*"Alternative locations require candidate consent"*), when an applicant's preferred city is full and an alternative hub is proposed:
> - The status is set to `OFFERED_ALTERNATIVE` with a 48-hour temporary seat reservation.
> - **Only the authenticated candidate** can accept or decline this offer through the **Candidate Portal (Member 2)**.
> - The HR Dashboard displays the offer as `"AWAITING CANDIDATE DECISION"`. HR cannot click to accept or decline on behalf of the applicant.

---

### 2. Shared Table: `candidate_allocations`

The canonical shared Supabase table for allocations is `public.candidate_allocations`:

```sql
CREATE TABLE public.candidate_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    allocated_city_id UUID REFERENCES public.cities(id),
    status VARCHAR(30) NOT NULL CHECK (status IN (
        'PENDING', 'ALLOCATED', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_ACCEPTED',
        'ALTERNATIVE_REJECTED', 'WAITLISTED', 'RELEASED', 'CANCELLED'
    )),
    match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    decision_explanation TEXT NOT NULL,
    is_alternative_offer BOOLEAN NOT NULL DEFAULT false,
    alternative_offered_city_id UUID REFERENCES public.cities(id),
    offer_expires_at TIMESTAMPTZ,
    allocated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_active_candidate_alloc UNIQUE (candidate_id, job_id)
);
```

*(Note: `public.job_allocations` is maintained as a backward-compatible view).*

---

### 3. Realtime Subscription for HR Dashboard (Member 3)

Member 3's HR Dashboard should subscribe to all changes on the `candidate_allocations` table using Supabase Realtime:

```typescript
import { supabase } from '@/lib/supabaseClient';

// Subscribe to all allocation events on the HR Dashboard
const channel = supabase
  .channel('hr-allocations-monitor')
  .on(
    'postgres_changes',
    {
      event: '*', // Listen to INSERT, UPDATE, DELETE
      schema: 'public',
      table: 'candidate_allocations',
    },
    (payload) => {
      console.log('Realtime allocation change received:', payload);
      
      // Update HR state instantly
      const updatedAllocation = payload.new;
      
      if (updatedAllocation.status === 'ALTERNATIVE_ACCEPTED') {
        // Candidate accepted alternative offer -> seat permanently secured!
        toast.success(`Candidate ${updatedAllocation.candidate_id} accepted alternative offer!`);
      } else if (updatedAllocation.status === 'ALTERNATIVE_REJECTED') {
        // Candidate declined alternative offer -> seat released, candidate waitlisted!
        toast.info(`Candidate ${updatedAllocation.candidate_id} declined offer and joined waitlist.`);
      }

      // Re-fetch or update local vacancy and allocation stores
      refreshAllocations();
      refreshVacancies();
    }
  )
  .subscribe((status) => {
    console.log('HR Realtime status:', status);
  });
```

---

### 4. Candidate Portal Subscription (Member 2 Filtered Subscription)

In Member 2's Candidate Portal, the subscription is strictly filtered to the authenticated candidate:

```typescript
const candidateChannel = supabase
  .channel(`candidate-allocation:${candidateId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'candidate_allocations',
      filter: `candidate_id=eq.${candidateId}`, // Filtered to authenticated user
    },
    (payload) => {
      // Candidate sees immediate status update
      setCandidateAllocation(payload.new);
    }
  )
  .subscribe();
```

---

### 5. Candidate Action API

When a candidate accepts or declines the offer in the Candidate Portal:

```typescript
import { hireSlotService } from '@/services/hireSlotService';

// Candidate clicks "Accept Assignment"
const response = await hireSlotService.respondToAlternativeCityOffer(
  allocationId,
  candidateId,
  true, // true = accepted, false = declined
  undefined, // optional decline reason
  'CANDIDATE' // Must be 'CANDIDATE'. 'HR_ADMIN' will throw an unauthorized error!
);

// If false is passed, the candidate is automatically enqueued into the priority waitlist
// for their 1st preferred city, and the temporary seat reservation is released.
```

---

### 6. Verification & Migration Checklist for Member 3

1. Run migration `supabase/migrations/002_candidate_allocations_realtime.sql` in your Supabase project.
2. Verify that `ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_allocations;` is active.
3. Ensure your HR Dashboard components display `offer.status` without render buttons for HR to force candidate acceptance.
4. Test the real-time roundtrip:
   - HR triggers allocation for candidate whose preferred city is full $\to$ alternative offer generated.
   - Candidate opens Candidate Portal $\to$ accepts or declines.
   - HR Dashboard immediately reflects the change without manual page refresh.


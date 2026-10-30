# HireSlot — Module Integration & Architecture Guide

## Overview

This guide defines the architectural interfaces, domain boundaries, data models, and transactional guarantees for the **HireSlot Recruitment & Location Allocation Platform**.

The platform is designed with clear domain boundaries:
1. **Architecture & Shared Schema (`src/types/`)**: Contract source of truth for the entire engineering team.
2. **Role Matching & Skill-Gap Engine (`src/engine/matchingEngine.ts`)**: Explainable matching based on skills, experience, and education, generating actionable upskilling hints.
3. **Location Allocation & Capacity Engine (`src/engine/allocationEngine.ts`, `src/engine/vacancyTracker.ts`)**: Preferred-location-first matching, strict full-city protection, duplicate prevention, and transactional concurrency guarantees.
4. **Overflow & Proximity Engine (`src/lib/haversine.ts`, `src/engine/alternativeCityManager.ts`)**: Haversine distance-based nearest-city recommendations and candidate accept/reject workflows.
5. **Future-Date Waitlist Manager (`src/engine/waitlistManager.ts`)**: Prioritized FIFO queue for future availability dates and full hubs.
6. **Immutable Audit Logger (`src/engine/auditLogger.ts`)**: Compliance and explainability logging.
7. **Interview Service Boundary (`src/services/interviewService.ts`)**: Completely decoupled from job allocation; interview scores are evaluative and never auto-reject.

---

## 1. Domain Separation & Invariants

| Invariant / Rule | Implementation & Guarantee |
| :--- | :--- |
| **Never assign to a full city** | `isCityAvailableForAllocation()` and PostgreSQL `chk_capacity_overflow` + `allocate_candidate_transactional` block allocation if `(allocated + reserved) >= totalCapacity`. |
| **Prevent duplicate allocations** | `UNIQUE(candidate_id, job_id)` constraint in PostgreSQL schema + engine check blocks multiple active allocations for the same candidate and job. |
| **Transactional concurrency** | PostgreSQL stored procedure uses `SELECT ... FOR UPDATE` row-level lock on the target city vacancy row, ensuring ACID isolation. |
| **No auto-rejection by AI/Interview score** | Interview scores and AI ratings are purely informational metadata and cannot trigger automated hard disqualification. |
| **Interview domain separation** | Interview booking (`interview_slots`) is an independent domain table and service with zero hard dependencies on location allocation. |
| **Explainable decisions** | Every allocation, rejection, alternative offer, and waitlist event generates a transparent plain-English explanation factor breakdown. |

---

## 2. Shared Types (`src/types/index.ts`)

### `JobRole`
```typescript
export interface JobRole {
  id: string;
  title: string;
  department: string;
  minExperienceYears: number;
  maxExperienceYears?: number;
  requiredEducation?: string[];
  requiredSkills: SkillRequirement[];
  description?: string;
  isOpen: boolean;
  createdAt: string;
}
```

### `CandidateProfile`
```typescript
export interface CandidateProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  totalExperienceYears: number;
  education: string;
  skills: CandidateSkill[];
  preferredCities: string[]; // [1st choice, 2nd choice, ...]
  currentCoordinates?: { latitude: number; longitude: number };
  currentCity?: string;
  availableFrom: string; // ISO format e.g. "2026-11-15"
  willingToRelocate: boolean;
  interviewScore?: number; // Informational only
  resumeUrl?: string;
}
```

### `CityVacancy`
```typescript
export interface CityVacancy {
  id: string;
  jobId: string;
  cityId: string;
  cityName: string;
  totalCapacity: number;
  allocatedCount: number;
  reservedCount: number; // Pending alternative offers
  availableCapacity: number; // total - (allocated + reserved)
  status: 'AVAILABLE' | 'LIMITED' | 'FULL';
  coordinates: { latitude: number; longitude: number };
  updatedAt: string;
}
```

---

## 3. Teammate Integration Examples

### A. Role Matching & Skill-Gap Analysis (for Candidate/HR Portal)

```typescript
import { evaluateCandidateRoleMatch } from '@/engine/matchingEngine';

const evaluation = evaluateCandidateRoleMatch(candidate, job);

console.log(evaluation.overallScore); // e.g. 88%
console.log(evaluation.skillMatchPercentage); // e.g. 95%
console.log(evaluation.skillGaps); 
// [
//   {
//     skillName: "AWS",
//     severity: "RECOMMENDED_BONUS",
//     gapExplanation: "Candidate does not have nice-to-have skill AWS",
//     recommendedAction: "Self-paced learning in AWS..."
//   }
// ]
```

### B. Executing Transactional Allocation

```typescript
import { hireSlotService } from '@/services/hireSlotService';

// Executes preferred-first allocation with concurrency safeguards
const result = hireSlotService.allocateCandidate(candidateId, jobId);

if (result.success) {
  if (result.decision.type === 'PREFERRED_LOCATION_MATCH') {
    console.log(`Seat secured in preferred city: ${result.decision.assignedCity}`);
  } else if (result.decision.type === 'OVERFLOW_ALTERNATIVE_OFFER') {
    console.log(`Preferred hubs full. Nearest city offered: ${result.decision.assignedCity}`);
  } else if (result.decision.type === 'WAITLISTED_ALL_LOCATIONS_FULL') {
    console.log(`All hubs full. Enrolled in waitlist.`);
  }
} else {
  console.error(`Allocation blocked: ${result.errorMessage}`);
}
```

### C. Candidate Accepting / Rejecting Alternative City Offer

```typescript
import { hireSlotService } from '@/services/hireSlotService';

// Candidate clicks "Accept Offer"
const acceptRes = hireSlotService.respondToAlternativeCityOffer(
  allocationId,
  candidateId,
  true // true = accept, false = decline
);

// If candidate declines, the reserved seat is released and candidate is enrolled into waitlist
```

### D. Booking Interviews Independently

```typescript
import { interviewService } from '@/services/interviewService';

const interview = interviewService.bookInterviewSlot(
  {
    candidateId: 'cand-01',
    jobId: 'job-01',
    stage: 'ROUND_1_TECHNICAL',
    preferredDate: '2026-11-05T10:00:00Z',
  },
  'interviewer-id',
  'Interviewer Name'
);
```

---

## 4. Supabase Database Setup

1. Copy SQL migration from `supabase/migrations/001_hireslot_schema.sql`.
2. Run in your Supabase SQL Editor.
3. Configure `.env`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```


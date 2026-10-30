# HireSlot — Intelligent Recruitment & Location Allocation Platform

HireSlot is an intelligent recruitment, candidate matching, and location allocation platform designed to match candidates to open job roles, evaluate skill gaps transparently, track city-wise vacancy capacity in real-time, and execute concurrency-safe location allocations with Haversine-based nearest-city overflow recommendations and future-date waitlists.

---

## My Responsibility

1. **Architecture & Shared Schema**: Define core TypeScript domain contracts and PostgreSQL transactional schema (`candidate_allocations`) for the entire engineering team.
2. **Role Matching Engine**: Explainable candidate-to-job matching based on skill proficiency, years of experience, and educational eligibility.
3. **Skill-Gap Hints**: Granular gap analysis distinguishing mandatory missing skills from bonus skills with actionable upskilling recommendations.
4. **City Vacancy Capacity Tracking**: Real-time multi-hub tracking (`AVAILABLE`, `LIMITED`, `FULL`) with strict overbooking prevention.
5. **Preferred-Location-First Allocation**: Prioritizing candidate preference order with ACID transactional safety.
6. **HR-Configurable Ranking Rules**: Customizable weights for skills, experience, location alignment, and joining date urgency, with ready presets.
7. **Haversine Distance Proximity Recommendations**: Great-circle geographic proximity ranking ($R = 6371\text{ km}$) for overflow management when preferred cities are full.
8. **Alternative City Workflow & Candidate Consent**: 48-hour temporary seat reservation holds with independent candidate acceptance and rejection workflows. **HR cannot simulate candidate consent**.
9. **Future-Date & Location Waitlist**: Priority queue management factoring match scores, joining readiness, and FIFO tie-breakers.
10. **Immutable Allocation Audit Trail**: Detailed audit logging capturing state transitions, actors, and decision factors.
11. **Realtime Multi-Portal Synchronization**: Live Supabase Realtime subscriptions on the shared `candidate_allocations` table syncing HR Dashboard (Member 3) and Candidate Portal (Member 2).

---

## Architectural Principles & Strict Invariants

- **Never assign to a full city**: Both database CHECK constraints and application logic strictly block allocating any candidate to a city with 0 available seats.
- **Prevent duplicate allocations**: A candidate can never have duplicate active allocations for the same job (`UNIQUE(candidate_id, job_id)`).
- **Candidate Consent Protected**: HR is strictly prohibited from simulating candidate consent. Only the candidate can accept or decline alternative city offers through the Candidate Portal.
- **Realtime Portal Synchronization**: Live Supabase Realtime subscriptions on the shared `candidate_allocations` table (`filter: candidate_id=eq.${candidateId}`) sync state between HR Dashboard (Member 3) and Candidate Portal (Member 2).
- **Concurrency & Transactional Safety**: Allocation RPC procedures use `SELECT ... FOR UPDATE` row-level locks on city vacancy records to prevent race conditions during high-concurrency requests.
- **No AI Auto-Rejection**: Interview and AI scores are strictly evaluative metadata and never trigger automated candidate disqualification.
- **Interview Domain Separation**: Interview bookings (`interview_slots`) are decoupled into an independent service and table.
- **Explainability**: Every decision provides plain-English summaries explaining the criteria, factors, and weights applied.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide React
- **Backend / DB**: Supabase (PostgreSQL with ACID Stored Procedures & Realtime)
- **Testing**: Vitest (Unit & Integration tests)

---

## Project Structure

```
├── docs/
│   ├── INTEGRATION_GUIDE.md        # Complete integration instructions for teammates
│   └── MEMBER_3_COORDINATION.md    # Urgent coordination protocol for HR Dashboard
├── src/
│   ├── types/                     # Shared TypeScript contracts & domain models
│   │   ├── matching.ts            # Roles, candidate profiles, skill requirements
│   │   ├── location.ts            # Vacancy capacity, coordinates, distance recommendations
│   │   ├── allocation.ts          # Allocations, decisions, audit logs, alternative offers
│   │   ├── waitlist.ts            # Waitlist queues & priority models
│   │   ├── interview.ts           # Decoupled interview booking models
│   │   └── database.ts            # Supabase database schema definitions
│   ├── engine/                    # Core Business Engines
│   │   ├── matchingEngine.ts      # Explainable matching & skill-gap hints
│   │   ├── rankingEngine.ts       # HR configurable ranking rules & presets
│   │   ├── vacancyTracker.ts      # Real-time capacity monitoring & safety checks
│   │   ├── allocationEngine.ts    # Transactional preferred-first allocator
│   │   ├── alternativeCityManager.ts # Haversine overflow & accept/reject workflow
│   │   ├── waitlistManager.ts     # Future-date queue & promotion engine
│   │   └── auditLogger.ts         # Immutable audit logging
│   ├── lib/
│   │   ├── haversine.ts           # Great-circle Haversine distance formula
│   │   ├── supabaseClient.ts      # Supabase client with graceful mock fallback
│   │   └── utils.ts               # Date and formatting utilities
│   ├── services/
│   │   ├── hireSlotService.ts     # Unified orchestrator integrating all modules
│   │   ├── realtimeAllocationService.ts # Supabase Realtime pub-sub manager
│   │   └── interviewService.ts    # Independent interview booking service
│   ├── components/                # Interactive UI Showcase & Dashboards
│   │   ├── Navbar.tsx             # Header, portal switcher (HR / Candidate)
│   │   ├── CandidatePortalView.tsx # Candidate Portal for independent offer decision
│   │   ├── AllocationConsole.tsx  # Core transactional allocation console
│   │   ├── RoleMatchingView.tsx   # Skill match & actionable gap hints
│   │   ├── VacancyTrackerView.tsx # City vacancy matrix with status badges
│   │   ├── OverflowRecommendationView.tsx # Haversine overflow & live HR monitor
│   │   ├── WaitlistManagerView.tsx # Future-date & location waitlist queue
│   │   ├── AuditHistoryView.tsx   # Immutable audit trail
│   │   └── HrRankingConfigModal.tsx # HR custom weight sliders
│   ├── App.tsx
│   └── main.tsx
├── supabase/
│   └── migrations/
│       ├── 001_hireslot_schema.sql # Initial PostgreSQL schema, constraints, indexes & ACID RPCs
│       └── 002_candidate_allocations_realtime.sql # Shared candidate_allocations table & Realtime publication
└── tests/                         # Vitest Test Suite (26 passed tests)
    ├── matchingEngine.test.ts
    ├── haversine.test.ts
    ├── allocationEngine.test.ts
    ├── alternativeOffer.test.ts
    ├── waitlist.test.ts
    ├── rankingRules.test.ts
    └── candidateOfferRealtime.test.ts
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
```bash
npm test
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```

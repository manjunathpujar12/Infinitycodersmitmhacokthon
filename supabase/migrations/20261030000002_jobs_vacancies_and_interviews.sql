-- Migration 02: Job Openings, City Vacancies, Interview Stages, Slots, Bookings, and Waitlists
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. JOB OPENINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_openings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    department TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_openings_company ON public.job_openings(company_id);

DROP TRIGGER IF EXISTS trg_job_openings_updated_at ON public.job_openings;
CREATE TRIGGER trg_job_openings_updated_at
    BEFORE UPDATE ON public.job_openings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. CITY-WISE VACANCIES (QUOTAS & ALLOCATIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.city_vacancies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    total_capacity INT NOT NULL CHECK (total_capacity >= 0),
    allocated_count INT NOT NULL DEFAULT 0 CHECK (allocated_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_location_vacancy UNIQUE (job_opening_id, location_id),
    CONSTRAINT chk_allocated_within_capacity CHECK (allocated_count <= total_capacity)
);

CREATE INDEX IF NOT EXISTS idx_city_vacancies_lookup 
    ON public.city_vacancies(job_opening_id, location_id);

DROP TRIGGER IF EXISTS trg_city_vacancies_updated_at ON public.city_vacancies;
CREATE TRIGGER trg_city_vacancies_updated_at
    BEFORE UPDATE ON public.city_vacancies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. INTERVIEW STAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interview_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stage_order INT NOT NULL DEFAULT 1 CHECK (stage_order > 0),
    duration_minutes INT NOT NULL DEFAULT 45 CHECK (duration_minutes > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_job_stage_order UNIQUE (job_opening_id, stage_order)
);

CREATE INDEX IF NOT EXISTS idx_interview_stages_job ON public.interview_stages(job_opening_id);

-- ============================================================================
-- 4. INTERVIEW SLOTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interview_slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES public.interview_stages(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL, -- Nullable for virtual/remote
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    max_capacity INT NOT NULL DEFAULT 1 CHECK (max_capacity >= 1),
    booked_count INT NOT NULL DEFAULT 0 CHECK (booked_count >= 0),
    status slot_status NOT NULL DEFAULT 'open',
    meeting_link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_slot_time_validity CHECK (start_time < end_time),
    CONSTRAINT chk_slot_capacity_bound CHECK (booked_count <= max_capacity)
);

CREATE INDEX IF NOT EXISTS idx_interview_slots_stage ON public.interview_slots(stage_id, status);
CREATE INDEX IF NOT EXISTS idx_interview_slots_interviewer ON public.interview_slots(interviewer_id, start_time);
CREATE INDEX IF NOT EXISTS idx_interview_slots_time ON public.interview_slots(start_time, end_time);

DROP TRIGGER IF EXISTS trg_interview_slots_updated_at ON public.interview_slots;
CREATE TRIGGER trg_interview_slots_updated_at
    BEFORE UPDATE ON public.interview_slots
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 5. INTERVIEW BOOKINGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interview_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_id UUID NOT NULL REFERENCES public.interview_slots(id) ON DELETE RESTRICT,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status booking_status NOT NULL DEFAULT 'confirmed',
    booked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    cancellation_reason TEXT,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_slot_candidate UNIQUE (slot_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_bookings_candidate ON public.interview_bookings(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot ON public.interview_bookings(slot_id, status);

DROP TRIGGER IF EXISTS trg_interview_bookings_updated_at ON public.interview_bookings;
CREATE TRIGGER trg_interview_bookings_updated_at
    BEFORE UPDATE ON public.interview_bookings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 6. INTERVIEW WAITLIST
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interview_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES public.interview_stages(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    position INT NOT NULL CHECK (position > 0),
    status waitlist_status NOT NULL DEFAULT 'waiting',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_stage_candidate_waitlist UNIQUE (stage_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_waitlist_queue 
    ON public.interview_waitlist(stage_id, status, position);

DROP TRIGGER IF EXISTS trg_interview_waitlist_updated_at ON public.interview_waitlist;
CREATE TRIGGER trg_interview_waitlist_updated_at
    BEFORE UPDATE ON public.interview_waitlist
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 7. TIMED SLOT OFFERS (For waitlisted candidates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.timed_slot_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    waitlist_id UUID NOT NULL REFERENCES public.interview_waitlist(id) ON DELETE CASCADE,
    slot_id UUID NOT NULL REFERENCES public.interview_slots(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    offered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    status timed_offer_status NOT NULL DEFAULT 'pending',
    response_at TIMESTAMPTZ,
    CONSTRAINT chk_offer_expiry_validity CHECK (expires_at > offered_at)
);

CREATE INDEX IF NOT EXISTS idx_timed_offers_candidate 
    ON public.timed_slot_offers(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_timed_offers_expiry 
    ON public.timed_slot_offers(expires_at) WHERE status = 'pending';

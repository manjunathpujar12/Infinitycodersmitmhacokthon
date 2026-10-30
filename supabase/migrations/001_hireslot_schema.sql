-- ============================================================================
-- HireSlot Supabase Migration: 001_hireslot_schema.sql
-- Modules: Architecture, Role Matching, Location Allocation, Overflow & Audit
-- Features: Concurrency-safe atomic allocation, Row-level locking, Audit trails
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. JOBS TABLE
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    min_experience_years INT NOT NULL DEFAULT 0,
    max_experience_years INT,
    required_education TEXT[] DEFAULT '{}',
    required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    description TEXT,
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS public.candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    total_experience_years NUMERIC(4,1) NOT NULL DEFAULT 0,
    education VARCHAR(255) NOT NULL,
    skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    preferred_cities TEXT[] NOT NULL DEFAULT '{}',
    current_coordinates JSONB, -- { "latitude": 12.9716, "longitude": 77.5946 }
    current_city VARCHAR(100),
    available_from DATE NOT NULL DEFAULT CURRENT_DATE,
    willing_to_relocate BOOLEAN NOT NULL DEFAULT true,
    interview_score NUMERIC(5,2), -- Purely evaluative, NEVER auto-rejects
    resume_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. CITIES TABLE
CREATE TABLE IF NOT EXISTS public.cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_name VARCHAR(100) UNIQUE NOT NULL,
    state VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    latitude NUMERIC(9,6) NOT NULL,
    longitude NUMERIC(9,6) NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
    tier INT DEFAULT 1 CHECK (tier IN (1, 2, 3))
);

-- 4. CITY VACANCIES TABLE (Tracks Capacity & Status per Job and City)
CREATE TABLE IF NOT EXISTS public.city_vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
    total_capacity INT NOT NULL CHECK (total_capacity >= 0),
    allocated_count INT NOT NULL DEFAULT 0 CHECK (allocated_count >= 0),
    reserved_count INT NOT NULL DEFAULT 0 CHECK (reserved_count >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'LIMITED', 'FULL')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_capacity_overflow CHECK (allocated_count + reserved_count <= total_capacity),
    CONSTRAINT uq_job_city_vacancy UNIQUE (job_id, city_id)
);

-- 5. JOB ALLOCATIONS TABLE
CREATE TABLE IF NOT EXISTS public.job_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    allocated_city_id UUID REFERENCES public.cities(id),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN (
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
    -- RULE: Prevent duplicate active allocations for the same candidate & job
    CONSTRAINT uq_active_candidate_job UNIQUE (candidate_id, job_id)
);

-- 6. ALLOCATION AUDIT LOGS TABLE (Immutable Trail)
CREATE TABLE IF NOT EXISTS public.allocation_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    allocation_id UUID REFERENCES public.job_allocations(id) ON DELETE SET NULL,
    candidate_id UUID NOT NULL REFERENCES public.candidates(id),
    job_id UUID NOT NULL REFERENCES public.jobs(id),
    action VARCHAR(50) NOT NULL,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor VARCHAR(30) NOT NULL CHECK (actor IN ('SYSTEM_ALLOCATOR', 'HR_ADMIN', 'CANDIDATE')),
    actor_id VARCHAR(100),
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. WAITLIST ENTRIES TABLE
CREATE TABLE IF NOT EXISTS public.waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    preferred_city_id UUID NOT NULL REFERENCES public.cities(id),
    available_from DATE NOT NULL,
    match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    priority_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'PROMOTED', 'EXPIRED', 'WITHDRAWN')),
    waitlist_reason TEXT NOT NULL,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    promoted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_candidate_job_waitlist UNIQUE (candidate_id, job_id)
);

-- 8. HR CONFIGURABLE RANKING RULES TABLE
CREATE TABLE IF NOT EXISTS public.hr_ranking_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(100) NOT NULL,
    job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
    skill_weight NUMERIC(4,3) NOT NULL DEFAULT 0.40,
    experience_weight NUMERIC(4,3) NOT NULL DEFAULT 0.25,
    education_weight NUMERIC(4,3) NOT NULL DEFAULT 0.15,
    location_preference_weight NUMERIC(4,3) NOT NULL DEFAULT 0.15,
    joining_date_weight NUMERIC(4,3) NOT NULL DEFAULT 0.05,
    interview_score_weight NUMERIC(4,3) NOT NULL DEFAULT 0.00,
    min_eligibility_threshold NUMERIC(5,2) NOT NULL DEFAULT 50.0,
    auto_waitlist_below_threshold BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. INTERVIEW BOOKINGS TABLE (Separate Domain Model from Job Allocations)
CREATE TABLE IF NOT EXISTS public.interview_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interviewer_id VARCHAR(100) NOT NULL,
    interviewer_name VARCHAR(255) NOT NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
    candidate_name VARCHAR(255),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    stage VARCHAR(50) NOT NULL CHECK (stage IN ('ROUND_1_TECHNICAL', 'ROUND_2_SYSTEM_DESIGN', 'HR_BEHAVIORAL', 'FINAL_EXECUTIVE')),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW')),
    meeting_link TEXT,
    feedback_notes TEXT,
    score NUMERIC(5,2), -- Pure metadata; separate from allocation logic
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_city_vacancies_job_city ON public.city_vacancies(job_id, city_id);
CREATE INDEX IF NOT EXISTS idx_job_allocations_candidate_job ON public.job_allocations(candidate_id, job_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_allocation ON public.allocation_audit_logs(allocation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_candidate ON public.allocation_audit_logs(candidate_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_job_city ON public.waitlist_entries(job_id, preferred_city_id, status);

-- ============================================================================
-- STORED FUNCTIONS: CONCURRENCY-SAFE TRANSACTIONAL ALLOCATION (ACID)
-- ============================================================================

-- Function 1: Transactional Allocation with Row-Level Lock
CREATE OR REPLACE FUNCTION public.allocate_candidate_transactional(
    p_candidate_id UUID,
    p_job_id UUID,
    p_city_id UUID,
    p_match_score NUMERIC,
    p_decision_explanation TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_vacancy RECORD;
    v_existing_alloc RECORD;
    v_new_allocation_id UUID;
    v_city_name VARCHAR;
    v_new_status VARCHAR;
BEGIN
    -- 1. Check for duplicate active allocation for candidate & job
    SELECT id, status INTO v_existing_alloc
    FROM public.job_allocations
    WHERE candidate_id = p_candidate_id AND job_id = p_job_id;

    IF FOUND AND v_existing_alloc.status IN ('ALLOCATED', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_ACCEPTED') THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Candidate already has an active allocation for this role (Allocation ID: ' || v_existing_alloc.id || '). Duplicate allocation prevented.'
        );
    END IF;

    -- 2. Concurrency Lock: Lock the vacancy row using SELECT FOR UPDATE
    SELECT * INTO v_vacancy
    FROM public.city_vacancies
    WHERE job_id = p_job_id AND city_id = p_city_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No vacancy record found for the requested job and city.'
        );
    END IF;

    -- 3. Strict Capacity Check: Never assign to a full city
    IF (v_vacancy.allocated_count + v_vacancy.reserved_count) >= v_vacancy.total_capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Target city has reached maximum capacity (' || v_vacancy.total_capacity || '). Allocation blocked.'
        );
    END IF;

    -- 4. Atomically increment allocated_count and determine vacancy status
    UPDATE public.city_vacancies
    SET allocated_count = allocated_count + 1,
        status = CASE 
            WHEN (allocated_count + 1 + reserved_count) >= total_capacity THEN 'FULL'
            WHEN (allocated_count + 1 + reserved_count) >= (total_capacity * 0.8) THEN 'LIMITED'
            ELSE 'AVAILABLE'
        END,
        updated_at = NOW()
    WHERE id = v_vacancy.id;

    -- 5. Insert Job Allocation Record
    INSERT INTO public.job_allocations (
        candidate_id,
        job_id,
        allocated_city_id,
        status,
        match_score,
        decision_explanation,
        is_alternative_offer,
        allocated_at,
        created_at,
        updated_at
    ) VALUES (
        p_candidate_id,
        p_job_id,
        p_city_id,
        'ALLOCATED',
        p_match_score,
        p_decision_explanation,
        false,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO v_new_allocation_id;

    -- 6. Insert Immutable Audit Log
    INSERT INTO public.allocation_audit_logs (
        allocation_id,
        candidate_id,
        job_id,
        action,
        from_status,
        to_status,
        actor,
        reason,
        metadata,
        timestamp
    ) VALUES (
        v_new_allocation_id,
        p_candidate_id,
        p_job_id,
        'ALLOCATION_CONFIRMED',
        'PENDING',
        'ALLOCATED',
        'SYSTEM_ALLOCATOR',
        p_decision_explanation,
        jsonb_build_object(
            'city_id', p_city_id,
            'capacity_remaining_after', v_vacancy.total_capacity - (v_vacancy.allocated_count + 1 + v_vacancy.reserved_count)
        ),
        NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'allocation_id', v_new_allocation_id,
        'message', 'Candidate allocated successfully with transactional concurrency guarantee.'
    );
END;
$$;

-- Function 2: Candidate Accept/Reject Alternative City Offer
CREATE OR REPLACE FUNCTION public.respond_to_alternative_city_offer(
    p_allocation_id UUID,
    p_candidate_id UUID,
    p_accepted BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_alloc RECORD;
    v_vacancy RECORD;
BEGIN
    -- 1. Fetch allocation with lock
    SELECT * INTO v_alloc
    FROM public.job_allocations
    WHERE id = p_allocation_id AND candidate_id = p_candidate_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Allocation offer not found.');
    END IF;

    IF v_alloc.status != 'OFFERED_ALTERNATIVE' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Offer is no longer active (Current status: ' || v_alloc.status || ').');
    END IF;

    -- 2. Lock target city vacancy
    SELECT * INTO v_vacancy
    FROM public.city_vacancies
    WHERE job_id = v_alloc.job_id AND city_id = v_alloc.alternative_offered_city_id
    FOR UPDATE;

    IF p_accepted THEN
        -- Candidate accepted: move seat from reserved to allocated
        UPDATE public.city_vacancies
        SET reserved_count = GREATEST(0, reserved_count - 1),
            allocated_count = allocated_count + 1,
            status = CASE 
                WHEN (allocated_count + 1 + GREATEST(0, reserved_count - 1)) >= total_capacity THEN 'FULL'
                ELSE 'AVAILABLE'
            END,
            updated_at = NOW()
        WHERE id = v_vacancy.id;

        UPDATE public.job_allocations
        SET status = 'ALTERNATIVE_ACCEPTED',
            allocated_city_id = v_alloc.alternative_offered_city_id,
            allocated_at = NOW(),
            updated_at = NOW()
        WHERE id = v_alloc.id;

        INSERT INTO public.allocation_audit_logs (
            allocation_id, candidate_id, job_id, action, from_status, to_status, actor, reason
        ) VALUES (
            v_alloc.id, p_candidate_id, v_alloc.job_id, 'OFFER_ACCEPTED', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_ACCEPTED', 'CANDIDATE',
            'Candidate accepted alternative city offer.'
        );

        RETURN jsonb_build_object('success', true, 'message', 'Alternative city offer accepted and seat secured.');
    ELSE
        -- Candidate rejected: release reserved seat
        UPDATE public.city_vacancies
        SET reserved_count = GREATEST(0, reserved_count - 1),
            status = 'AVAILABLE',
            updated_at = NOW()
        WHERE id = v_vacancy.id;

        UPDATE public.job_allocations
        SET status = 'ALTERNATIVE_REJECTED',
            updated_at = NOW()
        WHERE id = v_alloc.id;

        INSERT INTO public.allocation_audit_logs (
            allocation_id, candidate_id, job_id, action, from_status, to_status, actor, reason
        ) VALUES (
            v_alloc.id, p_candidate_id, v_alloc.job_id, 'OFFER_REJECTED', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_REJECTED', 'CANDIDATE',
            'Candidate rejected alternative city offer.'
        );

        RETURN jsonb_build_object('success', true, 'message', 'Alternative city offer rejected. Seat released back to pool.');
    END IF;
END;
$$;


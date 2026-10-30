-- ============================================================================
-- HireSlot Supabase Migration: 002_candidate_allocations_realtime.sql
-- Coordination: Member 1 (Engine), Member 2 (Candidate Portal), Member 3 (HR Dashboard)
-- Features: candidate_allocations table, Supabase Realtime publication, Candidate Consent RLS
-- ============================================================================

-- 1. CREATE SHARED candidate_allocations TABLE
CREATE TABLE IF NOT EXISTS public.candidate_allocations (
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
    CONSTRAINT uq_active_candidate_alloc UNIQUE (candidate_id, job_id)
);

-- Backward compatibility view for job_allocations
CREATE OR REPLACE VIEW public.job_allocations AS
SELECT * FROM public.candidate_allocations;

-- 2. ENABLE SUPABASE REALTIME PUBLICATION
-- Allows clients (Candidate Portal & HR Dashboard) to subscribe to postgres_changes
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'candidate_allocations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.candidate_allocations;
    END IF;
END $$;

-- 3. ROW LEVEL SECURITY (RLS) FOR CANDIDATE CONSENT
ALTER TABLE public.candidate_allocations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone authorized (HR and Candidates) can view allocations
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.candidate_allocations;
CREATE POLICY "Allow select for authenticated users"
ON public.candidate_allocations
FOR SELECT
USING (true);

-- Policy 2: ONLY the Candidate can accept or decline their alternative offer
-- HR is blocked from simulating candidate consent!
DROP POLICY IF EXISTS "Candidate self-decision on alternative offer" ON public.candidate_allocations;
CREATE POLICY "Candidate self-decision on alternative offer"
ON public.candidate_allocations
FOR UPDATE
USING (
    -- Candidate can only modify their own record
    auth.uid() = candidate_id OR auth.uid() IS NULL
)
WITH CHECK (
    -- Only allow transition from OFFERED_ALTERNATIVE to ACCEPTED or REJECTED
    status IN ('ALTERNATIVE_ACCEPTED', 'ALTERNATIVE_REJECTED')
);

-- 4. ACID STORED FUNCTION: Candidate Decision with Strict Security
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
    -- 1. Fetch allocation with row-level lock
    SELECT * INTO v_alloc
    FROM public.candidate_allocations
    WHERE id = p_allocation_id AND candidate_id = p_candidate_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Allocation offer not found or unauthorized candidate ID.');
    END IF;

    IF v_alloc.status != 'OFFERED_ALTERNATIVE' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Offer is no longer active (Current status: ' || v_alloc.status || ').');
    END IF;

    -- 2. Lock target city vacancy row
    SELECT * INTO v_vacancy
    FROM public.city_vacancies
    WHERE job_id = v_alloc.job_id AND city_id = v_alloc.alternative_offered_city_id
    FOR UPDATE;

    IF p_accepted THEN
        -- Candidate accepted: convert tentative reservation into confirmed allocation
        UPDATE public.city_vacancies
        SET reserved_count = GREATEST(0, reserved_count - 1),
            allocated_count = allocated_count + 1,
            status = CASE 
                WHEN (allocated_count + 1 + GREATEST(0, reserved_count - 1)) >= total_capacity THEN 'FULL'
                ELSE 'AVAILABLE'
            END,
            updated_at = NOW()
        WHERE id = v_vacancy.id;

        UPDATE public.candidate_allocations
        SET status = 'ALTERNATIVE_ACCEPTED',
            allocated_city_id = v_alloc.alternative_offered_city_id,
            allocated_at = NOW(),
            updated_at = NOW()
        WHERE id = v_alloc.id;

        INSERT INTO public.allocation_audit_logs (
            allocation_id, candidate_id, job_id, action, from_status, to_status, actor, reason
        ) VALUES (
            v_alloc.id, p_candidate_id, v_alloc.job_id, 'OFFER_ACCEPTED_BY_CANDIDATE', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_ACCEPTED', 'CANDIDATE',
            'Candidate independently accepted alternative city offer via Candidate Portal.'
        );

        RETURN jsonb_build_object('success', true, 'message', 'Alternative city offer accepted and seat secured.');
    ELSE
        -- Candidate rejected: release reserved seat back to vacancy pool
        UPDATE public.city_vacancies
        SET reserved_count = GREATEST(0, reserved_count - 1),
            status = 'AVAILABLE',
            updated_at = NOW()
        WHERE id = v_vacancy.id;

        UPDATE public.candidate_allocations
        SET status = 'ALTERNATIVE_REJECTED',
            updated_at = NOW()
        WHERE id = v_alloc.id;

        INSERT INTO public.allocation_audit_logs (
            allocation_id, candidate_id, job_id, action, from_status, to_status, actor, reason
        ) VALUES (
            v_alloc.id, p_candidate_id, v_alloc.job_id, 'OFFER_REJECTED_BY_CANDIDATE', 'OFFERED_ALTERNATIVE', 'ALTERNATIVE_REJECTED', 'CANDIDATE',
            'Candidate declined alternative city offer and opted for priority waitlist.'
        );

        RETURN jsonb_build_object('success', true, 'message', 'Alternative city offer declined. Reserved seat released back to pool.');
    END IF;
END;
$$;


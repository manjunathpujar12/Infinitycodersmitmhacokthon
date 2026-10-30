-- Migration 09: Comprehensive RLS Policy Completion, Integration RPCs, and Private Receipts Bucket
-- HireSlot Backend System

-- ============================================================================
-- 1. STORAGE BUCKET: receipts
-- ============================================================================
-- Ensure private 'receipts' bucket is registered alongside 'claim-receipts'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    false,
    10485760, -- 10MB limit
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS policies for 'receipts' bucket
DROP POLICY IF EXISTS "storage_receipts_insert" ON storage.objects;
CREATE POLICY "storage_receipts_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'receipts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

DROP POLICY IF EXISTS "storage_receipts_select" ON storage.objects;
CREATE POLICY "storage_receipts_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() IN ('admin', 'hr_staff', 'payroll_officer')
        )
    );

DROP POLICY IF EXISTS "storage_receipts_delete" ON storage.objects;
CREATE POLICY "storage_receipts_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- ============================================================================
-- 2. COMPLETE MISSING RLS POLICIES FOR ALL ROLES
-- ============================================================================

-- Create candidate_allocations before earlier profile policies reference it.
-- ----------------------------------------------------------------------------
-- 2.9. CANDIDATE ALLOCATIONS TABLE & RLS POLICIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.candidate_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_opening_id UUID NOT NULL REFERENCES public.job_openings(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'allocated' CHECK (status IN ('allocated', 'overflow', 'declined', 'cancelled')),
    is_overflow BOOLEAN NOT NULL DEFAULT FALSE,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    allocated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_candidate_job_allocation UNIQUE (candidate_id, job_opening_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_allocations_lookup 
    ON public.candidate_allocations(job_opening_id, location_id, status);
CREATE INDEX IF NOT EXISTS idx_candidate_allocations_candidate 
    ON public.candidate_allocations(candidate_id);

ALTER TABLE public.candidate_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "candidate_allocations_select" ON public.candidate_allocations;
CREATE POLICY "candidate_allocations_select" ON public.candidate_allocations
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.job_openings j
            WHERE j.id = candidate_allocations.job_opening_id
              AND public.has_hr_permission(j.company_id, candidate_allocations.location_id)
        )
    );

DROP POLICY IF EXISTS "candidate_allocations_modify_hr" ON public.candidate_allocations;
DROP POLICY IF EXISTS "candidate_allocations_modify_admin" ON public.candidate_allocations;
CREATE POLICY "candidate_allocations_modify_admin" ON public.candidate_allocations
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
    );




-- ----------------------------------------------------------------------------
-- 2.1. PROFILES POLICIES (Admin Insert/Delete & HR Candidate Updates)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
    FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin" ON public.profiles
    FOR DELETE USING (public.get_current_user_role() = 'admin');

DROP POLICY IF EXISTS "profiles_update_hr_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_hr_or_admin" ON public.profiles
    FOR UPDATE USING (
        public.get_current_user_role() = 'admin'
        OR (
            public.get_current_user_role() = 'hr_staff'
            AND role = 'candidate'
            AND EXISTS (
                SELECT 1 FROM public.hr_permissions hp
                WHERE hp.user_id = auth.uid()
                  AND (
                      EXISTS (
                          SELECT 1 FROM public.candidate_allocations ca
                          JOIN public.job_openings j ON ca.job_opening_id = j.id
                          WHERE ca.candidate_id = profiles.id
                            AND j.company_id = hp.company_id
                            AND (hp.location_id IS NULL OR hp.location_id = ca.location_id)
                      )
                      OR EXISTS (
                          SELECT 1 FROM public.interview_bookings ib
                          JOIN public.interview_slots s ON ib.slot_id = s.id
                          JOIN public.interview_stages st ON s.stage_id = st.id
                          JOIN public.job_openings j ON st.job_opening_id = j.id
                          WHERE ib.candidate_id = profiles.id
                            AND j.company_id = hp.company_id
                            AND (hp.location_id IS NULL OR hp.location_id = s.location_id)
                      )
                      OR EXISTS (
                          SELECT 1 FROM public.interview_waitlist iw
                          JOIN public.interview_stages st ON iw.stage_id = st.id
                          JOIN public.job_openings j ON st.job_opening_id = j.id
                          WHERE iw.candidate_id = profiles.id
                            AND j.company_id = hp.company_id
                            AND (hp.location_id IS NULL OR iw.location_id IS NULL OR hp.location_id = iw.location_id)
                      )
                  )
            )
        )
    )
    WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR (public.get_current_user_role() = 'hr_staff' AND role = 'candidate')
    );

-- ----------------------------------------------------------------------------
-- 2.2. INTERVIEW BOOKINGS POLICIES (Insert & Delete for Candidates/HR/Admin)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "bookings_insert_candidate_or_hr" ON public.interview_bookings;
CREATE POLICY "bookings_insert_candidate_or_hr" ON public.interview_bookings
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = interview_bookings.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

DROP POLICY IF EXISTS "bookings_delete_admin_hr" ON public.interview_bookings;
CREATE POLICY "bookings_delete_admin_hr" ON public.interview_bookings
    FOR DELETE USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = interview_bookings.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 2.3. INTERVIEW WAITLIST POLICIES (Insert, Update, Delete with Location Scoping)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "waitlist_select" ON public.interview_waitlist;
CREATE POLICY "waitlist_select" ON public.interview_waitlist
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_waitlist.stage_id
              AND public.has_hr_permission(j.company_id, interview_waitlist.location_id)
        )
    );

DROP POLICY IF EXISTS "waitlist_insert" ON public.interview_waitlist;
CREATE POLICY "waitlist_insert" ON public.interview_waitlist
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_waitlist.stage_id
              AND public.has_hr_permission(j.company_id, interview_waitlist.location_id)
        )
    );

DROP POLICY IF EXISTS "waitlist_update" ON public.interview_waitlist;
CREATE POLICY "waitlist_update" ON public.interview_waitlist
    FOR UPDATE USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_waitlist.stage_id
              AND public.has_hr_permission(j.company_id, interview_waitlist.location_id)
        )
    );

DROP POLICY IF EXISTS "waitlist_delete" ON public.interview_waitlist;
CREATE POLICY "waitlist_delete" ON public.interview_waitlist
    FOR DELETE USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_waitlist.stage_id
              AND public.has_hr_permission(j.company_id, interview_waitlist.location_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 2.4. TIMED SLOT OFFERS POLICIES (Insert, Update, Delete)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "timed_offers_insert_hr" ON public.timed_slot_offers;
CREATE POLICY "timed_offers_insert_hr" ON public.timed_slot_offers
    FOR INSERT WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = timed_slot_offers.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

DROP POLICY IF EXISTS "timed_offers_update" ON public.timed_slot_offers;
CREATE POLICY "timed_offers_update" ON public.timed_slot_offers
    FOR UPDATE USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = timed_slot_offers.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

DROP POLICY IF EXISTS "timed_offers_delete" ON public.timed_slot_offers;
CREATE POLICY "timed_offers_delete" ON public.timed_slot_offers
    FOR DELETE USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = timed_slot_offers.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

-- ----------------------------------------------------------------------------
-- 2.5. ATTENDANCE RECORDS POLICIES (Insert, Update, Delete for Interviewers & HR)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_insert_interviewer_hr" ON public.attendance_records;
CREATE POLICY "attendance_insert_interviewer_hr" ON public.attendance_records
    FOR INSERT WITH CHECK (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_bookings b
            JOIN public.interview_slots s ON b.slot_id = s.id
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE b.id = attendance_records.booking_id
              AND (
                  s.interviewer_id = auth.uid()
                  OR public.has_hr_permission(j.company_id, s.location_id)
              )
        )
    );

DROP POLICY IF EXISTS "attendance_update_interviewer_hr" ON public.attendance_records;
CREATE POLICY "attendance_update_interviewer_hr" ON public.attendance_records
    FOR UPDATE USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_bookings b
            JOIN public.interview_slots s ON b.slot_id = s.id
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE b.id = attendance_records.booking_id
              AND (
                  s.interviewer_id = auth.uid()
                  OR public.has_hr_permission(j.company_id, s.location_id)
              )
        )
    );

DROP POLICY IF EXISTS "attendance_delete_admin" ON public.attendance_records;
CREATE POLICY "attendance_delete_admin" ON public.attendance_records
    FOR DELETE USING (public.get_current_user_role() = 'admin');

-- ----------------------------------------------------------------------------
-- 2.6. ABSENCE CASES POLICIES (HR Review & Admin Management)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "absence_cases_update_hr_admin" ON public.absence_cases;
CREATE POLICY "absence_cases_update_hr_admin" ON public.absence_cases
    FOR UPDATE USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_bookings b
            JOIN public.interview_slots s ON b.slot_id = s.id
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE b.id = absence_cases.booking_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

DROP POLICY IF EXISTS "absence_cases_delete_candidate_admin" ON public.absence_cases;
CREATE POLICY "absence_cases_delete_candidate_admin" ON public.absence_cases
    FOR DELETE USING (
        (candidate_id = auth.uid() AND status = 'submitted')
        OR public.get_current_user_role() = 'admin'
    );

-- ----------------------------------------------------------------------------
-- 2.7. EXPENSE CLAIMS POLICIES (HR Review Updates & Draft Deletion)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "expense_claims_update_hr_review" ON public.expense_claims;
CREATE POLICY "expense_claims_update_hr_review" ON public.expense_claims
    FOR UPDATE USING (
        public.get_current_user_role() IN ('admin', 'payroll_officer')
        OR public.has_hr_permission(company_id)
    );

DROP POLICY IF EXISTS "expense_claims_delete_draft" ON public.expense_claims;
CREATE POLICY "expense_claims_delete_draft" ON public.expense_claims
    FOR DELETE USING (
        (status = 'draft' AND user_id = auth.uid())
        OR public.get_current_user_role() = 'admin'
    );

-- ----------------------------------------------------------------------------
-- 2.8. AUDIT LOGS SECURITY POLICIES
-- ----------------------------------------------------------------------------
-- Ordinary authenticated users cannot directly forge audit records.
-- Direct INSERT is restricted strictly to administrators.
-- All legitimate audit entries from atomic workflows are generated by trusted
-- SECURITY DEFINER functions (allocate_candidate, fast_fill_slot, process_payroll_batch,
-- book_interview_slot, mark_interview_attendance) or triggers.
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');

-- ============================================================================
-- 3. INTEGRATION RPC 1: allocate_candidate
-- ============================================================================
-- Atomically checks city capacity quota with FOR UPDATE row locking, prevents
-- duplicate allocations, creates candidate allocation record, handles overflow,
-- and audits the action.
DROP FUNCTION IF EXISTS public.allocate_candidate(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.allocate_candidate(UUID, UUID, UUID, BOOLEAN);

CREATE OR REPLACE FUNCTION public.allocate_candidate(
    p_candidate_id UUID,
    p_job_opening_id UUID,
    p_location_id UUID,
    p_allow_overflow BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_job RECORD;
    v_location RECORD;
    v_candidate RECORD;
    v_vacancy RECORD;
    v_existing RECORD;
    v_allocation_id UUID;
    v_is_overflow BOOLEAN := FALSE;
    v_status VARCHAR(32) := 'allocated';
    v_new_allocated INT;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

    -- Strict verification: Caller must have a registered profile and role
    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    -- 1. Validate Job Opening exists and is active
    SELECT * INTO v_job
    FROM public.job_openings
    WHERE id = p_job_opening_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job opening not found with id: %', p_job_opening_id;
    END IF;

    IF NOT v_job.is_active THEN
        RAISE EXCEPTION 'Cannot allocate candidates to an inactive job opening.';
    END IF;

    -- 2. Validate Location belongs to Company
    SELECT * INTO v_location
    FROM public.locations
    WHERE id = p_location_id AND company_id = v_job.company_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Location % does not belong to company %.', p_location_id, v_job.company_id;
    END IF;

    -- 3. Authorization Check: Admin or HR authorized for company & location
    IF v_actor_role = 'admin' THEN
        NULL;
    ELSIF v_actor_role = 'hr_staff' AND public.has_hr_permission(v_job.company_id, p_location_id) THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Caller does not possess HR permissions for company % and location %.',
            v_job.company_id, p_location_id;
    END IF;

    -- 4. Lock Candidate Profile row (FOR UPDATE) to serialize concurrent requests for this candidate
    SELECT * INTO v_candidate
    FROM public.profiles
    WHERE id = p_candidate_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Candidate profile not found with id: %', p_candidate_id;
    END IF;

    -- 5. Acquire explicit FOR UPDATE lock on target city vacancy quota
    SELECT * INTO v_vacancy
    FROM public.city_vacancies
    WHERE job_opening_id = p_job_opening_id
      AND location_id = p_location_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'City vacancy quota record not found for job % at location %.',
            p_job_opening_id, p_location_id;
    END IF;

    -- 6. Duplicate Allocation Prevention: check existing allocation under row locks
    SELECT * INTO v_existing
    FROM public.candidate_allocations
    WHERE candidate_id = p_candidate_id
      AND job_opening_id = p_job_opening_id
    FOR UPDATE;

    IF FOUND AND v_existing.status = 'allocated' THEN
        RAISE EXCEPTION 'Duplicate Allocation: Candidate % is already allocated to job opening % at location %.',
            p_candidate_id, p_job_opening_id, v_existing.location_id;
    END IF;

    -- 7. Capacity & Overflow Handling
    IF v_vacancy.allocated_count >= v_vacancy.total_capacity THEN
        IF p_allow_overflow THEN
            -- Overflow allowed: flag as overflow, do not exceed physical capacity quota
            v_is_overflow := TRUE;
            v_status := 'overflow';
            v_new_allocated := v_vacancy.allocated_count;
        ELSE
            RAISE EXCEPTION 'City capacity exceeded for location %. Total capacity: %, currently allocated: %.',
                v_location.city, v_vacancy.total_capacity, v_vacancy.allocated_count;
        END IF;
    ELSE
        -- Within capacity: allocate normally
        v_new_allocated := v_vacancy.allocated_count + 1;
        UPDATE public.city_vacancies
        SET 
            allocated_count = v_new_allocated,
            updated_at = now()
        WHERE id = v_vacancy.id;
    END IF;

    -- 8. Candidate Allocation Record Creation (Upsert)
    INSERT INTO public.candidate_allocations (
        candidate_id,
        job_opening_id,
        location_id,
        status,
        is_overflow,
        allocated_at,
        allocated_by,
        metadata
    ) VALUES (
        p_candidate_id,
        p_job_opening_id,
        p_location_id,
        v_status,
        v_is_overflow,
        now(),
        v_actor_id,
        jsonb_build_object(
            'city', v_location.city,
            'job_title', v_job.title,
            'allocated_by_role', v_actor_role::text
        )
    )
    ON CONFLICT (candidate_id, job_opening_id) DO UPDATE
    SET 
        location_id = EXCLUDED.location_id,
        status = EXCLUDED.status,
        is_overflow = EXCLUDED.is_overflow,
        allocated_at = now(),
        allocated_by = EXCLUDED.allocated_by,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    RETURNING id INTO v_allocation_id;

    -- Synchronize candidate profile metadata
    UPDATE public.profiles
    SET 
        metadata = jsonb_set(
            jsonb_set(
                metadata, 
                '{allocated_city}', 
                to_jsonb(v_location.city)
            ),
            '{allocation_details}',
            jsonb_build_object(
                'allocation_id', v_allocation_id,
                'job_opening_id', p_job_opening_id,
                'location_id', p_location_id,
                'city', v_location.city,
                'status', v_status,
                'is_overflow', v_is_overflow,
                'allocated_at', now(),
                'allocated_by', v_actor_id
            )
        ),
        updated_at = now()
    WHERE id = p_candidate_id;

    -- 9. Audit Log
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        actor_id,
        actor_role,
        new_data
    ) VALUES (
        'candidate_allocations',
        v_allocation_id,
        'RPC_CALL',
        v_actor_id,
        v_actor_role::text,
        jsonb_build_object(
            'function', 'allocate_candidate',
            'allocation_id', v_allocation_id,
            'job_opening_id', p_job_opening_id,
            'location_id', p_location_id,
            'candidate_id', p_candidate_id,
            'status', v_status,
            'is_overflow', v_is_overflow,
            'allocated_count', v_new_allocated,
            'total_capacity', v_vacancy.total_capacity
        )
    );

    -- 10. Exact Structured JSON Return
    RETURN jsonb_build_object(
        'success', true,
        'allocation_id', v_allocation_id,
        'candidate_id', p_candidate_id,
        'job_opening_id', p_job_opening_id,
        'location_id', p_location_id,
        'city', v_location.city,
        'status', v_status,
        'is_overflow', v_is_overflow,
        'allocated_count', v_new_allocated,
        'total_capacity', v_vacancy.total_capacity,
        'remaining_capacity', (v_vacancy.total_capacity - v_new_allocated)
    );
END;
$$;


-- ============================================================================
-- 4. INTEGRATION RPC 2: fast_fill_slot
-- ============================================================================
-- Atomically recovers an open or newly cancelled slot by promoting or offering
-- the slot to the highest-priority waiting candidate in interview_waitlist.
CREATE OR REPLACE FUNCTION public.fast_fill_slot(
    p_slot_id UUID,
    p_auto_confirm BOOLEAN DEFAULT TRUE,
    p_validity_minutes INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_slot RECORD;
    v_stage RECORD;
    v_job RECORD;
    v_waitlist RECORD;
    v_booking_id UUID;
    v_offer_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    -- 1. Lock slot row for concurrency control (FOR UPDATE)
    SELECT * INTO v_slot
    FROM public.interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Interview slot not found with id: %', p_slot_id;
    END IF;

    SELECT * INTO v_stage
    FROM public.interview_stages
    WHERE id = v_slot.stage_id;

    SELECT * INTO v_job
    FROM public.job_openings
    WHERE id = v_stage.job_opening_id;

    -- 2. Authorization check: Admin, authorized HR, or the assigned interviewer
    IF v_actor_role = 'admin' THEN
        NULL;
    ELSIF v_actor_id = v_slot.interviewer_id THEN
        NULL;
    ELSIF v_actor_role = 'hr_staff' AND public.has_hr_permission(v_job.company_id, v_slot.location_id) THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Caller cannot perform slot recovery for this slot.';
    END IF;

    -- 3. Verify slot has available capacity
    IF v_slot.booked_count >= v_slot.max_capacity THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Slot has no available capacity to fast-fill.'
        );
    END IF;

    -- 4. Find the next waiting candidate in queue (matching stage and location if scoped)
    SELECT * INTO v_waitlist
    FROM public.interview_waitlist
    WHERE stage_id = v_slot.stage_id
      AND status = 'waiting'
      AND (location_id IS NULL OR location_id = v_slot.location_id)
    ORDER BY position ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No eligible waitlisted candidates found for this stage and location.'
        );
    END IF;

    -- 5. Fast-Fill Execution
    IF p_auto_confirm THEN
        -- Instant Promotion: Create confirmed booking directly
        INSERT INTO public.interview_bookings (
            slot_id,
            candidate_id,
            status,
            booked_at
        ) VALUES (
            p_slot_id,
            v_waitlist.candidate_id,
            'confirmed',
            now()
        ) RETURNING id INTO v_booking_id;

        -- Increment slot booked count and set status
        UPDATE public.interview_slots
        SET 
            booked_count = booked_count + 1,
            status = CASE 
                WHEN booked_count + 1 >= max_capacity THEN 'booked'::slot_status
                ELSE 'open'::slot_status
            END,
            updated_at = now()
        WHERE id = p_slot_id;

        -- Update waitlist entry to accepted
        UPDATE public.interview_waitlist
        SET status = 'accepted', updated_at = now()
        WHERE id = v_waitlist.id;

        -- Audit log
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            actor_id,
            actor_role,
            new_data
        ) VALUES (
            'interview_bookings',
            v_booking_id,
            'RPC_CALL',
            v_actor_id,
            v_actor_role::text,
            jsonb_build_object(
                'function', 'fast_fill_slot',
                'action', 'auto_confirmed',
                'slot_id', p_slot_id,
                'candidate_id', v_waitlist.candidate_id,
                'booking_id', v_booking_id
            )
        );

        RETURN jsonb_build_object(
            'success', true,
            'action', 'auto_confirmed',
            'slot_id', p_slot_id,
            'candidate_id', v_waitlist.candidate_id,
            'booking_id', v_booking_id,
            'waitlist_id', v_waitlist.id
        );
    ELSE
        -- Priority Timed Offer: Give candidate a limited time window to claim
        v_expires_at := now() + (p_validity_minutes || ' minutes')::interval;

        INSERT INTO public.timed_slot_offers (
            waitlist_id,
            slot_id,
            candidate_id,
            offered_at,
            expires_at,
            status
        ) VALUES (
            v_waitlist.id,
            p_slot_id,
            v_waitlist.candidate_id,
            now(),
            v_expires_at,
            'pending'
        ) RETURNING id INTO v_offer_id;

        UPDATE public.interview_waitlist
        SET status = 'offered', updated_at = now()
        WHERE id = v_waitlist.id;

        RETURN jsonb_build_object(
            'success', true,
            'action', 'timed_offer_created',
            'slot_id', p_slot_id,
            'candidate_id', v_waitlist.candidate_id,
            'offer_id', v_offer_id,
            'expires_at', v_expires_at
        );
    END IF;
END;
$$;


-- ============================================================================
-- 5. INTEGRATION RPC 3: process_payroll_batch
-- ============================================================================
-- Atomically processes an entire batch of HR-approved expense claims,
-- generates settlement payouts, marks claims as 'paid', and audits the run.
CREATE OR REPLACE FUNCTION public.process_payroll_batch(
    p_batch_reference VARCHAR(128),
    p_claim_ids UUID[] DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_claim RECORD;
    v_processed_count INT := 0;
    v_total_payout NUMERIC := 0.00;
    v_processed_claim_ids UUID[] := ARRAY[]::UUID[];
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

    -- Strict authorization check: Only payroll officers or administrators
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('payroll_officer', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only payroll officers or administrators can process payroll batches.';
    END IF;

    IF p_batch_reference IS NULL OR trim(p_batch_reference) = '' THEN
        RAISE EXCEPTION 'Batch reference cannot be null or empty.';
    END IF;

    -- Iterate and process all eligible claims with row locking (FOR UPDATE)
    FOR v_claim IN
        SELECT id, user_id, company_id, approved_amount, currency, status
        FROM public.expense_claims
        WHERE status = 'hr_approved'
          AND (p_claim_ids IS NULL OR id = ANY(p_claim_ids))
        ORDER BY created_at ASC
        FOR UPDATE
    LOOP
        -- Upsert payout settlement record
        INSERT INTO public.claim_payouts (
            claim_id,
            payment_status,
            payout_reference,
            payout_amount,
            currency,
            bank_account_last4,
            processed_at,
            processed_by,
            notes
        ) VALUES (
            v_claim.id,
            'processed',
            p_batch_reference || '-' || substr(v_claim.id::text, 1, 8),
            v_claim.approved_amount,
            v_claim.currency,
            '0000', -- Masked standard settlement placeholder
            now(),
            v_actor_id,
            COALESCE(p_notes, 'Processed via payroll batch ' || p_batch_reference)
        )
        ON CONFLICT (claim_id) DO UPDATE
        SET 
            payment_status = 'processed',
            payout_reference = EXCLUDED.payout_reference,
            payout_amount = EXCLUDED.payout_amount,
            processed_at = now(),
            processed_by = v_actor_id,
            notes = EXCLUDED.notes,
            updated_at = now();

        -- Transition claim status to paid
        UPDATE public.expense_claims
        SET status = 'paid', updated_at = now()
        WHERE id = v_claim.id;

        v_processed_count := v_processed_count + 1;
        v_total_payout := v_total_payout + v_claim.approved_amount;
        v_processed_claim_ids := array_append(v_processed_claim_ids, v_claim.id);

        -- Audit log per claim settlement
        INSERT INTO public.audit_logs (
            table_name,
            record_id,
            action,
            actor_id,
            actor_role,
            new_data
        ) VALUES (
            'expense_claims',
            v_claim.id,
            'RPC_CALL',
            v_actor_id,
            v_actor_role::text,
            jsonb_build_object(
                'function', 'process_payroll_batch',
                'batch_reference', p_batch_reference,
                'claim_id', v_claim.id,
                'status', 'paid',
                'payout_amount', v_claim.approved_amount
            )
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'batch_reference', p_batch_reference,
        'processed_count', v_processed_count,
        'total_payout_amount', v_total_payout,
        'processed_claim_ids', v_processed_claim_ids
    );
END;
$$;

-- ============================================================================
-- 6. REALTIME SUBSCRIPTIONS & EVENT STREAMING
-- ============================================================================
-- Enable change-data-capture publication for live frontend dashboard updates
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_slots;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_bookings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.interview_waitlist;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.city_vacancies;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expense_claims;
EXCEPTION
    WHEN undefined_object THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 7. HARDENED SECURITY DEFINER RPC OVERRIDES
-- ============================================================================

-- 7.1. allocate_city_vacancy: Strictly authenticated & HR/Admin scoped
CREATE OR REPLACE FUNCTION public.allocate_city_vacancy(
    p_job_opening_id UUID,
    p_location_id UUID,
    p_count INT DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_job RECORD;
    v_vacancy RECORD;
    v_new_allocated INT;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    -- Validate Job Opening exists
    SELECT * INTO v_job
    FROM public.job_openings
    WHERE id = p_job_opening_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Job opening not found with id: %', p_job_opening_id;
    END IF;

    -- Authorization Check: Admin or HR authorized for company & location
    IF v_actor_role = 'admin' THEN
        NULL;
    ELSIF v_actor_role = 'hr_staff' AND public.has_hr_permission(v_job.company_id, p_location_id) THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Caller does not possess HR permissions for company % and location %.',
            v_job.company_id, p_location_id;
    END IF;

    IF p_count <= 0 THEN
        RAISE EXCEPTION 'Allocation count must be greater than zero.';
    END IF;

    -- Lock the vacancy record for the specified job opening and location
    SELECT * INTO v_vacancy
    FROM public.city_vacancies
    WHERE job_opening_id = p_job_opening_id
      AND location_id = p_location_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Vacancy quota record not found for job_opening: % and location: %',
            p_job_opening_id, p_location_id;
    END IF;

    v_new_allocated := v_vacancy.allocated_count + p_count;

    IF v_new_allocated > v_vacancy.total_capacity THEN
        RAISE EXCEPTION 'Cannot allocate % vacancies. Total capacity: %, currently allocated: % (Remaining: %).',
            p_count, v_vacancy.total_capacity, v_vacancy.allocated_count, (v_vacancy.total_capacity - v_vacancy.allocated_count);
    END IF;

    UPDATE public.city_vacancies
    SET
        allocated_count = v_new_allocated,
        updated_at = now()
    WHERE id = v_vacancy.id;

    RETURN jsonb_build_object(
        'success', true,
        'vacancy_id', v_vacancy.id,
        'job_opening_id', p_job_opening_id,
        'location_id', p_location_id,
        'allocated_count', v_new_allocated,
        'total_capacity', v_vacancy.total_capacity,
        'remaining_capacity', (v_vacancy.total_capacity - v_new_allocated)
    );
END;
$$;

-- 7.2. offer_slot_to_next_waitlisted: Scoped to Admin, Interviewer, or HR
CREATE OR REPLACE FUNCTION public.offer_slot_to_next_waitlisted(
    p_slot_id UUID,
    p_validity_minutes INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_slot RECORD;
    v_stage RECORD;
    v_job RECORD;
    v_waitlist RECORD;
    v_offer_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    -- 1. Check and lock slot
    SELECT * INTO v_slot
    FROM public.interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Slot not found: %', p_slot_id;
    END IF;

    SELECT * INTO v_stage
    FROM public.interview_stages
    WHERE id = v_slot.stage_id;

    SELECT * INTO v_job
    FROM public.job_openings
    WHERE id = v_stage.job_opening_id;

    -- Authorization check: Admin, assigned interviewer, or HR with permission for company & location
    IF v_actor_role = 'admin' THEN
        NULL;
    ELSIF v_actor_id = v_slot.interviewer_id THEN
        NULL;
    ELSIF v_actor_role = 'hr_staff' AND public.has_hr_permission(v_job.company_id, v_slot.location_id) THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Caller cannot offer this slot.';
    END IF;

    IF v_slot.booked_count >= v_slot.max_capacity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Slot has no available capacity.');
    END IF;

    -- 2. Find next waiting candidate in queue (locking row, matching location if present)
    SELECT * INTO v_waitlist
    FROM public.interview_waitlist
    WHERE stage_id = v_slot.stage_id
      AND status = 'waiting'
      AND (location_id IS NULL OR location_id = v_slot.location_id)
    ORDER BY position ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No waiting candidates found in queue.');
    END IF;

    -- 3. Calculate expiration timestamp
    v_expires_at := now() + (p_validity_minutes || ' minutes')::interval;

    -- 4. Create timed offer
    INSERT INTO public.timed_slot_offers (
        waitlist_id,
        slot_id,
        candidate_id,
        offered_at,
        expires_at,
        status
    ) VALUES (
        v_waitlist.id,
        p_slot_id,
        v_waitlist.candidate_id,
        now(),
        v_expires_at,
        'pending'
    ) RETURNING id INTO v_offer_id;

    -- 5. Update waitlist status
    UPDATE public.interview_waitlist
    SET
        status = 'offered',
        updated_at = now()
    WHERE id = v_waitlist.id;

    RETURN jsonb_build_object(
        'success', true,
        'offer_id', v_offer_id,
        'slot_id', p_slot_id,
        'candidate_id', v_waitlist.candidate_id,
        'expires_at', v_expires_at
    );
END;
$$;

-- 7.3. process_expired_offers: Trusted service_role or admin execution only
CREATE OR REPLACE FUNCTION public.process_expired_offers()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_jwt_role TEXT;
    v_offer RECORD;
    v_count INT := 0;
BEGIN
    -- Check if called via Supabase service_role (e.g. pg_cron, background worker, or Supabase edge function)
    v_jwt_role := current_setting('request.jwt.claim.role', true);

    IF v_jwt_role = 'service_role' THEN
        -- Trusted service role execution allowed
        NULL;
    ELSE
        -- Interactive caller: must be an authenticated admin
        v_actor_id := auth.uid();
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: process_expired_offers requires administrative or service_role privilege.';
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

        IF v_actor_role IS NULL OR v_actor_role != 'admin' THEN
            RAISE EXCEPTION 'Unauthorized: Only administrators or trusted background workers can process expired offers.';
        END IF;
    END IF;

    FOR v_offer IN
        SELECT o.id, o.slot_id, o.waitlist_id
        FROM public.timed_slot_offers o
        WHERE o.status = 'pending'
          AND o.expires_at < now()
        FOR UPDATE
    LOOP
        UPDATE public.timed_slot_offers
        SET status = 'expired', response_at = now()
        WHERE id = v_offer.id;

        UPDATE public.interview_waitlist
        SET status = 'expired', updated_at = now()
        WHERE id = v_offer.waitlist_id;

        -- Promote next waitlisted candidate for this slot
        PERFORM public.offer_slot_to_next_waitlisted(v_offer.slot_id, 30);

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- ============================================================================
-- 8. RESTRICT FUNCTION EXECUTION PRIVILEGES (REVOKE/GRANT)
-- ============================================================================
-- Revoke PUBLIC execution on all SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public.allocate_candidate(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.allocate_city_vacancy(UUID, UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fast_fill_slot(UUID, BOOLEAN, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_payroll_batch(VARCHAR, UUID[], TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.offer_slot_to_next_waitlisted(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_expired_offers() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_expired_offers() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.book_interview_slot(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_interview_waitlist(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_timed_slot_offer(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_interview_attendance(UUID, attendance_status, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_absence_case(UUID, VARCHAR, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_absence_case(UUID, absence_case_status, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_expense_claim(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_expense_claim(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_claim_payout(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;

-- Grant execution to authenticated users and service_role
GRANT EXECUTE ON FUNCTION public.allocate_candidate(UUID, UUID, UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_city_vacancy(UUID, UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fast_fill_slot(UUID, BOOLEAN, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_payroll_batch(VARCHAR, UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.offer_slot_to_next_waitlisted(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_expired_offers() TO service_role;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_interview_waitlist(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_timed_slot_offer(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_interview_attendance(UUID, attendance_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_absence_case(UUID, VARCHAR, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_absence_case(UUID, absence_case_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_expense_claim(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_expense_claim(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_claim_payout(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated, service_role;



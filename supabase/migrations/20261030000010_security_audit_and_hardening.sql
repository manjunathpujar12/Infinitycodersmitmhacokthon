-- Migration 10: Final Backend Security Audit, Privilege Hardening, and Scoped Storage/Profile Policies
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. INTERNAL ATOMIC WAITLIST PROMOTION & BACKGROUND PROCESSING (ISSUE A)
-- ============================================================================

-- 1.1. Internal promotion routine: atomic, concurrency-safe, reusable
CREATE OR REPLACE FUNCTION public._internal_promote_next_waitlisted_candidate(
    p_slot_id UUID,
    p_validity_minutes INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_slot RECORD;
    v_waitlist RECORD;
    v_offer_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- 1. Check and lock slot
    SELECT * INTO v_slot
    FROM public.interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Slot not found: ' || p_slot_id::text);
    END IF;

    IF v_slot.booked_count >= v_slot.max_capacity THEN
        RETURN jsonb_build_object('success', false, 'message', 'Slot has no available capacity.');
    END IF;

    -- 2. Find next waiting candidate in queue (locking row, matching stage and location)
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

-- 1.2. process_expired_offers: Supports trusted service_role (cron/edge) and interactive admin
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
        -- Trusted service role execution allowed without interactive auth.uid()
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

        -- Promote next waitlisted candidate for this slot via trusted internal routine
        PERFORM public._internal_promote_next_waitlisted_candidate(v_offer.slot_id, 30);

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- 1.3. offer_slot_to_next_waitlisted: Supports service_role and interactive Admin/Interviewer/HR
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
    v_jwt_role TEXT;
    v_slot RECORD;
    v_stage RECORD;
    v_job RECORD;
BEGIN
    v_jwt_role := current_setting('request.jwt.claim.role', true);

    IF v_jwt_role = 'service_role' THEN
        -- Trusted background execution allowed
        NULL;
    ELSE
        -- Interactive user execution: strictly authenticated & authorized
        v_actor_id := auth.uid();
        IF v_actor_id IS NULL THEN
            RAISE EXCEPTION 'Authentication required.';
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;

        IF v_actor_role IS NULL THEN
            RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
        END IF;

        SELECT * INTO v_slot
        FROM public.interview_slots
        WHERE id = p_slot_id;

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
    END IF;

    -- Delegate to atomic promotion helper
    RETURN public._internal_promote_next_waitlisted_candidate(p_slot_id, p_validity_minutes);
END;
$$;


-- ============================================================================
-- 2. ATTENDANCE AUTHORIZATION & CHAIN VERIFICATION (ISSUE B)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.mark_interview_attendance(
    p_booking_id UUID,
    p_status attendance_status,
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
    v_booking RECORD;
    v_attendance_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to mark attendance.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    -- Fetch and verify complete relationship chain: booking -> slot -> stage -> job -> company
    SELECT 
        b.id,
        b.candidate_id,
        b.status AS booking_status,
        s.id AS slot_id,
        s.interviewer_id,
        s.location_id,
        st.id AS stage_id,
        j.id AS job_opening_id,
        j.company_id
    INTO v_booking
    FROM public.interview_bookings b
    JOIN public.interview_slots s ON b.slot_id = s.id
    JOIN public.interview_stages st ON s.stage_id = st.id
    JOIN public.job_openings j ON st.job_opening_id = j.id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Interview booking not found with id: %', p_booking_id;
    END IF;

    IF v_booking.booking_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot mark attendance for a cancelled interview booking.';
    END IF;

    -- Explicit Authorization Matrix:
    --    - Admin: System-wide
    --    - Assigned Interviewer: Strictly s.interviewer_id = v_actor_id
    --    - HR Staff: Must hold explicit HR permission for (v_booking.company_id, v_booking.location_id)
    IF v_actor_role = 'admin' THEN
        NULL;
    ELSIF v_actor_id = v_booking.interviewer_id THEN
        NULL;
    ELSIF v_actor_role = 'hr_staff' AND public.has_hr_permission(v_booking.company_id, v_booking.location_id) THEN
        NULL;
    ELSE
        RAISE EXCEPTION 'Unauthorized: Caller cannot mark attendance for booking % in company % and location %.',
            p_booking_id, v_booking.company_id, v_booking.location_id;
    END IF;

    -- Upsert attendance record
    INSERT INTO public.attendance_records (
        booking_id,
        candidate_id,
        status,
        check_in_time,
        marked_by,
        notes
    ) VALUES (
        p_booking_id,
        v_booking.candidate_id,
        p_status,
        CASE WHEN p_status IN ('attended', 'late') THEN now() ELSE NULL END,
        v_actor_id,
        p_notes
    )
    ON CONFLICT (booking_id) DO UPDATE
    SET 
        status = EXCLUDED.status,
        check_in_time = COALESCE(EXCLUDED.check_in_time, attendance_records.check_in_time),
        marked_by = EXCLUDED.marked_by,
        notes = EXCLUDED.notes,
        updated_at = now()
    RETURNING id INTO v_attendance_id;

    -- Synchronize booking status
    UPDATE public.interview_bookings
    SET 
        status = CASE 
            WHEN p_status IN ('attended', 'late') THEN 'attended'::booking_status
            WHEN p_status = 'absent_unexcused' THEN 'no_show'::booking_status
            ELSE status 
        END,
        updated_at = now()
    WHERE id = p_booking_id;

    -- Audit Log
    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        actor_id,
        actor_role,
        new_data
    ) VALUES (
        'attendance_records',
        v_attendance_id,
        'RPC_CALL',
        v_actor_id,
        v_actor_role::text,
        jsonb_build_object(
            'function', 'mark_interview_attendance',
            'booking_id', p_booking_id,
            'status', p_status,
            'marked_by', v_actor_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_attendance_id,
        'booking_id', p_booking_id,
        'status', p_status
    );
END;
$$;


-- ============================================================================
-- 3. PROFILE PRIVACY, SCOPED SELECT & NON-RECURSIVE ESCALATION DEFENSE (ISSUES C & D)
-- ============================================================================

-- 3.1. Scoped Profile SELECT policy: Prevents cross-company & global candidate exposure
DROP POLICY IF EXISTS "profiles_select_own_or_authorized" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_scoped" ON public.profiles;
CREATE POLICY "profiles_select_scoped" ON public.profiles
    FOR SELECT USING (
        -- User can always view their own profile
        id = auth.uid()
        -- Admin can view all profiles
        OR public.get_current_user_role() = 'admin'
        -- Assigned Interviewer can only view candidates booked with them
        OR (
            public.get_current_user_role() = 'interviewer'
            AND EXISTS (
                SELECT 1 FROM public.interview_bookings ib
                JOIN public.interview_slots s ON ib.slot_id = s.id
                WHERE ib.candidate_id = profiles.id
                  AND s.interviewer_id = auth.uid()
            )
        )
        -- HR Staff can only view candidates and colleagues within their assigned company/location scope
        OR (
            public.get_current_user_role() = 'hr_staff'
            AND (
                -- Scoped Candidate via allocation
                EXISTS (
                    SELECT 1 FROM public.candidate_allocations ca
                    JOIN public.job_openings j ON ca.job_opening_id = j.id
                    WHERE ca.candidate_id = profiles.id
                      AND public.has_hr_permission(j.company_id, ca.location_id)
                )
                -- Scoped Candidate via interview booking
                OR EXISTS (
                    SELECT 1 FROM public.interview_bookings ib
                    JOIN public.interview_slots s ON ib.slot_id = s.id
                    JOIN public.interview_stages st ON s.stage_id = st.id
                    JOIN public.job_openings j ON st.job_opening_id = j.id
                    WHERE ib.candidate_id = profiles.id
                      AND public.has_hr_permission(j.company_id, s.location_id)
                )
                -- Scoped Candidate via waitlist
                OR EXISTS (
                    SELECT 1 FROM public.interview_waitlist iw
                    JOIN public.interview_stages st ON iw.stage_id = st.id
                    JOIN public.job_openings j ON st.job_opening_id = j.id
                    WHERE iw.candidate_id = profiles.id
                      AND public.has_hr_permission(j.company_id, iw.location_id)
                )
                -- Colleague / HR peer in same company
                OR EXISTS (
                    SELECT 1 FROM public.hr_permissions my_hp
                    JOIN public.hr_permissions other_hp ON my_hp.company_id = other_hp.company_id
                    WHERE my_hp.user_id = auth.uid()
                      AND other_hp.user_id = profiles.id
                )
            )
        )
        -- Payroll Officer can only view claimants with claims in their company scope
        OR (
            public.get_current_user_role() = 'payroll_officer'
            AND EXISTS (
                SELECT 1 FROM public.expense_claims ec
                WHERE ec.user_id = profiles.id
                  AND public.has_hr_permission(ec.company_id)
            )
        )
    );

-- 3.2. Non-recursive user self-update policy (removes subquery on profiles)
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (
        id = auth.uid()
    ) WITH CHECK (
        id = auth.uid()
        AND role = public.get_current_user_role()
    );

-- 3.3. Database-level trigger to strictly prevent non-admin role modifications
CREATE OR REPLACE FUNCTION public.enforce_profile_role_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If role is changing, verify that the caller is an administrator
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF public.get_current_user_role() != 'admin' THEN
            RAISE EXCEPTION 'Permission denied: Only administrators can modify user roles (attempted role change from % to %).',
                OLD.role, NEW.role;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_role_protection ON public.profiles;
CREATE TRIGGER trg_enforce_profile_role_protection
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_role_protection();


-- ============================================================================
-- 4. STORAGE PRIVACY & SCOPE PROTECTION ACROSS ALL BUCKETS (ISSUE E)
-- ============================================================================

-- 4.1. Receipts bucket scoped SELECT policy
DROP POLICY IF EXISTS "storage_receipts_select" ON storage.objects;
CREATE POLICY "storage_receipts_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'receipts'
        AND (
            -- Candidate owner can view their own receipts
            (storage.foldername(name))[1] = auth.uid()::text
            -- Admin can view all
            OR public.get_current_user_role() = 'admin'
            -- HR staff can view only if candidate has an expense claim in their authorized company
            OR (
                public.get_current_user_role() = 'hr_staff'
                AND EXISTS (
                    SELECT 1 FROM public.expense_claims ec
                    WHERE ec.user_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND public.has_hr_permission(ec.company_id)
                )
            )
            -- Payroll officer can view only if candidate has an approved/paid claim in their authorized company
            OR (
                public.get_current_user_role() = 'payroll_officer'
                AND EXISTS (
                    SELECT 1 FROM public.expense_claims ec
                    WHERE ec.user_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND ec.status IN ('hr_approved', 'paid', 'payout_queued')
                      AND public.has_hr_permission(ec.company_id)
                )
            )
        )
    );

-- 4.2. Claim-Receipts bucket scoped SELECT policy
DROP POLICY IF EXISTS "storage_claim_receipts_select" ON storage.objects;
CREATE POLICY "storage_claim_receipts_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'claim-receipts'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() = 'admin'
            OR (
                public.get_current_user_role() = 'hr_staff'
                AND EXISTS (
                    SELECT 1 FROM public.expense_claims ec
                    WHERE ec.user_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND public.has_hr_permission(ec.company_id)
                )
            )
            OR (
                public.get_current_user_role() = 'payroll_officer'
                AND EXISTS (
                    SELECT 1 FROM public.expense_claims ec
                    WHERE ec.user_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND ec.status IN ('hr_approved', 'paid', 'payout_queued')
                      AND public.has_hr_permission(ec.company_id)
                )
            )
        )
    );

-- 4.3. Absence-Proofs bucket scoped SELECT policy
DROP POLICY IF EXISTS "storage_absence_proofs_select" ON storage.objects;
CREATE POLICY "storage_absence_proofs_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'absence-proofs'
        AND (
            -- Candidate owner can view their own medical/transit proofs
            (storage.foldername(name))[1] = auth.uid()::text
            -- Admin can view all
            OR public.get_current_user_role() = 'admin'
            -- Assigned Interviewer can view candidate's absence proof for their booking
            OR (
                public.get_current_user_role() = 'interviewer'
                AND EXISTS (
                    SELECT 1 FROM public.absence_cases ac
                    JOIN public.interview_bookings ib ON ac.booking_id = ib.id
                    JOIN public.interview_slots s ON ib.slot_id = s.id
                    WHERE ac.candidate_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND s.interviewer_id = auth.uid()
                )
            )
            -- HR staff can view only if the absence case belongs to their company/location
            OR (
                public.get_current_user_role() = 'hr_staff'
                AND EXISTS (
                    SELECT 1 FROM public.absence_cases ac
                    JOIN public.interview_bookings ib ON ac.booking_id = ib.id
                    JOIN public.interview_slots s ON ib.slot_id = s.id
                    JOIN public.interview_stages st ON s.stage_id = st.id
                    JOIN public.job_openings j ON st.job_opening_id = j.id
                    WHERE ac.candidate_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND public.has_hr_permission(j.company_id, s.location_id)
                )
            )
        )
    );

-- 4.4. Resumes bucket scoped SELECT policy
DROP POLICY IF EXISTS "storage_resumes_select" ON storage.objects;
CREATE POLICY "storage_resumes_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'resumes'
        AND (
            -- Candidate owner
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() = 'admin'
            -- Scoped HR staff
            OR (
                public.get_current_user_role() = 'hr_staff'
                AND (
                    EXISTS (
                        SELECT 1 FROM public.candidate_allocations ca
                        JOIN public.job_openings j ON ca.job_opening_id = j.id
                        WHERE ca.candidate_id = ((storage.foldername(storage.objects.name))[1])::uuid
                          AND public.has_hr_permission(j.company_id, ca.location_id)
                    )
                    OR EXISTS (
                        SELECT 1 FROM public.interview_bookings ib
                        JOIN public.interview_slots s ON ib.slot_id = s.id
                        JOIN public.interview_stages st ON s.stage_id = st.id
                        JOIN public.job_openings j ON st.job_opening_id = j.id
                        WHERE ib.candidate_id = ((storage.foldername(storage.objects.name))[1])::uuid
                          AND public.has_hr_permission(j.company_id, s.location_id)
                    )
                )
            )
            -- Assigned Interviewer
            OR (
                public.get_current_user_role() = 'interviewer'
                AND EXISTS (
                    SELECT 1 FROM public.interview_bookings ib
                    JOIN public.interview_slots s ON ib.slot_id = s.id
                    WHERE ib.candidate_id = ((storage.foldername(storage.objects.name))[1])::uuid
                      AND s.interviewer_id = auth.uid()
                )
            )
        )
    );


-- ============================================================================
-- 5. AUDIT LOG INTEGRITY & FORGERY DEFENSE (SECTION 6)
-- ============================================================================
DROP POLICY IF EXISTS "audit_logs_insert_authenticated" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_admin" ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (public.get_current_user_role() = 'admin');


-- ============================================================================
-- 6. STRICT FUNCTION EXECUTION PRIVILEGES (REVOKE/GRANT)
-- ============================================================================
-- Revoke PUBLIC execution on all SECURITY DEFINER RPCs
REVOKE EXECUTE ON FUNCTION public._internal_promote_next_waitlisted_candidate(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public._internal_promote_next_waitlisted_candidate(UUID, INT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_expired_offers() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_expired_offers() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.offer_slot_to_next_waitlisted(UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.allocate_candidate(UUID, UUID, UUID, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.allocate_city_vacancy(UUID, UUID, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fast_fill_slot(UUID, BOOLEAN, INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_payroll_batch(VARCHAR, UUID[], TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.book_interview_slot(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.join_interview_waitlist(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_timed_slot_offer(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_interview_attendance(UUID, attendance_status, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_absence_case(UUID, VARCHAR, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_absence_case(UUID, absence_case_status, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.submit_expense_claim(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.review_expense_claim(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_claim_payout(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT) FROM PUBLIC;

-- Grant execution to intended roles
GRANT EXECUTE ON FUNCTION public._internal_promote_next_waitlisted_candidate(UUID, INT) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_expired_offers() TO service_role;
GRANT EXECUTE ON FUNCTION public.offer_slot_to_next_waitlisted(UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_candidate(UUID, UUID, UUID, BOOLEAN) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.allocate_city_vacancy(UUID, UUID, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fast_fill_slot(UUID, BOOLEAN, INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.process_payroll_batch(VARCHAR, UUID[], TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.book_interview_slot(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.join_interview_waitlist(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_timed_slot_offer(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_interview_attendance(UUID, attendance_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_absence_case(UUID, VARCHAR, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_absence_case(UUID, absence_case_status, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_expense_claim(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.review_expense_claim(UUID, TEXT, NUMERIC, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_claim_payout(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT) TO authenticated, service_role;

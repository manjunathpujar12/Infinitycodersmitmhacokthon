-- Migration 06: Atomic Database Functions, Concurrency Guards, and RPC APIs
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. ATOMIC INTERVIEW SLOT BOOKING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.book_interview_slot(
    p_slot_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidate_id UUID;
    v_slot RECORD;
    v_existing_booking UUID;
    v_stage_id UUID;
    v_booking_id UUID;
BEGIN
    v_candidate_id := auth.uid();
    IF v_candidate_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to book an interview slot.';
    END IF;

    -- 1. Acquire explicit row lock on the target interview slot (FOR UPDATE)
    SELECT * INTO v_slot
    FROM public.interview_slots
    WHERE id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Interview slot not found with id: %', p_slot_id;
    END IF;

    -- 2. Verify slot status and availability
    IF v_slot.status != 'open' THEN
        RAISE EXCEPTION 'Slot is not open for booking (current status: %).', v_slot.status;
    END IF;

    IF v_slot.booked_count >= v_slot.max_capacity THEN
        RAISE EXCEPTION 'Slot capacity exceeded. Capacity: %, Booked: %.', v_slot.max_capacity, v_slot.booked_count;
    END IF;

    v_stage_id := v_slot.stage_id;

    -- 3. Check for existing active booking for this stage
    SELECT b.id INTO v_existing_booking
    FROM public.interview_bookings b
    JOIN public.interview_slots s ON b.slot_id = s.id
    WHERE b.candidate_id = v_candidate_id
      AND s.stage_id = v_stage_id
      AND b.status IN ('confirmed', 'attended');

    IF v_existing_booking IS NOT NULL THEN
        RAISE EXCEPTION 'Candidate already has an active booking for this interview stage.';
    END IF;

    -- 4. Check for overlapping slot bookings for the candidate
    SELECT b.id INTO v_existing_booking
    FROM public.interview_bookings b
    JOIN public.interview_slots s ON b.slot_id = s.id
    WHERE b.candidate_id = v_candidate_id
      AND b.status = 'confirmed'
      AND (s.start_time < v_slot.end_time AND s.end_time > v_slot.start_time);

    IF v_existing_booking IS NOT NULL THEN
        RAISE EXCEPTION 'Candidate already has a conflicting interview slot booked during this time window.';
    END IF;

    -- 5. Insert confirmed booking record
    INSERT INTO public.interview_bookings (
        slot_id,
        candidate_id,
        status,
        booked_at
    ) VALUES (
        p_slot_id,
        v_candidate_id,
        'confirmed',
        now()
    ) RETURNING id INTO v_booking_id;

    -- 6. Atomically increment slot booked_count and update status if full
    UPDATE public.interview_slots
    SET 
        booked_count = booked_count + 1,
        status = CASE 
            WHEN booked_count + 1 >= max_capacity THEN 'booked'::slot_status 
            ELSE 'open'::slot_status 
        END,
        updated_at = now()
    WHERE id = p_slot_id;

    -- 7. Audit log RPC action
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
        v_candidate_id,
        'candidate',
        jsonb_build_object(
            'function', 'book_interview_slot',
            'slot_id', p_slot_id,
            'booking_id', v_booking_id,
            'stage_id', v_stage_id
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'slot_id', p_slot_id,
        'status', 'confirmed',
        'start_time', v_slot.start_time,
        'end_time', v_slot.end_time
    );
END;
$$;

-- ============================================================================
-- 2. ATOMIC CITY VACANCY ALLOCATION
-- ============================================================================
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

-- ============================================================================
-- 3. INTERVIEW WAITLIST & TIMED OFFERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.join_interview_waitlist(
    p_stage_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidate_id UUID;
    v_next_position INT;
    v_waitlist_id UUID;
BEGIN
    v_candidate_id := auth.uid();
    IF v_candidate_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to join waitlist.';
    END IF;

    -- Calculate next sequential queue position
    SELECT COALESCE(MAX(position), 0) + 1 INTO v_next_position
    FROM public.interview_waitlist
    WHERE stage_id = p_stage_id
      AND status = 'waiting';

    INSERT INTO public.interview_waitlist (
        stage_id,
        candidate_id,
        position,
        status
    ) VALUES (
        p_stage_id,
        v_candidate_id,
        v_next_position,
        'waiting'
    )
    ON CONFLICT (stage_id, candidate_id) DO UPDATE
    SET 
        position = v_next_position,
        status = 'waiting',
        updated_at = now()
    RETURNING id INTO v_waitlist_id;

    RETURN jsonb_build_object(
        'success', true,
        'waitlist_id', v_waitlist_id,
        'stage_id', p_stage_id,
        'position', v_next_position,
        'status', 'waiting'
    );
END;
$$;

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

    -- 2. Find next waiting candidate in queue (locking row)
    SELECT * INTO v_waitlist
    FROM public.interview_waitlist
    WHERE stage_id = v_slot.stage_id
      AND status = 'waiting'
      AND (location_id IS NULL OR location_id = v_slot.location_id)
    ORDER BY position ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'No waitlisted candidates found for this stage.');
    END IF;

    v_expires_at := now() + (p_validity_minutes || ' minutes')::interval;

    -- 3. Create timed slot offer
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

    -- 4. Update waitlist status
    UPDATE public.interview_waitlist
    SET status = 'offered', updated_at = now()
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

CREATE OR REPLACE FUNCTION public.claim_timed_slot_offer(
    p_offer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidate_id UUID;
    v_offer RECORD;
    v_slot RECORD;
    v_booking_id UUID;
BEGIN
    v_candidate_id := auth.uid();
    IF v_candidate_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to claim an offer.';
    END IF;

    -- Lock offer row
    SELECT * INTO v_offer
    FROM public.timed_slot_offers
    WHERE id = p_offer_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Timed offer not found.';
    END IF;

    IF v_offer.candidate_id != v_candidate_id THEN
        RAISE EXCEPTION 'Unauthorized: This offer does not belong to the current user.';
    END IF;

    IF v_offer.status != 'pending' THEN
        RAISE EXCEPTION 'Offer is no longer active (current status: %).', v_offer.status;
    END IF;

    IF now() > v_offer.expires_at THEN
        UPDATE public.timed_slot_offers SET status = 'expired' WHERE id = p_offer_id;
        UPDATE public.interview_waitlist SET status = 'expired' WHERE id = v_offer.waitlist_id;
        RAISE EXCEPTION 'Offer has expired.';
    END IF;

    -- Lock and book the slot
    SELECT * INTO v_slot
    FROM public.interview_slots
    WHERE id = v_offer.slot_id
    FOR UPDATE;

    IF v_slot.booked_count >= v_slot.max_capacity THEN
        RAISE EXCEPTION 'Slot is unfortunately already at full capacity.';
    END IF;

    -- Create confirmed booking
    INSERT INTO public.interview_bookings (
        slot_id,
        candidate_id,
        status,
        booked_at
    ) VALUES (
        v_offer.slot_id,
        v_candidate_id,
        'confirmed',
        now()
    ) RETURNING id INTO v_booking_id;

    -- Update slot count
    UPDATE public.interview_slots
    SET 
        booked_count = booked_count + 1,
        status = CASE WHEN booked_count + 1 >= max_capacity THEN 'booked' ELSE 'open' END,
        updated_at = now()
    WHERE id = v_offer.slot_id;

    -- Update offer and waitlist status
    UPDATE public.timed_slot_offers
    SET status = 'claimed', response_at = now()
    WHERE id = p_offer_id;

    UPDATE public.interview_waitlist
    SET status = 'accepted', updated_at = now()
    WHERE id = v_offer.waitlist_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_booking_id,
        'slot_id', v_offer.slot_id,
        'status', 'confirmed'
    );
END;
$$;

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
-- 4. ATTENDANCE AND ABSENCE-CASE WORKFLOW
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
    v_slot RECORD;
    v_company_id UUID;
    v_location_id UUID;
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

    -- Fetch booking and slot metadata
    SELECT b.*, s.interviewer_id, s.location_id, st.job_opening_id
    INTO v_booking
    FROM public.interview_bookings b
    JOIN public.interview_slots s ON b.slot_id = s.id
    JOIN public.interview_stages st ON s.stage_id = st.id
    WHERE b.id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found.';
    END IF;

    SELECT company_id INTO v_company_id
    FROM public.job_openings
    WHERE id = v_booking.job_opening_id;

    -- Authorization check: Caller must be either the assigned interviewer or authorized HR staff
    IF v_actor_id != v_booking.interviewer_id AND NOT public.has_hr_permission(v_company_id, v_booking.location_id) THEN
        RAISE EXCEPTION 'Unauthorized: Caller cannot mark attendance for this booking.';
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

    RETURN jsonb_build_object(
        'success', true,
        'attendance_id', v_attendance_id,
        'booking_id', p_booking_id,
        'status', p_status
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_absence_case(
    p_booking_id UUID,
    p_reason_type VARCHAR(64),
    p_explanation TEXT,
    p_proof_document_path TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidate_id UUID;
    v_booking RECORD;
    v_case_id UUID;
BEGIN
    v_candidate_id := auth.uid();
    IF v_candidate_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to submit an absence case.';
    END IF;

    SELECT * INTO v_booking
    FROM public.interview_bookings
    WHERE id = p_booking_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found.';
    END IF;

    IF v_booking.candidate_id != v_candidate_id THEN
        RAISE EXCEPTION 'Unauthorized: Candidate can only submit absence cases for their own bookings.';
    END IF;

    INSERT INTO public.absence_cases (
        booking_id,
        candidate_id,
        reason_type,
        explanation,
        proof_document_path,
        status
    ) VALUES (
        p_booking_id,
        v_candidate_id,
        p_reason_type,
        p_explanation,
        p_proof_document_path,
        'submitted'
    ) RETURNING id INTO v_case_id;

    RETURN jsonb_build_object(
        'success', true,
        'absence_case_id', v_case_id,
        'booking_id', p_booking_id,
        'status', 'submitted'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_absence_case(
    p_case_id UUID,
    p_decision absence_case_status,
    p_review_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role user_role;
    v_case RECORD;
    v_company_id UUID;
    v_location_id UUID;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    SELECT c.*, s.location_id, st.job_opening_id, b.slot_id
    INTO v_case
    FROM public.absence_cases c
    JOIN public.interview_bookings b ON c.booking_id = b.id
    JOIN public.interview_slots s ON b.slot_id = s.id
    JOIN public.interview_stages st ON s.stage_id = st.id
    WHERE c.id = p_case_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Absence case not found: %', p_case_id;
    END IF;

    SELECT company_id INTO v_company_id
    FROM public.job_openings
    WHERE id = v_case.job_opening_id;

    IF NOT public.has_hr_permission(v_company_id, v_case.location_id) THEN
        RAISE EXCEPTION 'Unauthorized: HR staff does not have permissions for this company/location.';
    END IF;

    UPDATE public.absence_cases
    SET 
        status = p_decision,
        reviewed_by = v_actor_id,
        reviewed_at = now(),
        review_notes = p_review_notes,
        updated_at = now()
    WHERE id = p_case_id;

    -- If approved for reschedule, free previous slot capacity
    IF p_decision = 'approved_reschedule' THEN
        UPDATE public.interview_bookings
        SET status = 'cancelled', cancellation_reason = 'Excused absence approved for rescheduling', cancelled_at = now()
        WHERE id = v_case.booking_id;

        UPDATE public.interview_slots
        SET 
            booked_count = GREATEST(booked_count - 1, 0),
            status = 'open',
            updated_at = now()
        WHERE id = v_case.slot_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'absence_case_id', p_case_id,
        'status', p_decision
    );
END;
$$;

-- ============================================================================
-- 5. EXPENSE CLAIM WORKFLOW & REVIEWS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.submit_expense_claim(
    p_claim_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_candidate_id UUID;
    v_claim RECORD;
BEGIN
    v_candidate_id := auth.uid();
    IF v_candidate_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT * INTO v_claim
    FROM public.expense_claims
    WHERE id = p_claim_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense claim not found.';
    END IF;

    IF v_claim.user_id != v_candidate_id THEN
        RAISE EXCEPTION 'Unauthorized: User can only submit their own claims.';
    END IF;

    IF v_claim.status != 'draft' THEN
        RAISE EXCEPTION 'Claim can only be submitted from draft status (current: %).', v_claim.status;
    END IF;

    IF v_claim.total_claimed_amount <= 0 THEN
        RAISE EXCEPTION 'Cannot submit a claim with zero total amount.';
    END IF;

    UPDATE public.expense_claims
    SET 
        status = 'submitted',
        submission_date = now(),
        updated_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', p_claim_id,
        'status', 'submitted',
        'total_claimed_amount', v_claim.total_claimed_amount
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.review_expense_claim(
    p_claim_id UUID,
    p_action TEXT, -- 'approve' or 'reject'
    p_approved_amount NUMERIC DEFAULT NULL,
    p_decision_notes TEXT DEFAULT NULL,
    p_rejection_reason TEXT DEFAULT NULL
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
    v_policy_cap NUMERIC;
    v_final_status claim_status;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Caller has no registered profile or role.';
    END IF;

    SELECT * INTO v_claim
    FROM public.expense_claims
    WHERE id = p_claim_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Expense claim not found: %', p_claim_id;
    END IF;

    -- Enforce company scope: HR must be assigned to this company
    IF NOT public.has_hr_permission(v_claim.company_id) THEN
        RAISE EXCEPTION 'Unauthorized: HR staff does not have permissions for company: %', v_claim.company_id;
    END IF;

    -- Security: Claimant cannot review their own claim
    IF v_claim.user_id = v_actor_id THEN
        RAISE EXCEPTION 'Conflict of interest: Cannot approve or reject your own expense claim.';
    END IF;

    IF v_claim.status NOT IN ('submitted', 'under_hr_review') THEN
        RAISE EXCEPTION 'Claim cannot be reviewed from current status: %', v_claim.status;
    END IF;

    IF p_action = 'approve' THEN
        IF p_approved_amount IS NULL OR p_approved_amount <= 0 THEN
            RAISE EXCEPTION 'Approved amount must be positive.';
        END IF;

        -- Verify cap based on category
        IF v_claim.category = 'interview_travel' THEN
            SELECT cap_amount INTO v_policy_cap FROM public.travel_policies WHERE id = v_claim.policy_id;
        ELSE
            SELECT cap_amount INTO v_policy_cap FROM public.relocation_policies WHERE id = v_claim.policy_id;
        END IF;

        IF v_policy_cap IS NOT NULL AND p_approved_amount > v_policy_cap THEN
            RAISE EXCEPTION 'Approved amount (% %) exceeds policy cap (% %).',
                p_approved_amount, v_claim.currency, v_policy_cap, v_claim.currency;
        END IF;

        v_final_status := 'hr_approved';

        UPDATE public.expense_claims
        SET 
            status = v_final_status,
            approved_amount = p_approved_amount,
            hr_reviewer_id = v_actor_id,
            hr_reviewed_at = now(),
            hr_decision_notes = p_decision_notes,
            updated_at = now()
        WHERE id = p_claim_id;

        -- Create pending payout record for payroll team
        INSERT INTO public.claim_payouts (
            claim_id,
            payment_status,
            payout_amount,
            currency,
            bank_account_last4
        ) VALUES (
            p_claim_id,
            'pending',
            p_approved_amount,
            v_claim.currency,
            '0000' -- placeholder until payroll confirms banking last-4
        )
        ON CONFLICT (claim_id) DO UPDATE
        SET payout_amount = EXCLUDED.payout_amount, updated_at = now();

    ELSIF p_action = 'reject' THEN
        v_final_status := 'hr_rejected';

        UPDATE public.expense_claims
        SET 
            status = v_final_status,
            hr_reviewer_id = v_actor_id,
            hr_reviewed_at = now(),
            hr_decision_notes = p_decision_notes,
            rejection_reason = p_rejection_reason,
            updated_at = now()
        WHERE id = p_claim_id;
    ELSE
        RAISE EXCEPTION 'Invalid review action: %. Must be "approve" or "reject".', p_action;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', p_claim_id,
        'status', v_final_status,
        'approved_amount', p_approved_amount
    );
END;
$$;

-- ============================================================================
-- 6. PAYROLL PAYMENT STATUS & SENSITIVE DATA PROTECTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.record_claim_payout(
    p_claim_id UUID,
    p_payout_ref VARCHAR(128),
    p_bank_last4 VARCHAR(4),
    p_bank_routing_or_ifsc VARCHAR(32) DEFAULT NULL,
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
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required.';
    END IF;

    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('payroll_officer', 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Only payroll officers or administrators can record payouts.';
    END IF;

    -- Strict validation: exactly 4 digits for bank account last-4
    IF p_bank_last4 !~ '^[0-9]{4}$' THEN
        RAISE EXCEPTION 'Invalid bank account last-4 digits. Exactly 4 numeric digits required.';
    END IF;

    SELECT * INTO v_claim
    FROM public.expense_claims
    WHERE id = p_claim_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Claim not found: %', p_claim_id;
    END IF;

    IF v_claim.status != 'hr_approved' THEN
        RAISE EXCEPTION 'Only HR-approved claims can be processed for payout (current: %).', v_claim.status;
    END IF;

    -- Upsert claim payout details
    INSERT INTO public.claim_payouts (
        claim_id,
        payment_status,
        payout_reference,
        payout_amount,
        currency,
        bank_account_last4,
        bank_routing_or_ifsc_code,
        processed_at,
        processed_by,
        notes
    ) VALUES (
        p_claim_id,
        'processed',
        p_payout_ref,
        v_claim.approved_amount,
        v_claim.currency,
        p_bank_last4,
        p_bank_routing_or_ifsc,
        now(),
        v_actor_id,
        p_notes
    )
    ON CONFLICT (claim_id) DO UPDATE
    SET 
        payment_status = 'processed',
        payout_reference = EXCLUDED.payout_reference,
        payout_amount = EXCLUDED.payout_amount,
        bank_account_last4 = EXCLUDED.bank_account_last4,
        bank_routing_or_ifsc_code = EXCLUDED.bank_routing_or_ifsc_code,
        processed_at = now(),
        processed_by = v_actor_id,
        notes = EXCLUDED.notes,
        updated_at = now();

    -- Update claim status to paid
    UPDATE public.expense_claims
    SET status = 'paid', updated_at = now()
    WHERE id = p_claim_id;

    RETURN jsonb_build_object(
        'success', true,
        'claim_id', p_claim_id,
        'status', 'paid',
        'payout_reference', p_payout_ref,
        'bank_last4', p_bank_last4,
        'payout_amount', v_claim.approved_amount
    );
END;
$$;

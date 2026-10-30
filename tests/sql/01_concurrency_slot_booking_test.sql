-- ============================================================================
-- TEST 01: Slot Booking Concurrency and Constraint Verification
-- HireSlot Backend Concurrency Test Script
-- ============================================================================

\set ON_ERROR_STOP on
SET search_path = public;

BEGIN;

-- Setup test interviewer and candidates in auth.users & profiles
INSERT INTO auth.users (id, email)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'interviewer@acme.com'),
    ('c0000000-0000-0000-0000-000000000002', 'candidate1@gmail.com'),
    ('c0000000-0000-0000-0000-000000000003', 'candidate2@gmail.com'),
    ('c0000000-0000-0000-0000-000000000004', 'candidate3@gmail.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'interviewer@acme.com', 'Alex Interviewer', 'interviewer'),
    ('c0000000-0000-0000-0000-000000000002', 'candidate1@gmail.com', 'Candidate One', 'candidate'),
    ('c0000000-0000-0000-0000-000000000003', 'candidate2@gmail.com', 'Candidate Two', 'candidate'),
    ('c0000000-0000-0000-0000-000000000004', 'candidate3@gmail.com', 'Candidate Three', 'candidate')
ON CONFLICT (id) DO NOTHING;

-- Create an interview slot with max_capacity = 2
INSERT INTO public.interview_slots (
    id,
    stage_id,
    interviewer_id,
    start_time,
    end_time,
    max_capacity,
    booked_count,
    status
) VALUES (
    's0000000-0000-0000-0000-000000000001',
    '77777777-7777-7777-7777-777777777777',
    'c0000000-0000-0000-0000-000000000001',
    now() + interval '2 days',
    now() + interval '2 days 1 hour',
    2,
    0,
    'open'
);

-- Test 1: Candidate 1 books slot (Capacity becomes 1/2)
SET LOCAL "request.jwt.claims" = '{"sub": "c0000000-0000-0000-0000-000000000002"}';
SELECT public.book_interview_slot('s0000000-0000-0000-0000-000000000001');

-- Test 2: Duplicate booking prevention (Candidate 1 attempts to re-book the same slot)
DO $$
BEGIN
    BEGIN
        PERFORM public.book_interview_slot('s0000000-0000-0000-0000-000000000001');
        RAISE EXCEPTION 'TEST FAILED: Candidate 1 was able to book twice!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Duplicate booking was correctly prevented with message: %', SQLERRM;
    END;
END $$;

-- Test 3: Candidate 2 books remaining slot (Capacity becomes 2/2 -> status should update to "booked")
SET LOCAL "request.jwt.claims" = '{"sub": "c0000000-0000-0000-0000-000000000003"}';
SELECT public.book_interview_slot('s0000000-0000-0000-0000-000000000001');

-- Verify slot status is now 'booked' and count is 2
DO $$
DECLARE
    v_status slot_status;
    v_count INT;
BEGIN
    SELECT status, booked_count INTO v_status, v_count
    FROM public.interview_slots
    WHERE id = 's0000000-0000-0000-0000-000000000001';

    IF v_status != 'booked' OR v_count != 2 THEN
        RAISE EXCEPTION 'TEST FAILED: Expected status = booked and booked_count = 2, got status = %, count = %', v_status, v_count;
    END IF;
    RAISE NOTICE 'SUCCESS: Slot transitioned to "booked" with count = 2.';
END $$;

-- Test 4: Candidate 3 attempts to book the full slot (Over-capacity prevention)
SET LOCAL "request.jwt.claims" = '{"sub": "c0000000-0000-0000-0000-000000000004"}';
DO $$
BEGIN
    BEGIN
        PERFORM public.book_interview_slot('s0000000-0000-0000-0000-000000000001');
        RAISE EXCEPTION 'TEST FAILED: Candidate 3 was able to exceed slot capacity!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Over-capacity booking was correctly blocked with message: %', SQLERRM;
    END;
END $$;

ROLLBACK;

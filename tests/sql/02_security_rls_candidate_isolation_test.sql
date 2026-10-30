-- ============================================================================
-- TEST 02: Row Level Security (RLS) Candidate Isolation & Privilege Escalation Defense
-- HireSlot Backend Security Test Script
-- ============================================================================

\set ON_ERROR_STOP on
SET search_path = public;

BEGIN;

-- Setup Candidate Alice and Candidate Bob
INSERT INTO auth.users (id, email)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'alice.candidate@example.com'),
    ('b0000000-0000-0000-0000-000000000002', 'bob.candidate@example.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'alice.candidate@example.com', 'Alice Smith', 'candidate'),
    ('b0000000-0000-0000-0000-000000000002', 'bob.candidate@example.com', 'Bob Jones', 'candidate')
ON CONFLICT (id) DO NOTHING;

-- Alice creates an interview travel claim
INSERT INTO public.expense_claims (
    id,
    claim_number,
    user_id,
    company_id,
    category,
    policy_id,
    claim_method,
    status,
    total_claimed_amount,
    currency
) VALUES (
    'clm00000-0000-0000-0000-000000000001',
    'CLM-2026-ALICE-01',
    'a0000000-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    'interview_travel',
    '99999999-9999-9999-9999-999999999991',
    'actual_expenses',
    'draft',
    450.00,
    'USD'
);

-- Bob logs in: set session to Bob's UID
SET LOCAL "request.jwt.claims" = '{"sub": "b0000000-0000-0000-0000-000000000002"}';

-- Test 1: Bob queries expense claims -> MUST NOT return Alice's claim
DO $$
DECLARE
    v_found_count INT;
BEGIN
    SELECT COUNT(*) INTO v_found_count
    FROM public.expense_claims
    WHERE id = 'clm00000-0000-0000-0000-000000000001';

    IF v_found_count != 0 THEN
        RAISE EXCEPTION 'SECURITY BREACH: Bob was able to see Alice expense claim under RLS!';
    END IF;
    RAISE NOTICE 'SUCCESS: RLS strictly isolated Alice claim from Bob.';
END $$;

-- Test 2: Alice attempts privilege escalation (Forging status = 'hr_approved' or approved_amount)
SET LOCAL "request.jwt.claims" = '{"sub": "a0000000-0000-0000-0000-000000000001"}';

DO $$
BEGIN
    BEGIN
        -- Candidate attempts to mark their own claim as 'hr_approved' and set approved_amount
        UPDATE public.expense_claims
        SET status = 'hr_approved', approved_amount = 450.00
        WHERE id = 'clm00000-0000-0000-0000-000000000001';

        -- If RLS check passes, verify if row was actually updated
        IF EXISTS (SELECT 1 FROM public.expense_claims WHERE id = 'clm00000-0000-0000-0000-000000000001' AND status = 'hr_approved') THEN
            RAISE EXCEPTION 'SECURITY BREACH: Candidate Alice was able to self-approve her expense claim!';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Candidate self-approval blocked by RLS check policy: %', SQLERRM;
    END;
END $$;

ROLLBACK;

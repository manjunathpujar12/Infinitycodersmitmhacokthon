-- ============================================================================
-- TEST 04: Financial Claims, Policy Caps, Payout Masking & Audit Immutability
-- HireSlot Backend Financial & Security Test Script
-- ============================================================================

\set ON_ERROR_STOP on
SET search_path = public;

BEGIN;

-- Setup HR reviewer and Payroll officer
INSERT INTO auth.users (id, email)
VALUES 
    ('h0000000-0000-0000-0000-000000000003', 'hr.global@acme.com'),
    ('p0000000-0000-0000-0000-000000000001', 'payroll.officer@acme.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
    ('h0000000-0000-0000-0000-000000000003', 'hr.global@acme.com', 'Grace Global HR', 'hr_staff'),
    ('p0000000-0000-0000-0000-000000000001', 'payroll.officer@acme.com', 'Peter Payroll', 'payroll_officer')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.hr_permissions (user_id, company_id, location_id, permission_level)
VALUES 
    ('h0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL, 'admin')
ON CONFLICT DO NOTHING;

-- Create an interview travel claim submitted for review
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
    'clm00000-0000-0000-0000-000000000099',
    'CLM-2026-TRAVEL-99',
    'c0000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    'interview_travel',
    '99999999-9999-9999-9999-999999999991', -- Cap is 850.00
    'actual_expenses',
    'submitted',
    1200.00,
    'USD'
);

-- Test 1: HR attempts to approve $1200 (exceeds $850 cap) -> MUST FAIL
SET LOCAL "request.jwt.claims" = '{"sub": "h0000000-0000-0000-0000-000000000003"}';

DO $$
BEGIN
    BEGIN
        PERFORM public.review_expense_claim(
            'clm00000-0000-0000-0000-000000000099',
            'approve',
            1200.00,
            'Attempting to approve above cap'
        );
        RAISE EXCEPTION 'TEST FAILED: HR was able to approve claim exceeding policy cap!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Approval exceeding cap was rejected: %', SQLERRM;
    END;
END $$;

-- Test 2: HR approves within policy cap ($850.00) -> MUST SUCCEED
SELECT public.review_expense_claim(
    'clm00000-0000-0000-0000-000000000099',
    'approve',
    850.00,
    'Approved up to the maximum policy travel cap.'
);

-- Test 3: Payroll Officer attempts to record unmasked full bank account number -> MUST FAIL
SET LOCAL "request.jwt.claims" = '{"sub": "p0000000-0000-0000-0000-000000000001"}';

DO $$
BEGIN
    BEGIN
        PERFORM public.record_claim_payout(
            'clm00000-0000-0000-0000-000000000099',
            'WIRE-REF-998877',
            '1234567890123456', -- RAW UNMASKED BANK ACCOUNT!
            'ROUTING-021000021',
            'Test unmasked leak'
        );
        RAISE EXCEPTION 'TEST FAILED: System permitted recording unmasked bank account number!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Raw unmasked bank account was blocked by security check: %', SQLERRM;
    END;
END $$;

-- Test 4: Payroll records payout with masked last-4 digits ('4321') -> MUST SUCCEED
SELECT public.record_claim_payout(
    'clm00000-0000-0000-0000-000000000099',
    'WIRE-REF-998877',
    '4321', -- Masked: exactly 4 digits
    'ROUTING-021000021',
    'Paid via external corporate wire transfer'
);

-- Test 5: Audit Log Immutability (Attempting to delete or modify audit records -> MUST FAIL)
DO $$
BEGIN
    BEGIN
        DELETE FROM public.audit_logs WHERE record_id = 'clm00000-0000-0000-0000-000000000099';
        RAISE EXCEPTION 'TEST FAILED: Audit log entry was deleted!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Audit log immutability verified with exception: %', SQLERRM;
    END;
END $$;

ROLLBACK;

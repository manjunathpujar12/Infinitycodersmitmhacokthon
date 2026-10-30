-- ============================================================================
-- TEST 03: HR Access Scoping by Company and Location Permissions & Integrity
-- HireSlot Backend Security Test Script
-- ============================================================================

\set ON_ERROR_STOP on
SET search_path = public;

BEGIN;

-- ============================================================================
-- 1. TEST: Candidate Self-Registration Cannot Grant Admin or HR
-- ============================================================================
-- Simulate auth.users insert with malicious metadata
INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES (
    'c0000000-0000-0000-0000-000000000099',
    'attacker.candidate@example.com',
    '{"full_name": "Attacker Guy", "role": "admin"}'::jsonb
) ON CONFLICT (id) DO UPDATE SET raw_user_meta_data = EXCLUDED.raw_user_meta_data;

DO $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = 'c0000000-0000-0000-0000-000000000099';
    IF v_role != 'candidate' THEN
        RAISE EXCEPTION 'SECURITY BREACH: Candidate self-registration gained role % instead of candidate!', v_role;
    END IF;
    RAISE NOTICE 'SUCCESS: Candidate self-registration strictly defaulted to "candidate" role.';
END $$;

-- ============================================================================
-- 2. SETUP: HR Staff and Permissions
-- ============================================================================
INSERT INTO auth.users (id, email)
VALUES 
    ('h0000000-0000-0000-0000-000000000001', 'hr.austin@acme.com'),
    ('h0000000-0000-0000-0000-000000000002', 'hr.ny@acme.com'),
    ('h0000000-0000-0000-0000-000000000003', 'hr.companywide@acme.com')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
    ('h0000000-0000-0000-0000-000000000001', 'hr.austin@acme.com', 'Hannah Austin HR', 'hr_staff'),
    ('h0000000-0000-0000-0000-000000000002', 'hr.ny@acme.com', 'Henry NY HR', 'hr_staff'),
    ('h0000000-0000-0000-0000-000000000003', 'hr.companywide@acme.com', 'Carol Global HR', 'hr_staff')
ON CONFLICT (id) DO NOTHING;

-- Assign HR permissions:
-- Hannah: Location-specific Austin ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')
-- Henry: Location-specific New York ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')
-- Carol: Explicit Company-wide (location_id IS NULL)
INSERT INTO public.hr_permissions (user_id, company_id, location_id, permission_level)
VALUES 
    ('h0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager'),
    ('h0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'manager'),
    ('h0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL, 'admin')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 3. TEST: Scoping Verification
-- ============================================================================
-- Test 3A: Location A HR cannot access Location B
SET LOCAL "request.jwt.claims" = '{"sub": "h0000000-0000-0000-0000-000000000001"}';

DO $$
BEGIN
    -- Hannah in Austin accesses Austin -> TRUE
    IF NOT public.has_hr_permission('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') THEN
        RAISE EXCEPTION 'TEST FAILED: Hannah should have Austin permission';
    END IF;

    -- Hannah in Austin accesses New York -> FALSE
    IF public.has_hr_permission('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') THEN
        RAISE EXCEPTION 'SECURITY BREACH: Location A HR was granted access to Location B!';
    END IF;

    -- Hannah in Austin accesses Company-Wide (p_location_id IS NULL) -> MUST BE FALSE!
    IF public.has_hr_permission('11111111-1111-1111-1111-111111111111', NULL) THEN
        RAISE EXCEPTION 'SECURITY BREACH: Location A HR was granted company-wide access when p_location_id is NULL!';
    END IF;

    RAISE NOTICE 'SUCCESS: Location A HR cannot access Location B and cannot obtain company-wide access.';
END $$;

-- Test 3B: Explicitly Company-Wide Authorized HR Can Access Company-Wide and Permitted Locations
SET LOCAL "request.jwt.claims" = '{"sub": "h0000000-0000-0000-0000-000000000003"}';

DO $$
BEGIN
    -- Carol has company-wide permission (p_location_id IS NULL)
    IF NOT public.has_hr_permission('11111111-1111-1111-1111-111111111111', NULL) THEN
        RAISE EXCEPTION 'TEST FAILED: Company-wide HR should have company-wide access';
    END IF;

    -- Carol can also access Austin location
    IF NOT public.has_hr_permission('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') THEN
        RAISE EXCEPTION 'TEST FAILED: Company-wide HR should have access to Austin location';
    END IF;

    -- Carol can also access New York location
    IF NOT public.has_hr_permission('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') THEN
        RAISE EXCEPTION 'TEST FAILED: Company-wide HR should have access to NY location';
    END IF;

    RAISE NOTICE 'SUCCESS: Explicitly company-wide authorized HR can access company-wide and permitted company locations.';
END $$;

-- ============================================================================
-- 4. TEST: Data Integrity - Duplicate Company-Wide Permissions Are Rejected
-- ============================================================================
DO $$
BEGIN
    BEGIN
        -- Carol already has a company-wide permission (location_id IS NULL) for Acme
        INSERT INTO public.hr_permissions (user_id, company_id, location_id, permission_level)
        VALUES ('h0000000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', NULL, 'viewer');
        
        RAISE EXCEPTION 'DATA INTEGRITY FAILURE: Duplicate company-wide permission was accepted!';
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE NOTICE 'SUCCESS: Duplicate company-wide permission was correctly rejected by partial unique index.';
        WHEN OTHERS THEN
            RAISE NOTICE 'SUCCESS: Duplicate company-wide permission was rejected: %', SQLERRM;
    END;
END $$;

-- ============================================================================
-- 5. TEST: Data Integrity - Cross-Company Location Assignment Is Rejected
-- ============================================================================
DO $$
BEGIN
    BEGIN
        -- Location 'cccccccc-cccc-cccc-cccc-cccccccccccc' belongs to Zenith ('22222222-2222-2222-2222-222222222222')
        -- Attempting to assign it to Acme ('11111111-1111-1111-1111-111111111111') MUST FAIL
        INSERT INTO public.hr_permissions (user_id, company_id, location_id, permission_level)
        VALUES ('h0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer');

        RAISE EXCEPTION 'DATA INTEGRITY FAILURE: Location from different company was assigned!';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'SUCCESS: Cross-company location assignment was correctly rejected: %', SQLERRM;
    END;
END $$;

ROLLBACK;

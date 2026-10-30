-- Seed Data for HireSlot Backend Development and Testing
-- HireSlot System

SET search_path = public;

-- Clean existing seed data if any
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.claim_payouts CASCADE;
TRUNCATE TABLE public.expense_claim_items CASCADE;
TRUNCATE TABLE public.expense_claims CASCADE;
TRUNCATE TABLE public.relocation_policies CASCADE;
TRUNCATE TABLE public.travel_policies CASCADE;
TRUNCATE TABLE public.absence_cases CASCADE;
TRUNCATE TABLE public.attendance_records CASCADE;
TRUNCATE TABLE public.timed_slot_offers CASCADE;
TRUNCATE TABLE public.interview_waitlist CASCADE;
TRUNCATE TABLE public.interview_bookings CASCADE;
TRUNCATE TABLE public.interview_slots CASCADE;
TRUNCATE TABLE public.interview_stages CASCADE;
TRUNCATE TABLE public.city_vacancies CASCADE;
TRUNCATE TABLE public.job_openings CASCADE;
TRUNCATE TABLE public.hr_permissions CASCADE;
TRUNCATE TABLE public.locations CASCADE;
TRUNCATE TABLE public.companies CASCADE;

-- 1. Insert Companies
INSERT INTO public.companies (id, name, code, tax_identifier)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Acme Global Technologies', 'ACME', 'US-EIN-987654321'),
    ('22222222-2222-2222-2222-222222222222', 'Zenith Cloud Logistics', 'ZENITH', 'US-EIN-123456789');

-- 2. Insert Locations
INSERT INTO public.locations (id, company_id, name, city, state, country, timezone)
VALUES 
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Acme HQ New York', 'New York', 'NY', 'United States', 'America/New_York'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Acme Tech Austin', 'Austin', 'TX', 'United States', 'America/Chicago'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '22222222-2222-2222-2222-222222222222', 'Zenith Hub Seattle', 'Seattle', 'WA', 'United States', 'America/Los_Angeles');

-- 3. Insert Job Openings
INSERT INTO public.job_openings (id, company_id, title, department, description, is_active)
VALUES 
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Senior Backend Engineer', 'Engineering', 'Designing distributed systems in Go & Postgres', true),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Full Stack React Lead', 'Product', 'Building next-gen hiring experiences', true);

-- 4. Insert City Vacancies (Multi-City Quota Allocation)
INSERT INTO public.city_vacancies (id, job_opening_id, location_id, total_capacity, allocated_count)
VALUES 
    ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 5, 2),
    ('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 3, 0);

-- 5. Insert Interview Stages
INSERT INTO public.interview_stages (id, job_opening_id, name, stage_order, duration_minutes)
VALUES 
    ('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333', 'Technical System Architecture', 1, 60),
    ('88888888-8888-8888-8888-888888888888', '33333333-3333-3333-3333-333333333333', 'Executive Culture & HR Round', 2, 45);

-- 6. Insert Travel Support Policies (Separate from Relocation)
INSERT INTO public.travel_policies (id, company_id, name, claim_category, eligibility_criteria, reimbursement_method, cap_amount, currency, valid_from, valid_to, active)
VALUES 
    (
        '99999999-9999-9999-9999-999999999991',
        '11111111-1111-1111-1111-111111111111',
        'Onsite Interview Flight & Hotel Policy 2026',
        'interview_travel',
        '{"min_distance_km": 100, "eligible_tiers": ["Economy Air", "Standard Hotel"]}'::jsonb,
        'actual_expenses',
        850.00,
        'USD',
        '2026-01-01',
        '2026-12-31',
        true
    ),
    (
        '99999999-9999-9999-9999-999999999992',
        '11111111-1111-1111-1111-111111111111',
        'Local City Transit Fixed Allowance',
        'interview_travel',
        '{"max_distance_km": 100, "allowance_type": "transit_flat"}'::jsonb,
        'fixed_allowance',
        100.00,
        'USD',
        '2026-01-01',
        '2026-12-31',
        true
    );

-- 7. Insert Employee Relocation Policies (Separate Category)
INSERT INTO public.relocation_policies (id, company_id, name, claim_category, eligibility_criteria, reimbursement_method, cap_amount, currency, move_window_days, valid_from, valid_to, active)
VALUES 
    (
        '99999999-9999-9999-9999-999999999993',
        '11111111-1111-1111-1111-111111111111',
        'Interstate Relocation Support Package',
        'employee_relocation',
        '{"min_distance_km": 200, "covered_services": ["packers_movers", "transit", "temp_housing_14d"]}'::jsonb,
        'actual_expenses',
        5000.00,
        'USD',
        90,
        '2026-01-01',
        '2026-12-31',
        true
    ),
    (
        '99999999-9999-9999-9999-999999999994',
        '11111111-1111-1111-1111-111111111111',
        'Lump-sum City Move Allowance',
        'employee_relocation',
        '{"tier": "Tier-1 Tech Roles"}'::jsonb,
        'fixed_allowance',
        3000.00,
        'USD',
        60,
        '2026-01-01',
        '2026-12-31',
        true
    );

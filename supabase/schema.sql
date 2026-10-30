-- HireSlot Enterprise Agreed Supabase Database Schema
-- Run this script in the Supabase SQL Editor to initialize or migrate the database.

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('HR_ADMIN', 'HR_RECRUITER', 'INTERVIEW_COORDINATOR', 'FINANCE_OFFICER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE drive_status_enum AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE drive_mode_enum AS ENUM ('ON_SITE', 'HYBRID', 'VIRTUAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE allocation_status_enum AS ENUM (
        'PENDING', 'ALLOCATED', 'WAITLISTED', 'OVERFLOW', 
        'ALTERNATIVE_OFFERED', 'ALTERNATIVE_ACCEPTED', 'ALTERNATIVE_DECLINED', 
        'BLOCKED', 'WITHDRAWN'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE slot_status_enum AS ENUM ('AVAILABLE', 'BOOKED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status_enum AS ENUM ('EXPECTED', 'CHECKED_IN', 'IN_INTERVIEW', 'COMPLETED', 'LATE', 'ABSENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_status_enum AS ENUM ('SUBMITTED', 'HR_APPROVED', 'ADJUSTED', 'REJECTED', 'QUEUED_PAYROLL', 'DISBURSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payroll_status_enum AS ENUM ('PENDING', 'QUEUED', 'PROCESSING', 'DISBURSED', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLES

-- Hiring Drives
CREATE TABLE IF NOT EXISTS hiring_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    mode drive_mode_enum NOT NULL DEFAULT 'HYBRID',
    status drive_status_enum NOT NULL DEFAULT 'ACTIVE',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_target_headcount INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Job Roles
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    band_level VARCHAR(50) NOT NULL,
    base_salary_min NUMERIC(12,2) DEFAULT 0,
    base_salary_max NUMERIC(12,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'USD',
    min_years_experience INTEGER DEFAULT 2,
    required_skills JSONB DEFAULT '[]'::jsonb,
    evaluation_criteria JSONB DEFAULT '{"skillMatchWeight": 40, "experienceWeight": 25, "assessmentWeight": 20, "locationPrefWeight": 15}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- City-wise Vacancy Configuration
CREATE TABLE IF NOT EXISTS city_vacancies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    target_headcount INTEGER NOT NULL DEFAULT 10,
    buffer_percentage NUMERIC(5,2) DEFAULT 15.00,
    min_bar_score NUMERIC(5,2) DEFAULT 70.00,
    venue_name VARCHAR(255),
    venue_address TEXT,
    point_of_contact_name VARCHAR(150),
    point_of_contact_phone VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    current_city VARCHAR(100) NOT NULL,
    preferred_cities JSONB DEFAULT '[]'::jsonb,
    relocation_readiness VARCHAR(50) DEFAULT 'HIGH',
    years_experience NUMERIC(4,1) DEFAULT 0,
    skills JSONB DEFAULT '[]'::jsonb,
    assessment_score NUMERIC(5,2) DEFAULT 0,
    resume_url TEXT,
    is_silently_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    hr_exemption_granted BOOLEAN DEFAULT FALSE,
    hr_exemption_note TEXT,
    applied_date TIMESTAMPTZ DEFAULT NOW()
);

-- Candidate Allocations (Separate workflow from Interview Scheduling)
CREATE TABLE IF NOT EXISTS candidate_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    role_id UUID REFERENCES job_roles(id) ON DELETE CASCADE,
    allocated_city VARCHAR(100) NOT NULL,
    status allocation_status_enum NOT NULL DEFAULT 'PENDING',
    rank INTEGER DEFAULT 1,
    match_score NUMERIC(5,2) NOT NULL DEFAULT 0,
    recommendation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    alternative_city VARCHAR(100),
    alternative_city_notes TEXT,
    relocation_stipend_offered NUMERIC(10,2) DEFAULT 0,
    allocated_by VARCHAR(150),
    allocated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview Slots (Calendar & Slot Management)
CREATE TABLE IF NOT EXISTS interview_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    role_id UUID REFERENCES job_roles(id) ON DELETE SET NULL,
    city VARCHAR(100) NOT NULL,
    slot_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    interviewer_name VARCHAR(150) NOT NULL,
    interviewer_email VARCHAR(255) NOT NULL,
    room_or_link VARCHAR(255) NOT NULL,
    max_capacity INTEGER DEFAULT 1,
    current_candidate_id UUID REFERENCES candidates(id) ON DELETE SET NULL,
    status slot_status_enum NOT NULL DEFAULT 'AVAILABLE',
    recycled_from_candidate_id UUID,
    recycled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interview Waitlist & Fast-Fill Slot Recovery
CREATE TABLE IF NOT EXISTS interview_waitlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    priority VARCHAR(50) DEFAULT 'STANDARD',
    waitlisted_at TIMESTAMPTZ DEFAULT NOW(),
    notified_count INTEGER DEFAULT 0,
    recovery_auto_eligible BOOLEAN DEFAULT TRUE,
    reason_for_waitlist TEXT
);

-- Candidate Attendance Logs
CREATE TABLE IF NOT EXISTS attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES interview_slots(id) ON DELETE SET NULL,
    city VARCHAR(100) NOT NULL,
    scheduled_time TIMESTAMPTZ NOT NULL,
    check_in_time TIMESTAMPTZ,
    badge_number VARCHAR(50),
    status attendance_status_enum NOT NULL DEFAULT 'EXPECTED',
    assigned_room VARCHAR(100),
    notes TEXT,
    marked_by VARCHAR(150)
);

-- Absence Reason Review & HR Decisions
CREATE TABLE IF NOT EXISTS absence_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES attendance_logs(id) ON DELETE CASCADE,
    absence_reason TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'MEDICAL',
    evidence_url TEXT,
    evidence_summary TEXT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'PENDING',
    hr_decision_by VARCHAR(150),
    hr_decision_at TIMESTAMPTZ,
    hr_decision_notes TEXT,
    replacement_slot_id UUID
);

-- Travel Policies
CREATE TABLE IF NOT EXISTS travel_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_name VARCHAR(100) NOT NULL,
    min_distance_km INTEGER NOT NULL,
    max_distance_km INTEGER NOT NULL,
    allowed_modes JSONB DEFAULT '["CAB", "TRAIN_2AC"]'::jsonb,
    max_ticket_reimbursement NUMERIC(10,2) NOT NULL,
    daily_meals_allowance NUMERIC(10,2) NOT NULL,
    receipt_required_threshold NUMERIC(10,2) DEFAULT 25.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Relocation Policies
CREATE TABLE IF NOT EXISTS relocation_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    origin_type VARCHAR(100) NOT NULL,
    lump_sum_relocation_allowance NUMERIC(10,2) NOT NULL,
    guest_house_days INTEGER NOT NULL,
    shipment_movers_allowance NUMERIC(10,2) NOT NULL,
    retention_bond_months INTEGER NOT NULL,
    tax_assistance_included BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Claims
CREATE TABLE IF NOT EXISTS expense_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    claimed_amount NUMERIC(10,2) NOT NULL,
    approved_amount NUMERIC(10,2),
    currency VARCHAR(10) DEFAULT 'USD',
    receipt_url TEXT,
    receipt_name VARCHAR(255),
    expense_date DATE NOT NULL,
    policy_compliance VARCHAR(50) DEFAULT 'COMPLIANT',
    compliance_note TEXT,
    status expense_status_enum NOT NULL DEFAULT 'SUBMITTED',
    hr_reviewer_notes TEXT,
    hr_reviewer_name VARCHAR(150),
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payroll Disbursements
CREATE TABLE IF NOT EXISTS payroll_disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    batch_code VARCHAR(100) NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    claim_id UUID REFERENCES expense_claims(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    bank_account_masked VARCHAR(50) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'NEFT',
    status payroll_status_enum DEFAULT 'QUEUED',
    reference_number VARCHAR(100),
    disbursed_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_date TIMESTAMPTZ DEFAULT NOW()
);

-- Ranking Rules Configuration
CREATE TABLE IF NOT EXISTS ranking_rules_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID REFERENCES hiring_drives(id) ON DELETE CASCADE,
    skill_match_weight INTEGER DEFAULT 35,
    experience_weight INTEGER DEFAULT 20,
    location_match_weight INTEGER DEFAULT 25,
    relocation_willingness_weight INTEGER DEFAULT 10,
    assessment_score_weight INTEGER DEFAULT 10,
    prioritize_first_preference BOOLEAN DEFAULT TRUE,
    min_passing_threshold INTEGER DEFAULT 60,
    allow_buffer_overflow BOOLEAN DEFAULT TRUE,
    max_buffer_percentage INTEGER DEFAULT 20,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(150)
);

-- Audit History Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_name VARCHAR(150) NOT NULL,
    actor_role user_role_enum NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    ip_address VARCHAR(50) DEFAULT '127.0.0.1'
);

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_drives_status ON hiring_drives(status);
CREATE INDEX IF NOT EXISTS idx_vacancies_drive ON city_vacancies(drive_id, city);
CREATE INDEX IF NOT EXISTS idx_allocations_drive_city ON candidate_allocations(drive_id, allocated_city, status);
CREATE INDEX IF NOT EXISTS idx_slots_drive_date ON interview_slots(drive_id, slot_date, city);
CREATE INDEX IF NOT EXISTS idx_attendance_drive_status ON attendance_logs(drive_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_status ON expense_claims(status);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE hiring_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE city_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE relocation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_disbursements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_rules_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to perform operations based on HR roles
CREATE POLICY "Allow authenticated read all" ON hiring_drives FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write all" ON hiring_drives FOR ALL USING (true);

CREATE POLICY "Allow public read-write for dev" ON candidate_allocations FOR ALL USING (true);
CREATE POLICY "Allow public read-write for dev slots" ON interview_slots FOR ALL USING (true);
CREATE POLICY "Allow public read-write for dev claims" ON expense_claims FOR ALL USING (true);

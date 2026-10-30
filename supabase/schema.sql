-- ========================================================
-- HIRESLOT CANDIDATE PORTAL: SUPABASE DATABASE SCHEMA
-- PostgreSQL schema for candidate authentication, profile,
-- job matching, slot bookings, waitlists, claims, and appeals.
-- ========================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CANDIDATES & PROFILES
CREATE TABLE IF NOT EXISTS candidates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE, -- References auth.users(id)
    drive_id UUID,
    role_id UUID,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    current_city VARCHAR(100),
    bio TEXT,
    portfolio_url TEXT,
    github_url TEXT,
    linkedin_url TEXT,
    avatar_url TEXT,
    experience_years NUMERIC(4,1) DEFAULT 0,
    education JSONB DEFAULT '[]'::jsonb,
    experience_history JSONB DEFAULT '[]'::jsonb,
    skills JSONB DEFAULT '[]'::jsonb,
    location_preferences JSONB DEFAULT '[]'::jsonb,
    relocation JSONB DEFAULT '{"willingToRelocate": true, "preferredTimeline": "30_DAYS"}'::jsonb,
    assessment_score NUMERIC(5,2) DEFAULT 0,
    allocated_city VARCHAR(100),
    allocation_status VARCHAR(50) DEFAULT 'PENDING',
    interview_slot_id UUID,
    reconfirmed_attendance BOOLEAN DEFAULT FALSE,
    reconfirmed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. JOB ROLES & REQUIREMENTS
CREATE TABLE IF NOT EXISTS job_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    experience_band VARCHAR(50) NOT NULL,
    min_experience_years NUMERIC(4,1) DEFAULT 0,
    cutoff_score NUMERIC(5,2) DEFAULT 70.0,
    required_skills JSONB DEFAULT '[]'::jsonb,
    base_salary_min NUMERIC(12,2),
    base_salary_max NUMERIC(12,2),
    currency VARCHAR(10) DEFAULT 'INR',
    active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. HIRING DRIVES
CREATE TABLE IF NOT EXISTS hiring_drives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    batch_code VARCHAR(100) UNIQUE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    target_roles TEXT[] DEFAULT '{}',
    target_locations TEXT[] DEFAULT '{}',
    total_target_hires INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ALTERNATIVE CITY OFFERS
CREATE TABLE IF NOT EXISTS alternative_city_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    original_preferred_city VARCHAR(100) NOT NULL,
    offered_city VARCHAR(100) NOT NULL,
    drive_id UUID,
    role_id UUID,
    relocation_bonus_offered NUMERIC(10,2) DEFAULT 75000,
    currency VARCHAR(10) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'PENDING',
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 days'),
    notes TEXT
);

-- 5. INTERVIEW SLOTS
CREATE TABLE IF NOT EXISTS interview_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drive_id UUID,
    role_id UUID,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode VARCHAR(50) DEFAULT 'VIRTUAL',
    venue_or_link TEXT NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    panel JSONB NOT NULL,
    max_candidates INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'AVAILABLE',
    booked_candidate_id UUID,
    booked_candidate_name VARCHAR(255),
    notes TEXT,
    is_recovered_slot BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. WAITLIST & TIMED OFFERS
CREATE TABLE IF NOT EXISTS waitlist_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    drive_id UUID,
    role_id UUID,
    preferred_city VARCHAR(100) NOT NULL,
    rank_score NUMERIC(5,2) NOT NULL,
    waitlisted_since TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'QUEUED'
);

CREATE TABLE IF NOT EXISTS timed_slot_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID REFERENCES interview_slots(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    offered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    slot_details JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

-- 7. ATTENDANCE & ABSENCE APPEALS
CREATE TABLE IF NOT EXISTS attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slot_id UUID REFERENCES interview_slots(id) ON DELETE CASCADE,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    role_title VARCHAR(255) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED',
    check_in_time TIMESTAMP WITH TIME ZONE,
    interview_start_time TIMESTAMP WITH TIME ZONE,
    interview_end_time TIMESTAMP WITH TIME ZONE,
    interviewer_rating NUMERIC(3,1),
    interviewer_notes TEXT
);

CREATE TABLE IF NOT EXISTS absence_appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    slot_id UUID REFERENCES interview_slots(id) ON DELETE CASCADE,
    interview_date DATE NOT NULL,
    reason_category VARCHAR(100) NOT NULL,
    explanation TEXT NOT NULL,
    has_document_attachment BOOLEAN DEFAULT FALSE,
    document_name VARCHAR(255),
    document_url TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    hr_decision_status VARCHAR(50) DEFAULT 'PENDING_REVIEW',
    hr_decision_notes TEXT,
    decided_by VARCHAR(100),
    decided_at TIMESTAMP WITH TIME ZONE
);

-- 8. TRAVEL & RELOCATION CLAIMS
CREATE TABLE IF NOT EXISTS travel_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    drive_id UUID,
    category VARCHAR(50) NOT NULL,
    claim_amount NUMERIC(10,2) NOT NULL,
    approved_amount NUMERIC(10,2),
    currency VARCHAR(10) DEFAULT 'INR',
    invoice_date DATE NOT NULL,
    receipt_file_name VARCHAR(255) NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    policy_limit_notes TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS relocation_claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    drive_id UUID,
    relocation_from_city VARCHAR(100) NOT NULL,
    relocation_to_city VARCHAR(100) NOT NULL,
    grant_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    bank_account_masked VARCHAR(50) NOT NULL,
    bank_ifsc VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'SUBMITTED',
    transaction_ref_id VARCHAR(100),
    disbursed_at TIMESTAMP WITH TIME ZONE,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Security Rule: Candidates can only query their own data
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE travel_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE relocation_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE absence_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE timed_slot_offers ENABLE ROW LEVEL SECURITY;


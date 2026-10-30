-- Migration 01: Core Extensions, Enums, Profiles, Organizations, and HR Permissions
-- HireSlot Backend System

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CUSTOM ENUMS
-- ============================================================================
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'candidate',
        'hr_staff',
        'interviewer',
        'payroll_officer',
        'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE hr_permission_level AS ENUM (
        'viewer',
        'manager',
        'admin'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE slot_status AS ENUM (
        'open',
        'booked',
        'cancelled',
        'completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM (
        'confirmed',
        'cancelled',
        'attended',
        'no_show'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE waitlist_status AS ENUM (
        'waiting',
        'offered',
        'expired',
        'accepted',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE timed_offer_status AS ENUM (
        'pending',
        'claimed',
        'expired',
        'declined'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM (
        'attended',
        'late',
        'absent_unexcused',
        'absence_excused',
        'absence_requested'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE absence_case_status AS ENUM (
        'submitted',
        'under_review',
        'approved_reschedule',
        'rejected'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE claim_category AS ENUM (
        'interview_travel',
        'employee_relocation'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE reimbursement_method AS ENUM (
        'fixed_allowance',
        'actual_expenses'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE claim_status AS ENUM (
        'draft',
        'submitted',
        'under_hr_review',
        'hr_approved',
        'hr_rejected',
        'payout_queued',
        'paid'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payout_status AS ENUM (
        'pending',
        'processed',
        'failed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. PROFILES TABLE (Supabase Auth Integration)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'candidate',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Automatic Profile Provisioning Trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, phone, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        'candidate'::user_role, -- STRICT SECURITY: Every public signup receives the candidate role by default. User metadata MUST NEVER grant privileged roles.
        NEW.raw_user_meta_data->>'phone',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
        updated_at = now();
        -- Note: role is NEVER updated from raw_user_meta_data; administrative role assignment must use trusted admin actions.
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Profile updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. ORGANIZATIONS (Companies & Locations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code VARCHAR(32) NOT NULL UNIQUE,
    tax_identifier VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(code);

CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT,
    country VARCHAR(64) NOT NULL DEFAULT 'India',
    address TEXT,
    timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_company_location_name UNIQUE (company_id, name),
    CONSTRAINT uq_locations_id_company UNIQUE (id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_locations_company_city ON public.locations(company_id, city);

-- ============================================================================
-- 4. HR ACCESS & SCOPE PERMISSIONS
-- ============================================================================
-- Scopes HR users to specific company and optional specific location.
-- If location_id IS NULL, HR user has company-wide permission.
CREATE TABLE IF NOT EXISTS public.hr_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    location_id UUID,
    permission_level hr_permission_level NOT NULL DEFAULT 'viewer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Enforce that location_id belongs to the same company_id
    CONSTRAINT fk_hr_permissions_location_company 
        FOREIGN KEY (location_id, company_id) 
        REFERENCES public.locations(id, company_id) 
        ON DELETE CASCADE
);

-- Fix duplicate company-wide HR permission handling (NULL != NULL in standard unique constraints)
-- Enforce unique company-wide permission (one per user per company when location_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_permissions_company_wide 
    ON public.hr_permissions (user_id, company_id) 
    WHERE location_id IS NULL;

-- Enforce unique location-specific permission (one per user per company per location when location_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_hr_permissions_location 
    ON public.hr_permissions (user_id, company_id, location_id) 
    WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hr_permissions_lookup 
    ON public.hr_permissions(user_id, company_id, location_id);

-- Enforce cross-company location integrity validation
CREATE OR REPLACE FUNCTION public.check_hr_permission_location_company()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.location_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.locations
            WHERE id = NEW.location_id AND company_id = NEW.company_id
        ) THEN
            RAISE EXCEPTION 'Location % does not belong to company %.', NEW.location_id, NEW.company_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_hr_permission_location_company ON public.hr_permissions;
CREATE TRIGGER trg_check_hr_permission_location_company
    BEFORE INSERT OR UPDATE OF location_id, company_id ON public.hr_permissions
    FOR EACH ROW EXECUTE FUNCTION public.check_hr_permission_location_company();

-- Helper functions for RLS & Authorization checks
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.has_hr_permission(
    p_company_id UUID,
    p_location_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role user_role;
BEGIN
    SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
    
    -- Admins have unrestricted system-wide access
    IF v_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Only hr_staff or payroll_officer can have HR permissions
    IF v_role NOT IN ('hr_staff', 'payroll_officer') THEN
        RETURN FALSE;
    END IF;

    -- If p_location_id IS NULL: caller is requesting company-wide access.
    -- This strictly requires an explicit company-wide permission record (hp.location_id IS NULL).
    -- If p_location_id IS NOT NULL: caller is requesting location-specific access.
    -- This is satisfied if the user has an explicit company-wide permission (hp.location_id IS NULL)
    -- OR an exact location-matching permission (hp.location_id = p_location_id).
    RETURN EXISTS (
        SELECT 1 FROM public.hr_permissions hp
        WHERE hp.user_id = auth.uid()
          AND hp.company_id = p_company_id
          AND (
              hp.location_id IS NULL
              OR (p_location_id IS NOT NULL AND hp.location_id = p_location_id)
          )
    );
END;
$$;

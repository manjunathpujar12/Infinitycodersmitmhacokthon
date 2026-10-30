-- Migration 03: Attendance Records and Candidate Absence Cases
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. ATTENDANCE RECORDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.interview_bookings(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    status attendance_status NOT NULL DEFAULT 'attended',
    check_in_time TIMESTAMPTZ,
    marked_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_attendance_booking UNIQUE (booking_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_candidate ON public.attendance_records(candidate_id, status);

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON public.attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. ABSENCE CASES (For Excuses, Medical, Emergency Reschedule Requests)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.absence_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.interview_bookings(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    reason_type VARCHAR(64) NOT NULL CHECK (reason_type IN ('medical', 'bereavement', 'transit_delay', 'tech_failure', 'emergency', 'other')),
    explanation TEXT NOT NULL,
    proof_document_path TEXT, -- Storage path inside private 'absence-proofs' bucket
    status absence_case_status NOT NULL DEFAULT 'submitted',
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_absence_cases_candidate ON public.absence_cases(candidate_id, status);
CREATE INDEX IF NOT EXISTS idx_absence_cases_booking ON public.absence_cases(booking_id);

DROP TRIGGER IF EXISTS trg_absence_cases_updated_at ON public.absence_cases;
CREATE TRIGGER trg_absence_cases_updated_at
    BEFORE UPDATE ON public.absence_cases
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

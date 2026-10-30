-- Migration 08: Waitlist Location Scoping and Candidate Resumes Storage Bucket
-- HireSlot Backend System

-- ============================================================================
-- 1. WAITLIST LOCATION SCOPING
-- ============================================================================
-- Add location_id to public.interview_waitlist to scope waitlisted candidate
-- access to assigned company branch locations.
-- Nullable: candidates waitlisted for virtual/remote positions or unassigned
-- pipelines retain NULL and are governed strictly by company-wide HR or Admin.
ALTER TABLE public.interview_waitlist 
ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL;

-- Index to optimize stage and location scoped waitlist queries
CREATE INDEX IF NOT EXISTS idx_interview_waitlist_stage_location 
ON public.interview_waitlist (stage_id, location_id);

-- Secondary index on location_id for location-filtered lookups
CREATE INDEX IF NOT EXISTS idx_interview_waitlist_location 
ON public.interview_waitlist (location_id);

-- ============================================================================
-- 2. PRIVATE STORAGE BUCKET: resumes
-- ============================================================================
-- Supabase Storage bucket for storing synthetic and candidate PDF resumes.
-- - Public access: FALSE (Private bucket, authenticated RLS only)
-- - File size limit: 5 MB (5,242,880 bytes)
-- - Allowed MIME types: application/pdf only
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'resumes',
    'resumes',
    false,
    5242880, -- 5 MB limit (5 * 1024 * 1024 bytes)
    ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;


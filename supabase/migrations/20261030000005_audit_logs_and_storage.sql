-- Migration 05: Tamper-Evident Audit Logs and Supabase Storage Buckets
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. AUDIT LOGS (Immutable Security and Financial Audit Trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(64) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(16) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'RPC_CALL')),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(32),
    old_data JSONB,
    new_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record 
    ON public.audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor 
    ON public.audit_logs(actor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON public.audit_logs(created_at DESC);

-- Immutability enforcement: audit_logs cannot be modified or deleted
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit log entries are immutable and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- Generic audit trigger function for tracked entities
CREATE OR REPLACE FUNCTION public.track_entity_audit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_actor_role VARCHAR(32);
    v_record_id UUID;
    v_old_data JSONB := NULL;
    v_new_data JSONB := NULL;
BEGIN
    v_actor_id := auth.uid();
    
    IF v_actor_id IS NOT NULL THEN
        SELECT role::text INTO v_actor_role FROM public.profiles WHERE id = v_actor_id;
    END IF;

    IF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id;
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id;
        v_old_data := to_jsonb(OLD);
    END IF;

    INSERT INTO public.audit_logs (
        table_name,
        record_id,
        action,
        actor_id,
        actor_role,
        old_data,
        new_data
    ) VALUES (
        TG_TABLE_NAME::text,
        v_record_id,
        TG_OP,
        v_actor_id,
        COALESCE(v_actor_role, 'system'),
        v_old_data,
        v_new_data
    );

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Attach automatic audit logging triggers to high-security tables
DROP TRIGGER IF EXISTS trg_audit_expense_claims ON public.expense_claims;
CREATE TRIGGER trg_audit_expense_claims
    AFTER INSERT OR UPDATE OR DELETE ON public.expense_claims
    FOR EACH ROW EXECUTE FUNCTION public.track_entity_audit();

DROP TRIGGER IF EXISTS trg_audit_claim_payouts ON public.claim_payouts;
CREATE TRIGGER trg_audit_claim_payouts
    AFTER INSERT OR UPDATE OR DELETE ON public.claim_payouts
    FOR EACH ROW EXECUTE FUNCTION public.track_entity_audit();

DROP TRIGGER IF EXISTS trg_audit_interview_bookings ON public.interview_bookings;
CREATE TRIGGER trg_audit_interview_bookings
    AFTER INSERT OR UPDATE OR DELETE ON public.interview_bookings
    FOR EACH ROW EXECUTE FUNCTION public.track_entity_audit();

DROP TRIGGER IF EXISTS trg_audit_absence_cases ON public.absence_cases;
CREATE TRIGGER trg_audit_absence_cases
    AFTER INSERT OR UPDATE OR DELETE ON public.absence_cases
    FOR EACH ROW EXECUTE FUNCTION public.track_entity_audit();

DROP TRIGGER IF EXISTS trg_audit_city_vacancies ON public.city_vacancies;
CREATE TRIGGER trg_audit_city_vacancies
    AFTER INSERT OR UPDATE OR DELETE ON public.city_vacancies
    FOR EACH ROW EXECUTE FUNCTION public.track_entity_audit();

-- ============================================================================
-- 2. STORAGE BUCKETS (Private Buckets for Receipts & Absence Proofs)
-- ============================================================================
-- Storage buckets in Supabase use the 'storage.buckets' table
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    (
        'claim-receipts',
        'claim-receipts',
        false,
        10485760, -- 10MB limit
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    ),
    (
        'absence-proofs',
        'absence-proofs',
        false,
        10485760, -- 10MB limit
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

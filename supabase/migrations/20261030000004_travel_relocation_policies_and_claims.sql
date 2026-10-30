-- Migration 04: Travel Policies, Relocation Policies, Expense Claims, Items, and Payout Tracking
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. TRAVEL SUPPORT POLICIES (Interview Travel Category)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.travel_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    claim_category claim_category NOT NULL DEFAULT 'interview_travel',
    eligibility_criteria JSONB NOT NULL DEFAULT '{"min_distance_km": 50, "eligible_stages": ["Onsite", "Final"]}'::jsonb,
    reimbursement_method reimbursement_method NOT NULL DEFAULT 'actual_expenses',
    cap_amount NUMERIC(12,2) NOT NULL CHECK (cap_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_travel_category_enforced CHECK (claim_category = 'interview_travel'),
    CONSTRAINT chk_travel_policy_dates CHECK (valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_travel_policies_lookup 
    ON public.travel_policies(company_id, active, valid_from, valid_to);

DROP TRIGGER IF EXISTS trg_travel_policies_updated_at ON public.travel_policies;
CREATE TRIGGER trg_travel_policies_updated_at
    BEFORE UPDATE ON public.travel_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 2. RELOCATION POLICIES (Employee Relocation Category)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.relocation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    claim_category claim_category NOT NULL DEFAULT 'employee_relocation',
    eligibility_criteria JSONB NOT NULL DEFAULT '{"relocation_type": "interstate", "min_distance_km": 150}'::jsonb,
    reimbursement_method reimbursement_method NOT NULL DEFAULT 'actual_expenses',
    cap_amount NUMERIC(12,2) NOT NULL CHECK (cap_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    move_window_days INT NOT NULL DEFAULT 90 CHECK (move_window_days > 0),
    valid_from DATE NOT NULL,
    valid_to DATE NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_relocation_category_enforced CHECK (claim_category = 'employee_relocation'),
    CONSTRAINT chk_relocation_policy_dates CHECK (valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_relocation_policies_lookup 
    ON public.relocation_policies(company_id, active, valid_from, valid_to);

DROP TRIGGER IF EXISTS trg_relocation_policies_updated_at ON public.relocation_policies;
CREATE TRIGGER trg_relocation_policies_updated_at
    BEFORE UPDATE ON public.relocation_policies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 3. EXPENSE CLAIMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expense_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(32) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
    category claim_category NOT NULL,
    policy_id UUID NOT NULL, -- references either travel_policies(id) or relocation_policies(id)
    booking_id UUID REFERENCES public.interview_bookings(id) ON DELETE SET NULL, -- associated interview booking if applicable
    claim_method reimbursement_method NOT NULL,
    status claim_status NOT NULL DEFAULT 'draft',
    total_claimed_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (total_claimed_amount >= 0),
    approved_amount NUMERIC(12,2) CHECK (approved_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    submission_date TIMESTAMPTZ,
    hr_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    hr_reviewed_at TIMESTAMPTZ,
    hr_decision_notes TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expense_claims_user ON public.expense_claims(user_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_company ON public.expense_claims(company_id, status);
CREATE INDEX IF NOT EXISTS idx_expense_claims_category ON public.expense_claims(category, status);

DROP TRIGGER IF EXISTS trg_expense_claims_updated_at ON public.expense_claims;
CREATE TRIGGER trg_expense_claims_updated_at
    BEFORE UPDATE ON public.expense_claims
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- 4. EXPENSE CLAIM ITEMS (Detailed Receipts & Invoices)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.expense_claim_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES public.expense_claims(id) ON DELETE CASCADE,
    expense_category VARCHAR(64) NOT NULL CHECK (expense_category IN (
        'flight', 'train', 'hotel', 'local_transit', 'packers_movers', 'meals', 'temporary_housing', 'other'
    )),
    expense_date DATE NOT NULL,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    receipt_storage_path TEXT, -- Storage path inside private 'claim-receipts' bucket
    verified_by_hr BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_items_claim ON public.expense_claim_items(claim_id);

DROP TRIGGER IF EXISTS trg_expense_claim_items_updated_at ON public.expense_claim_items;
CREATE TRIGGER trg_expense_claim_items_updated_at
    BEFORE UPDATE ON public.expense_claim_items
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Automatic calculation of claim total from items when claim is draft
CREATE OR REPLACE FUNCTION public.sync_claim_total()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim_id UUID;
    v_sum NUMERIC(12,2);
    v_claim_status claim_status;
BEGIN
    v_claim_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.claim_id ELSE NEW.claim_id END;
    
    SELECT status INTO v_claim_status FROM public.expense_claims WHERE id = v_claim_id;
    
    -- Only auto-update total if claim is still in draft
    IF v_claim_status = 'draft' THEN
        SELECT COALESCE(SUM(amount), 0.00) INTO v_sum
        FROM public.expense_claim_items
        WHERE claim_id = v_claim_id;

        UPDATE public.expense_claims
        SET total_claimed_amount = v_sum, updated_at = now()
        WHERE id = v_claim_id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_claim_total ON public.expense_claim_items;
CREATE TRIGGER trg_sync_claim_total
    AFTER INSERT OR UPDATE OR DELETE ON public.expense_claim_items
    FOR EACH ROW EXECUTE FUNCTION public.sync_claim_total();

-- ============================================================================
-- 5. CLAIM PAYOUTS (Financial Tracking with Masked Banking Info)
-- ============================================================================
-- Actual payouts are handled outside the app by HR/Payroll.
-- HireSlot stores the payout status, external banking reference, and masked bank last-4.
CREATE TABLE IF NOT EXISTS public.claim_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL UNIQUE REFERENCES public.expense_claims(id) ON DELETE RESTRICT,
    payment_status payout_status NOT NULL DEFAULT 'pending',
    payout_reference VARCHAR(128), -- Wire reference, UTR, or ACH confirmation number
    payout_amount NUMERIC(12,2) NOT NULL CHECK (payout_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    bank_account_last4 VARCHAR(4) NOT NULL CHECK (bank_account_last4 ~ '^[0-9]{4}$'), -- Masked: exactly 4 digits
    bank_routing_or_ifsc_code VARCHAR(32), -- Routing code or IFSC (non-secret identifier)
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_claim_payouts_status ON public.claim_payouts(payment_status);
CREATE INDEX IF NOT EXISTS idx_claim_payouts_ref ON public.claim_payouts(payout_reference);

DROP TRIGGER IF EXISTS trg_claim_payouts_updated_at ON public.claim_payouts;
CREATE TRIGGER trg_claim_payouts_updated_at
    BEFORE UPDATE ON public.claim_payouts
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

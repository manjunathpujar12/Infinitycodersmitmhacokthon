-- Migration 07: Complete Row Level Security (RLS) Policies and Storage Access Control
-- HireSlot Backend System

SET search_path = public;

-- ============================================================================
-- 1. ENABLE ROW LEVEL SECURITY ACROSS ALL TABLES
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_openings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.city_vacancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timed_slot_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.absence_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relocation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_claim_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.claim_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. PROFILES POLICIES
-- ============================================================================
-- Users can view their own profile; HR/Interviewer can view candidate profiles in their scope; Admins view all
CREATE POLICY "profiles_select_own_or_authorized" ON public.profiles
    FOR SELECT USING (
        id = auth.uid()
        OR public.get_current_user_role() IN ('admin', 'hr_staff', 'interviewer', 'payroll_officer')
    );

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (
        id = auth.uid()
    ) WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Role cannot be escalated by user
    );

-- ============================================================================
-- 3. COMPANIES & LOCATIONS POLICIES
-- ============================================================================
-- Companies: Everyone authenticated can view company listings (needed for job applications); Only HR/Admin can mutate
CREATE POLICY "companies_select_all" ON public.companies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "companies_modify_admin" ON public.companies
    FOR ALL USING (public.get_current_user_role() = 'admin');

-- Locations: Authenticated users can view; HR/Admin can manage for their company
CREATE POLICY "locations_select_all" ON public.locations
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "locations_modify_hr_admin" ON public.locations
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
        OR public.has_hr_permission(company_id)
    );

-- HR Permissions table: Only accessible by Admins or the user themselves (to inspect their scope)
CREATE POLICY "hr_permissions_select" ON public.hr_permissions
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
    );

CREATE POLICY "hr_permissions_admin_all" ON public.hr_permissions
    FOR ALL USING (public.get_current_user_role() = 'admin');

-- ============================================================================
-- 4. JOB OPENINGS & CITY VACANCIES POLICIES
-- ============================================================================
CREATE POLICY "job_openings_select" ON public.job_openings
    FOR SELECT USING (
        is_active = true 
        OR public.get_current_user_role() = 'admin'
        OR public.has_hr_permission(company_id)
    );

CREATE POLICY "job_openings_modify_hr" ON public.job_openings
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
        OR public.has_hr_permission(company_id)
    );

CREATE POLICY "city_vacancies_select" ON public.city_vacancies
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "city_vacancies_modify_hr" ON public.city_vacancies
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.job_openings j
            WHERE j.id = city_vacancies.job_opening_id
              AND public.has_hr_permission(j.company_id, city_vacancies.location_id)
        )
    );

-- ============================================================================
-- 5. INTERVIEW STAGES & SLOTS POLICIES
-- ============================================================================
CREATE POLICY "interview_stages_select" ON public.interview_stages
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "interview_stages_modify" ON public.interview_stages
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.job_openings j
            WHERE j.id = interview_stages.job_opening_id
              AND public.has_hr_permission(j.company_id)
        )
    );

-- Slots: Candidates can view open slots; Interviewers can view slots they conduct; HR can view/manage assigned company/location slots
CREATE POLICY "interview_slots_select" ON public.interview_slots
    FOR SELECT USING (
        status = 'open'
        OR interviewer_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_slots.stage_id
              AND public.has_hr_permission(j.company_id, interview_slots.location_id)
        )
    );

CREATE POLICY "interview_slots_modify_hr" ON public.interview_slots
    FOR ALL USING (
        public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_slots.stage_id
              AND public.has_hr_permission(j.company_id, interview_slots.location_id)
        )
    );

-- ============================================================================
-- 6. INTERVIEW BOOKINGS & WAITLIST POLICIES
-- ============================================================================
-- Candidates can view their own bookings; Interviewer can view bookings for their slots; HR can view within scope
CREATE POLICY "bookings_select" ON public.interview_bookings
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            WHERE s.id = interview_bookings.slot_id
              AND (
                  s.interviewer_id = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.interview_stages st
                      JOIN public.job_openings j ON st.job_opening_id = j.id
                      WHERE st.id = s.stage_id
                        AND public.has_hr_permission(j.company_id, s.location_id)
                  )
              )
        )
    );

-- Candidate can cancel their own booking (or HR can manage)
CREATE POLICY "bookings_update_candidate_or_hr" ON public.interview_bookings
    FOR UPDATE USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = interview_bookings.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

-- Waitlist: Candidates view their own; HR views for their pipeline
CREATE POLICY "waitlist_select" ON public.interview_waitlist
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_stages st
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE st.id = interview_waitlist.stage_id
              AND public.has_hr_permission(j.company_id)
        )
    );

-- Timed offers: Candidate views their own offers; HR views within scope
CREATE POLICY "timed_offers_select" ON public.timed_slot_offers
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_slots s
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE s.id = timed_slot_offers.slot_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

-- ============================================================================
-- 7. ATTENDANCE & ABSENCE CASES POLICIES
-- ============================================================================
CREATE POLICY "attendance_select" ON public.attendance_records
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR marked_by = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_bookings b
            JOIN public.interview_slots s ON b.slot_id = s.id
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE b.id = attendance_records.booking_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

CREATE POLICY "absence_cases_select" ON public.absence_cases
    FOR SELECT USING (
        candidate_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR EXISTS (
            SELECT 1 FROM public.interview_bookings b
            JOIN public.interview_slots s ON b.slot_id = s.id
            JOIN public.interview_stages st ON s.stage_id = st.id
            JOIN public.job_openings j ON st.job_opening_id = j.id
            WHERE b.id = absence_cases.booking_id
              AND public.has_hr_permission(j.company_id, s.location_id)
        )
    );

CREATE POLICY "absence_cases_insert_candidate" ON public.absence_cases
    FOR INSERT WITH CHECK (
        candidate_id = auth.uid()
    );

-- ============================================================================
-- 8. POLICIES & EXPENSE CLAIMS POLICIES
-- ============================================================================
-- Policies: Any authenticated user can view active policies
CREATE POLICY "travel_policies_select" ON public.travel_policies
    FOR SELECT TO authenticated USING (active = true OR public.has_hr_permission(company_id));

CREATE POLICY "travel_policies_modify_hr" ON public.travel_policies
    FOR ALL USING (public.get_current_user_role() = 'admin' OR public.has_hr_permission(company_id));

CREATE POLICY "relocation_policies_select" ON public.relocation_policies
    FOR SELECT TO authenticated USING (active = true OR public.has_hr_permission(company_id));

CREATE POLICY "relocation_policies_modify_hr" ON public.relocation_policies
    FOR ALL USING (public.get_current_user_role() = 'admin' OR public.has_hr_permission(company_id));

-- Expense Claims:
-- 1. Candidates see only their own claims
-- 2. HR sees claims for their assigned company
-- 3. Payroll officers see approved claims
CREATE POLICY "expense_claims_select" ON public.expense_claims
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.get_current_user_role() = 'admin'
        OR public.has_hr_permission(company_id)
        OR (public.get_current_user_role() = 'payroll_officer' AND status IN ('hr_approved', 'paid'))
    );

-- Candidate can only insert claims for themselves with status = 'draft'
CREATE POLICY "expense_claims_insert_candidate" ON public.expense_claims
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND status = 'draft'
        AND approved_amount IS NULL
        AND hr_reviewer_id IS NULL
    );

-- Candidate can update only their own draft claims (cannot modify approval status!)
CREATE POLICY "expense_claims_update_draft" ON public.expense_claims
    FOR UPDATE USING (
        user_id = auth.uid()
        AND status = 'draft'
    ) WITH CHECK (
        user_id = auth.uid()
        AND status = 'draft'
        AND approved_amount IS NULL
        AND hr_reviewer_id IS NULL
    );

-- Claim Items:
CREATE POLICY "claim_items_select" ON public.expense_claim_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.expense_claims c
            WHERE c.id = expense_claim_items.claim_id
              AND (
                  c.user_id = auth.uid()
                  OR public.get_current_user_role() = 'admin'
                  OR public.has_hr_permission(c.company_id)
                  OR (public.get_current_user_role() = 'payroll_officer' AND c.status IN ('hr_approved', 'paid'))
              )
        )
    );

-- Candidates can modify line items only when claim is in draft
CREATE POLICY "claim_items_insert_candidate" ON public.expense_claim_items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.expense_claims c
            WHERE c.id = expense_claim_items.claim_id
              AND c.user_id = auth.uid()
              AND c.status = 'draft'
        )
    );

CREATE POLICY "claim_items_modify_candidate" ON public.expense_claim_items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.expense_claims c
            WHERE c.id = expense_claim_items.claim_id
              AND c.user_id = auth.uid()
              AND c.status = 'draft'
        )
    );

CREATE POLICY "claim_items_delete_candidate" ON public.expense_claim_items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.expense_claims c
            WHERE c.id = expense_claim_items.claim_id
              AND c.user_id = auth.uid()
              AND c.status = 'draft'
        )
    );

-- ============================================================================
-- 9. CLAIM PAYOUTS POLICIES
-- ============================================================================
-- Candidates see payout status & reference for their claim; HR/Payroll see company payouts
CREATE POLICY "claim_payouts_select" ON public.claim_payouts
    FOR SELECT USING (
        public.get_current_user_role() IN ('admin', 'payroll_officer')
        OR EXISTS (
            SELECT 1 FROM public.expense_claims c
            WHERE c.id = claim_payouts.claim_id
              AND (
                  c.user_id = auth.uid()
                  OR public.has_hr_permission(c.company_id)
              )
        )
    );

-- Payouts can ONLY be inserted or updated by payroll officers or admins
CREATE POLICY "claim_payouts_modify_payroll" ON public.claim_payouts
    FOR ALL USING (
        public.get_current_user_role() IN ('admin', 'payroll_officer')
    );

-- ============================================================================
-- 10. AUDIT LOGS POLICIES
-- ============================================================================
-- Only Admins and HR staff (scoped to their company actions) can view audit logs
CREATE POLICY "audit_logs_select" ON public.audit_logs
    FOR SELECT USING (
        public.get_current_user_role() = 'admin'
        OR (
            public.get_current_user_role() IN ('hr_staff', 'payroll_officer')
            AND actor_id = auth.uid()
        )
    );

-- ============================================================================
-- 11. SUPABASE STORAGE RLS POLICIES (claim-receipts & absence-proofs)
-- ============================================================================
-- Objects table in schema 'storage'
-- Path structure: {user_id}/{record_id}/{filename}

-- Claim receipts bucket policies
CREATE POLICY "storage_claim_receipts_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'claim-receipts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "storage_claim_receipts_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'claim-receipts'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() IN ('admin', 'hr_staff', 'payroll_officer')
        )
    );

CREATE POLICY "storage_claim_receipts_delete" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'claim-receipts'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Absence proofs bucket policies
CREATE POLICY "storage_absence_proofs_insert" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'absence-proofs'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "storage_absence_proofs_select" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'absence-proofs'
        AND (
            (storage.foldername(name))[1] = auth.uid()::text
            OR public.get_current_user_role() IN ('admin', 'hr_staff')
        )
    );

-- Migration 11: Explicitly remove anonymous execution from all SECURITY DEFINER routines.
-- Trigger functions are not RPC endpoints and need no client EXECUTE grants.
REVOKE EXECUTE ON FUNCTION public._internal_promote_next_waitlisted_candidate(UUID, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.allocate_candidate(UUID, UUID, UUID, BOOLEAN) FROM anon;
REVOKE EXECUTE ON FUNCTION public.allocate_city_vacancy(UUID, UUID, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.book_interview_slot(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_timed_slot_offer(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_role_protection() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fast_fill_slot(UUID, BOOLEAN, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_hr_permission(UUID, UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.join_interview_waitlist(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_interview_attendance(UUID, attendance_status, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.offer_slot_to_next_waitlisted(UUID, INT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_expired_offers() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_payroll_batch(VARCHAR, UUID[], TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.record_claim_payout(UUID, VARCHAR, VARCHAR, VARCHAR, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_absence_case(UUID, absence_case_status, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.review_expense_claim(UUID, TEXT, NUMERIC, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_absence_case(UUID, VARCHAR, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.submit_expense_claim(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.track_entity_audit() FROM PUBLIC, anon, authenticated;

-- Helpers used in RLS predicates remain callable by signed-in users only.
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_hr_permission(UUID, UUID) TO authenticated, service_role;
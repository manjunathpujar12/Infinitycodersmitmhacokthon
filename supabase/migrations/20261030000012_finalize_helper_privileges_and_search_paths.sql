-- Migration 12: Finalize helper privileges and pin trigger function search paths.
REVOKE EXECUTE ON FUNCTION public.get_current_user_role() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_hr_permission(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_current_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_hr_permission(UUID, UUID) TO authenticated, service_role;

ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.check_hr_permission_location_company() SET search_path = public;
ALTER FUNCTION public.sync_claim_total() SET search_path = public;
ALTER FUNCTION public.prevent_audit_log_mutation() SET search_path = public;
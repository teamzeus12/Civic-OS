-- Restrict internal SECURITY DEFINER helpers to signed-in callers where required.
-- Public civic-feed functions remain intentionally callable by anon/authenticated.
-- RLS policies still need authenticated execution of the two access-check helpers.
revoke all on function public.civic_can_access_report(uuid) from public, anon;
grant execute on function public.civic_can_access_report(uuid) to authenticated, service_role;

revoke all on function public.civic_is_admin() from public, anon;
grant execute on function public.civic_is_admin() to authenticated, service_role;

-- These functions are trigger entry points, not RPC endpoints. Trigger execution
-- does not require end users to have direct EXECUTE privileges.
revoke all on function public.civic_prevent_profile_privilege_change() from public, anon, authenticated;
revoke all on function public.prevent_profile_privilege_escalation() from public, anon, authenticated;

-- Government status updates are authenticated workflows, never anonymous actions.
revoke all on function public.government_update_report_status(text, text, text) from public, anon;
grant execute on function public.government_update_report_status(text, text, text) to authenticated, service_role;

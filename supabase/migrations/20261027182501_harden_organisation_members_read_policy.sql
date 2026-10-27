drop policy if exists civic_organisation_members_related_read on public.civic_organisation_members;
create policy civic_organisation_members_related_read on public.civic_organisation_members
for select to authenticated
using (user_id = (select auth.uid()) or invited_by = (select auth.uid()));
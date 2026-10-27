-- Ensure organisation creation uses SQL COALESCE syntax, not a schema-qualified function call.
create or replace function public.civic_create_organisation(
  p_name text,
  p_organisation_type text,
  p_focus_area text,
  p_location text,
  p_description text,
  p_invited_user_ids uuid[] default array[]::uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := (select auth.uid());
  v_org_id uuid;
begin
  if v_user is null then raise exception 'Sign in to form an organisation.'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user and p.role = 'citizen') then
    raise exception 'Only citizen accounts can form an organisation.';
  end if;
  if p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 3 and 80 then raise exception 'Organisation name must be 3–80 characters.'; end if;
  if p_organisation_type not in ('Community group','Student organisation','Volunteer group','Environmental group','Civic advocacy','Other') then raise exception 'Choose a valid organisation type.'; end if;
  if p_focus_area not in ('General civic action','Environment','Waste & sanitation','Roads & infrastructure','Education','Public health','Disaster preparedness','Other') then raise exception 'Choose a valid focus area.'; end if;
  if p_location is null or pg_catalog.char_length(pg_catalog.btrim(p_location)) not between 2 and 120 then raise exception 'Enter a location.'; end if;
  if p_description is null or pg_catalog.char_length(pg_catalog.btrim(p_description)) not between 20 and 1000 then raise exception 'Description must be 20–1000 characters.'; end if;
  if coalesce(pg_catalog.cardinality(p_invited_user_ids), 0) > 30 then raise exception 'You can invite up to 30 friends at a time.'; end if;

  if exists (
    select 1 from (select distinct unnest(coalesce(p_invited_user_ids, array[]::uuid[])) as invitee_id) requested
    where requested.invitee_id = v_user
       or not exists (
         select 1 from public.civic_friend_requests f
         where f.status = 'accepted'
           and ((f.requester_id = v_user and f.recipient_id = requested.invitee_id)
             or (f.recipient_id = v_user and f.requester_id = requested.invitee_id))
       )
  ) then raise exception 'You can invite accepted friends only. Refresh your friends list and try again.'; end if;

  insert into public.civic_organisations (name, organisation_type, focus_area, location, description, created_by)
  values (pg_catalog.btrim(p_name), p_organisation_type, p_focus_area, pg_catalog.btrim(p_location), pg_catalog.btrim(p_description), v_user)
  returning id into v_org_id;

  insert into public.civic_organisation_members (organisation_id, user_id, role, status, invited_by)
  values (v_org_id, v_user, 'founder', 'active', v_user);

  insert into public.civic_organisation_members (organisation_id, user_id, role, status, invited_by)
  select v_org_id, requested.invitee_id, 'member', 'invited', v_user
  from (select distinct unnest(coalesce(p_invited_user_ids, array[]::uuid[])) as invitee_id) requested;

  return v_org_id;
end;
$function$;

revoke all on function public.civic_create_organisation(text,text,text,text,text,uuid[]) from public, anon;
grant execute on function public.civic_create_organisation(text,text,text,text,text,uuid[]) to authenticated;

-- Friend connections and citizen-created organisations for Civic OS.
-- All relationship mutations are performed by authenticated, auth.uid()-checked RPCs.

create table if not exists public.civic_friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint civic_friend_requests_not_self check (requester_id <> recipient_id)
);
create unique index if not exists civic_friend_requests_one_pair
  on public.civic_friend_requests (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index if not exists civic_friend_requests_recipient_status
  on public.civic_friend_requests (recipient_id, status, created_at desc);
create index if not exists civic_friend_requests_requester_status
  on public.civic_friend_requests (requester_id, status, created_at desc);
alter table public.civic_friend_requests enable row level security;
drop policy if exists civic_friend_requests_participant_read on public.civic_friend_requests;
create policy civic_friend_requests_participant_read on public.civic_friend_requests
  for select to authenticated using ((select auth.uid()) = requester_id or (select auth.uid()) = recipient_id);
revoke all on public.civic_friend_requests from anon, authenticated;
grant select on public.civic_friend_requests to authenticated;

create table if not exists public.civic_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 3 and 80),
  organisation_type text not null check (organisation_type in ('Community group','Student organisation','Volunteer group','Environmental group','Civic advocacy','Other')),
  focus_area text not null check (focus_area in ('General civic action','Environment','Waste & sanitation','Roads & infrastructure','Education','Public health','Disaster preparedness','Other')),
  location text not null check (char_length(btrim(location)) between 2 and 120),
  description text not null check (char_length(btrim(description)) between 20 and 1000),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists civic_organisations_created_at on public.civic_organisations (created_at desc);
create index if not exists civic_organisations_name on public.civic_organisations (lower(name));
alter table public.civic_organisations enable row level security;
drop policy if exists civic_organisations_authenticated_read on public.civic_organisations;
create policy civic_organisations_authenticated_read on public.civic_organisations
  for select to authenticated using (true);
revoke all on public.civic_organisations from anon, authenticated;
grant select on public.civic_organisations to authenticated;

create table if not exists public.civic_organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.civic_organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('founder','member')),
  status text not null default 'invited' check (status in ('invited','active','declined')),
  invited_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint civic_organisation_members_unique unique (organisation_id, user_id)
);
create index if not exists civic_organisation_members_user_status on public.civic_organisation_members (user_id, status, created_at desc);
create index if not exists civic_organisation_members_org_status on public.civic_organisation_members (organisation_id, status);
alter table public.civic_organisation_members enable row level security;
drop policy if exists civic_organisation_members_related_read on public.civic_organisation_members;
create policy civic_organisation_members_related_read on public.civic_organisation_members
  for select to authenticated using (
    user_id = (select auth.uid()) or invited_by = (select auth.uid())
  );
revoke all on public.civic_organisation_members from anon, authenticated;
grant select on public.civic_organisation_members to authenticated;

create or replace function public.civic_search_members(p_search text default '', p_limit integer default 30)
returns table(user_id uuid, display_name text, relationship_status text, request_id uuid)
language sql stable security definer set search_path = ''
as $function$
  select p.id,
    coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')),
    case when f.status = 'accepted' then 'friends'
         when f.status = 'pending' and f.requester_id = (select auth.uid()) then 'request_sent'
         when f.status = 'pending' and f.recipient_id = (select auth.uid()) then 'request_received'
         else 'none' end,
    case when f.status = 'pending' then f.id else null end
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.civic_friend_requests f
    on (f.requester_id = (select auth.uid()) and f.recipient_id = p.id)
    or (f.recipient_id = (select auth.uid()) and f.requester_id = p.id)
  where (select auth.uid()) is not null and p.role = 'citizen' and p.id <> (select auth.uid())
    and coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')) is not null
    and (pg_catalog.btrim(coalesce(p_search, '')) = ''
      or coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''))
        ilike '%' || pg_catalog.left(pg_catalog.btrim(p_search), 80) || '%')
  order by coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''))
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$function$;

create or replace function public.civic_send_friend_request(p_recipient_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := (select auth.uid()); v_request_id uuid; v_status text;
begin
  if v_user is null then raise exception 'Sign in to send friend requests.'; end if;
  if p_recipient_id is null or p_recipient_id = v_user then raise exception 'Choose another citizen.'; end if;
  if not exists (select 1 from public.profiles p where p.id = v_user and p.role = 'citizen')
    or not exists (select 1 from public.profiles p where p.id = p_recipient_id and p.role = 'citizen') then
    raise exception 'Only available citizen accounts can connect.';
  end if;
  select f.id, f.status into v_request_id, v_status from public.civic_friend_requests f
  where (f.requester_id = v_user and f.recipient_id = p_recipient_id)
     or (f.requester_id = p_recipient_id and f.recipient_id = v_user) limit 1;
  if v_request_id is not null and v_status in ('pending','accepted') then
    raise exception 'A friend request already exists or you are already friends.';
  end if;
  if v_request_id is not null then
    update public.civic_friend_requests set requester_id=v_user, recipient_id=p_recipient_id,
      status='pending', created_at=pg_catalog.now(), responded_at=null where id=v_request_id;
  else
    insert into public.civic_friend_requests(requester_id,recipient_id) values(v_user,p_recipient_id) returning id into v_request_id;
  end if;
  return v_request_id;
end;
$function$;

create or replace function public.civic_respond_friend_request(p_request_id uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in to respond to friend requests.'; end if;
  update public.civic_friend_requests set status=case when p_accept then 'accepted' else 'declined' end,
    responded_at=pg_catalog.now()
  where id=p_request_id and recipient_id=v_user and status='pending';
  if not found then raise exception 'This friend request is no longer available.'; end if;
  return true;
end;
$function$;

create or replace function public.civic_get_my_friends()
returns table(friend_id uuid, display_name text, since timestamptz)
language sql stable security definer set search_path = ''
as $function$
  select case when f.requester_id=(select auth.uid()) then f.recipient_id else f.requester_id end,
    coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')),
    f.responded_at
  from public.civic_friend_requests f
  join public.profiles p on p.id=case when f.requester_id=(select auth.uid()) then f.recipient_id else f.requester_id end
  join auth.users u on u.id=p.id
  where (f.requester_id=(select auth.uid()) or f.recipient_id=(select auth.uid())) and f.status='accepted'
  order by coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''));
$function$;

create or replace function public.civic_get_friend_requests()
returns table(request_id uuid, other_user_id uuid, display_name text, direction text, created_at timestamptz)
language sql stable security definer set search_path = ''
as $function$
  select f.id, case when f.requester_id=(select auth.uid()) then f.recipient_id else f.requester_id end,
    coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')),
    case when f.recipient_id=(select auth.uid()) then 'incoming' else 'outgoing' end, f.created_at
  from public.civic_friend_requests f
  join public.profiles p on p.id=case when f.requester_id=(select auth.uid()) then f.recipient_id else f.requester_id end
  join auth.users u on u.id=p.id
  where (f.requester_id=(select auth.uid()) or f.recipient_id=(select auth.uid())) and f.status='pending'
  order by f.created_at desc;
$function$;

create or replace function public.civic_create_organisation(
  p_name text, p_organisation_type text, p_focus_area text, p_location text,
  p_description text, p_invited_user_ids uuid[] default array[]::uuid[]
)
returns uuid language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := (select auth.uid()); v_org_id uuid;
begin
  if v_user is null then raise exception 'Sign in to form an organisation.'; end if;
  if not exists (select 1 from public.profiles p where p.id=v_user and p.role='citizen') then raise exception 'Only citizen accounts can form an organisation.'; end if;
  if p_name is null or pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 3 and 80 then raise exception 'Organisation name must be 3–80 characters.'; end if;
  if p_organisation_type not in ('Community group','Student organisation','Volunteer group','Environmental group','Civic advocacy','Other') then raise exception 'Choose a valid organisation type.'; end if;
  if p_focus_area not in ('General civic action','Environment','Waste & sanitation','Roads & infrastructure','Education','Public health','Disaster preparedness','Other') then raise exception 'Choose a valid focus area.'; end if;
  if p_location is null or pg_catalog.char_length(pg_catalog.btrim(p_location)) not between 2 and 120 then raise exception 'Enter a location.'; end if;
  if p_description is null or pg_catalog.char_length(pg_catalog.btrim(p_description)) not between 20 and 1000 then raise exception 'Description must be 20–1000 characters.'; end if;
  if coalesce(pg_catalog.cardinality(p_invited_user_ids),0)>30 then raise exception 'You can invite up to 30 friends at a time.'; end if;
  if exists (
    select 1 from (select distinct unnest(coalesce(p_invited_user_ids,array[]::uuid[])) as invitee_id) requested
    where requested.invitee_id=v_user or not exists (
      select 1 from public.civic_friend_requests f where f.status='accepted'
        and ((f.requester_id=v_user and f.recipient_id=requested.invitee_id)
          or (f.recipient_id=v_user and f.requester_id=requested.invitee_id))
    )
  ) then raise exception 'You can invite accepted friends only. Refresh your friends list and try again.'; end if;
  insert into public.civic_organisations(name,organisation_type,focus_area,location,description,created_by)
  values(pg_catalog.btrim(p_name),p_organisation_type,p_focus_area,pg_catalog.btrim(p_location),pg_catalog.btrim(p_description),v_user)
  returning id into v_org_id;
  insert into public.civic_organisation_members(organisation_id,user_id,role,status,invited_by)
  values(v_org_id,v_user,'founder','active',v_user);
  insert into public.civic_organisation_members(organisation_id,user_id,role,status,invited_by)
  select v_org_id, requested.invitee_id,'member','invited',v_user
  from (select distinct unnest(coalesce(p_invited_user_ids,array[]::uuid[])) as invitee_id) requested;
  return v_org_id;
end;
$function$;

create or replace function public.civic_get_organisations()
returns table(id uuid,name text,organisation_type text,focus_area text,location text,description text,created_at timestamptz,member_count bigint,my_status text)
language sql stable security definer set search_path = ''
as $function$
  select o.id,o.name,o.organisation_type,o.focus_area,o.location,o.description,o.created_at,
    count(m.id) filter (where m.status='active'), mine.status
  from public.civic_organisations o
  left join public.civic_organisation_members m on m.organisation_id=o.id
  left join public.civic_organisation_members mine on mine.organisation_id=o.id and mine.user_id=(select auth.uid())
  where (select auth.uid()) is not null
  group by o.id,mine.status order by o.created_at desc limit 100;
$function$;

create or replace function public.civic_get_organisation_invites()
returns table(membership_id uuid,organisation_id uuid,organisation_name text,organisation_description text,invited_at timestamptz)
language sql stable security definer set search_path = ''
as $function$
  select m.id,o.id,o.name,o.description,m.created_at
  from public.civic_organisation_members m join public.civic_organisations o on o.id=m.organisation_id
  where m.user_id=(select auth.uid()) and m.status='invited' order by m.created_at desc;
$function$;

create or replace function public.civic_respond_organisation_invitation(p_membership_id uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'Sign in to respond to organisation invitations.'; end if;
  update public.civic_organisation_members set status=case when p_accept then 'active' else 'declined' end,
    responded_at=pg_catalog.now()
  where id=p_membership_id and user_id=v_user and status='invited';
  if not found then raise exception 'This organisation invitation is no longer available.'; end if;
  return true;
end;
$function$;

revoke all on function public.civic_search_members(text,integer) from public,anon;
revoke all on function public.civic_send_friend_request(uuid) from public,anon;
revoke all on function public.civic_respond_friend_request(uuid,boolean) from public,anon;
revoke all on function public.civic_get_my_friends() from public,anon;
revoke all on function public.civic_get_friend_requests() from public,anon;
revoke all on function public.civic_create_organisation(text,text,text,text,text,uuid[]) from public,anon;
revoke all on function public.civic_get_organisations() from public,anon;
revoke all on function public.civic_get_organisation_invites() from public,anon;
revoke all on function public.civic_respond_organisation_invitation(uuid,boolean) from public,anon;
grant execute on function public.civic_search_members(text,integer) to authenticated;
grant execute on function public.civic_send_friend_request(uuid) to authenticated;
grant execute on function public.civic_respond_friend_request(uuid,boolean) to authenticated;
grant execute on function public.civic_get_my_friends() to authenticated;
grant execute on function public.civic_get_friend_requests() to authenticated;
grant execute on function public.civic_create_organisation(text,text,text,text,text,uuid[]) to authenticated;
grant execute on function public.civic_get_organisations() to authenticated;
grant execute on function public.civic_get_organisation_invites() to authenticated;
grant execute on function public.civic_respond_organisation_invitation(uuid,boolean) to authenticated;

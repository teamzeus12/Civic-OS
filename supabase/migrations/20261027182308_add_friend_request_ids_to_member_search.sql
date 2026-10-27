drop function if exists public.civic_search_members(text, integer);
create function public.civic_search_members(p_search text default '', p_limit integer default 30)
returns table(user_id uuid, display_name text, relationship_status text, request_id uuid)
language sql stable security definer
set search_path = ''
as $function$
  select p.id,
    coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')) as display_name,
    case
      when f.status = 'accepted' then 'friends'
      when f.status = 'pending' and f.requester_id = (select auth.uid()) then 'request_sent'
      when f.status = 'pending' and f.recipient_id = (select auth.uid()) then 'request_received'
      else 'none'
    end as relationship_status,
    case when f.status = 'pending' then f.id else null end as request_id
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.civic_friend_requests f
    on (f.requester_id = (select auth.uid()) and f.recipient_id = p.id)
    or (f.recipient_id = (select auth.uid()) and f.requester_id = p.id)
  where (select auth.uid()) is not null
    and p.role = 'citizen'
    and p.id <> (select auth.uid())
    and coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')) is not null
    and (
      pg_catalog.btrim(coalesce(p_search, '')) = ''
      or coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')) ilike '%' || pg_catalog.left(pg_catalog.btrim(p_search), 80) || '%'
    )
  order by coalesce(nullif(pg_catalog.btrim(p.full_name), ''), nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), ''))
  limit greatest(1, least(coalesce(p_limit, 30), 50));
$function$;
revoke all on function public.civic_search_members(text, integer) from public, anon;
grant execute on function public.civic_search_members(text, integer) to authenticated;
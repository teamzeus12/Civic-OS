create or replace function public.civic_get_recent_members(p_limit integer default 12)
returns table (
  display_name text,
  activity_label text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    coalesce(
      nullif(pg_catalog.btrim(p.full_name), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')
    ) as display_name,
    'Recently active on Civic OS'::text as activity_label
  from public.profiles as p
  join auth.users as u on u.id = p.id
  where p.role = 'citizen'
    and u.last_sign_in_at >= pg_catalog.now() - interval '30 days'
    and coalesce(
      nullif(pg_catalog.btrim(p.full_name), ''),
      nullif(pg_catalog.btrim(u.raw_user_meta_data ->> 'full_name'), '')
    ) is not null
  order by u.last_sign_in_at desc
  limit greatest(1, least(coalesce(p_limit, 12), 20));
$function$;

revoke all on function public.civic_get_recent_members(integer) from public;
revoke all on function public.civic_get_recent_members(integer) from anon;
grant execute on function public.civic_get_recent_members(integer) to authenticated;

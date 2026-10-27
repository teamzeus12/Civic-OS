-- Keep citizen reports discoverable while preventing exact addresses and GPS coordinates
-- from being exposed by the public feed. Internal duplicate detection still uses the
-- original location stored on reports; only this public RPC response is coarsened.
create or replace function public.get_public_civic_reports()
returns table (
  id uuid,
  public_id text,
  title text,
  category text,
  description text,
  status text,
  public_impact text,
  location jsonb,
  reported_at timestamptz,
  resolved_at timestamptz,
  status_history jsonb
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    r.id,
    r.public_id,
    r.title,
    r.category,
    r.description,
    r.status,
    r.public_impact,
    case
      when jsonb_typeof(r.location -> 'latitude') = 'number'
       and jsonb_typeof(r.location -> 'longitude') = 'number'
      then jsonb_build_object(
        'address', 'Approximate area',
        'latitude', round((r.location ->> 'latitude')::numeric, 2),
        'longitude', round((r.location ->> 'longitude')::numeric, 2),
        'precision', 'approximate'
      )
      else jsonb_build_object(
        'address', 'Exact location withheld for privacy',
        'precision', 'withheld'
      )
    end as location,
    r.reported_at,
    r.resolved_at,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'from_status', h.from_status,
          'to_status', h.to_status,
          'created_at', h.created_at
        )
        order by h.created_at asc
      )
      from public.report_status_history h
      where h.report_id = r.id
    ), '[]'::jsonb) as status_history
  from public.reports r
  order by r.reported_at desc
  limit 1000;
$function$;

revoke all on function public.get_public_civic_reports() from public;
grant execute on function public.get_public_civic_reports() to anon, authenticated;

-- This RPC returns full report text and precise coordinates for trusted server-side
-- duplicate matching. Only the Edge Function's service-role client should call it.
revoke all on function public.find_civic_duplicate_candidates(double precision, double precision, integer, integer)
  from public, anon, authenticated;
grant execute on function public.find_civic_duplicate_candidates(double precision, double precision, integer, integer)
  to service_role;

-- The verified-only public map RPC also returned the stored exact location.
-- Preserve its existing result schema for compatibility, but coarsen coordinates
-- in the public response just as we do for the citizen feed.
create or replace function public.get_public_issue_map()
returns table (
  id uuid,
  public_id text,
  title text,
  category text,
  status text,
  priority text,
  public_impact text,
  location jsonb,
  reported_at timestamptz,
  resolved_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    r.id,
    r.public_id,
    r.title,
    r.category,
    r.status,
    r.priority,
    r.public_impact,
    case
      when jsonb_typeof(r.location -> 'latitude') = 'number'
       and jsonb_typeof(r.location -> 'longitude') = 'number'
      then jsonb_build_object(
        'address', 'Approximate area',
        'latitude', round((r.location ->> 'latitude')::numeric, 2),
        'longitude', round((r.location ->> 'longitude')::numeric, 2),
        'precision', 'approximate'
      )
      else jsonb_build_object(
        'address', 'Exact location withheld for privacy',
        'precision', 'withheld'
      )
    end as location,
    r.reported_at,
    r.resolved_at
  from public.reports as r
  where r.verification_required = false
  order by r.reported_at desc
  limit 200;
$function$;

revoke all on function public.get_public_issue_map() from public;
grant execute on function public.get_public_issue_map() to anon, authenticated;

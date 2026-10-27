create or replace function public.find_civic_duplicate_candidates(
  p_latitude double precision,
  p_longitude double precision,
  p_radius_meters integer default 1500,
  p_limit integer default 8
)
returns table (
  id uuid,
  public_id text,
  title text,
  category text,
  description text,
  status text,
  location jsonb,
  reported_at timestamptz,
  distance_meters integer
)
language sql
stable
security definer
set search_path = ''
as $function$
  with valid_rows as (
    select r.id, r.public_id, r.title, r.category, r.description, r.status,
      r.location, r.reported_at,
      (r.location->>'latitude')::double precision as lat,
      (r.location->>'longitude')::double precision as lon
    from public.reports r
    where jsonb_typeof(r.location) = 'object'
      and coalesce(r.location->>'latitude','') ~ '^-?[0-9]+(\.[0-9]+)?$'
      and coalesce(r.location->>'longitude','') ~ '^-?[0-9]+(\.[0-9]+)?$'
  ),
  distances as (
    select v.*,
      (power(sin(radians(v.lat - p_latitude) / 2), 2)
        + cos(radians(p_latitude)) * cos(radians(v.lat))
        * power(sin(radians(v.lon - p_longitude) / 2), 2)) as haversine_a
    from valid_rows v
    where p_latitude between -90 and 90 and p_longitude between -180 and 180
  ),
  measured as (
    select d.*,
      (6371000 * 2 * asin(sqrt(least(1.0, greatest(0.0, d.haversine_a)))))::integer as distance_meters
    from distances d
  )
  select m.id, m.public_id, m.title, m.category, m.description, m.status, m.location, m.reported_at, m.distance_meters
  from measured m
  where m.distance_meters <= greatest(50, least(coalesce(p_radius_meters, 1500), 5000))
  order by m.distance_meters asc, m.reported_at desc
  limit greatest(1, least(coalesce(p_limit, 8), 12));
$function$;

revoke all on function public.find_civic_duplicate_candidates(double precision, double precision, integer, integer) from public;
grant execute on function public.find_civic_duplicate_candidates(double precision, double precision, integer, integer) to anon, authenticated;

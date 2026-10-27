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
    r.location,
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

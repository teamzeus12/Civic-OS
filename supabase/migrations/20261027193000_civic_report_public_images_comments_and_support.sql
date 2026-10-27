-- Civic OS: public report evidence and persistent citizen community activity.
-- The storage bucket remains private; public access is mediated by RLS and short-lived signed URLs.

CREATE TABLE IF NOT EXISTS public.report_supports (
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, user_id)
);

CREATE INDEX IF NOT EXISTS report_supports_report_id_idx
  ON public.report_supports (report_id);

CREATE TABLE IF NOT EXISTS public.report_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS report_comments_report_created_idx
  ON public.report_comments (report_id, created_at ASC);

ALTER TABLE public.report_supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_supports FROM anon, authenticated;
REVOKE ALL ON public.report_comments FROM anon, authenticated;

-- Images attached to reports in the public civic feed are public evidence.
-- Keep the bucket private and issue signed URLs; do not expose storage paths or reporter identity.
DROP POLICY IF EXISTS report_evidence_public_image_read ON public.report_evidence;
CREATE POLICY report_evidence_public_image_read
  ON public.report_evidence
  FOR SELECT
  TO anon, authenticated
  USING (
    media_type = 'image'
    AND EXISTS (SELECT 1 FROM public.reports r WHERE r.id = report_evidence.report_id)
  );

DROP POLICY IF EXISTS civic_evidence_read_public_report_images ON storage.objects;
CREATE POLICY civic_evidence_read_public_report_images
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (
    bucket_id = 'civic-report-evidence'
    AND EXISTS (
      SELECT 1
      FROM public.report_evidence e
      JOIN public.reports r ON r.id = e.report_id
      WHERE e.storage_path = storage.objects.name
        AND e.media_type = 'image'
    )
  );

CREATE OR REPLACE FUNCTION public.civic_get_report_activity(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.id = p_report_id) THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  SELECT jsonb_build_object(
    'support_count', (SELECT count(*) FROM public.report_supports s WHERE s.report_id = p_report_id),
    'supported_by_me', CASE WHEN v_user_id IS NULL THEN false ELSE EXISTS (
      SELECT 1 FROM public.report_supports s
      WHERE s.report_id = p_report_id AND s.user_id = v_user_id
    ) END,
    'comments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'body', c.body,
        'created_at', c.created_at,
        'author_label', 'Citizen'
      ) ORDER BY c.created_at ASC)
      FROM public.report_comments c
      WHERE c.report_id = p_report_id
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.civic_toggle_report_support(p_report_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_supported boolean;
  v_count bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to mark that you are affected';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.id = p_report_id) THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  DELETE FROM public.report_supports
  WHERE report_id = p_report_id AND user_id = v_user_id;

  IF FOUND THEN
    v_supported := false;
  ELSE
    INSERT INTO public.report_supports (report_id, user_id)
    VALUES (p_report_id, v_user_id)
    ON CONFLICT DO NOTHING;
    v_supported := true;
  END IF;

  SELECT count(*) INTO v_count
  FROM public.report_supports WHERE report_id = p_report_id;

  RETURN jsonb_build_object('support_count', v_count, 'supported_by_me', v_supported);
END;
$function$;

CREATE OR REPLACE FUNCTION public.civic_add_report_comment(p_report_id uuid, p_body text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_body text := btrim(COALESCE(p_body, ''));
  v_comment public.report_comments%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Sign in to comment on a report';
  END IF;
  IF char_length(v_body) < 1 OR char_length(v_body) > 1000 THEN
    RAISE EXCEPTION 'Comments must be between 1 and 1000 characters';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reports r WHERE r.id = p_report_id) THEN
    RAISE EXCEPTION 'Report not found';
  END IF;

  INSERT INTO public.report_comments (report_id, user_id, body)
  VALUES (p_report_id, v_user_id, v_body)
  RETURNING * INTO v_comment;

  RETURN jsonb_build_object(
    'id', v_comment.id,
    'body', v_comment.body,
    'created_at', v_comment.created_at,
    'author_label', 'Citizen'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.civic_get_report_activity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_toggle_report_support(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.civic_add_report_comment(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.civic_get_report_activity(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.civic_toggle_report_support(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.civic_add_report_comment(uuid, text) TO authenticated;

DROP POLICY IF EXISTS civic_evidence_read_public_report_images ON storage.objects;
CREATE POLICY civic_evidence_read_public_report_images ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'civic-report-evidence' AND EXISTS (SELECT 1 FROM public.report_evidence e WHERE e.storage_path = storage.objects.name AND e.media_type = 'image'));
DROP POLICY IF EXISTS report_evidence_public_image_read ON public.report_evidence;
CREATE POLICY report_evidence_public_image_read ON public.report_evidence FOR SELECT TO authenticated USING (media_type = 'image');
GRANT SELECT ON public.report_evidence TO authenticated;

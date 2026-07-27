CREATE POLICY "activity_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'activity-documents');
CREATE POLICY "activity_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'activity-documents' AND owner = auth.uid());
CREATE POLICY "activity_docs_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'activity-documents' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
CREATE POLICY "activity_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'activity-documents' AND (owner = auth.uid() OR public.is_admin(auth.uid())));
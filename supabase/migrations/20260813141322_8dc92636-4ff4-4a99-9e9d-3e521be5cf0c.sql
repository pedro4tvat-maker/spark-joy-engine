DROP POLICY IF EXISTS activity_docs_select ON storage.objects;
CREATE POLICY activity_docs_select ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'activity-documents'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.activity_documents d
      WHERE d.storage_path = storage.objects.name
        AND public.can_see_activity(d.activity_id, auth.uid())
    )
  )
);

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
CREATE POLICY "Creators upload own appeal proof"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'appeal-proof' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Creators read own appeal proof"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'appeal-proof' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));

CREATE POLICY "Creators delete own appeal proof"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'appeal-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
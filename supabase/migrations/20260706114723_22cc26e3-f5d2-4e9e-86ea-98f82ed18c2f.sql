
-- Storage RLS: leitura pública dos 5 buckets; escrita apenas admin
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT
  USING (bucket_id IN ('products','banners','categories','brands','avatars'));

DROP POLICY IF EXISTS "storage_admin_insert" ON storage.objects;
CREATE POLICY "storage_admin_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('products','banners','categories','brands','avatars')
             AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "storage_admin_update" ON storage.objects;
CREATE POLICY "storage_admin_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('products','banners','categories','brands','avatars')
         AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "storage_admin_delete" ON storage.objects;
CREATE POLICY "storage_admin_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('products','banners','categories','brands','avatars')
         AND public.has_role(auth.uid(), 'admin'));

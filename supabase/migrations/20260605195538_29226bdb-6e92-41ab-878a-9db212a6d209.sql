-- Grant access to storage objects for the new buckets
-- Banners
CREATE POLICY "Public Access Banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Auth Upload Banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Banners" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'banners' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete Banners" ON storage.objects FOR DELETE USING (bucket_id = 'banners' AND auth.role() = 'authenticated');

-- Categories
CREATE POLICY "Public Access Categories" ON storage.objects FOR SELECT USING (bucket_id = 'categories');
CREATE POLICY "Auth Upload Categories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'categories' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Categories" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'categories' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete Categories" ON storage.objects FOR DELETE USING (bucket_id = 'categories' AND auth.role() = 'authenticated');

-- Avatars
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Auth Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update Avatars" ON storage.objects FOR UPDATE WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete Avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');
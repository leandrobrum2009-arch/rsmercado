-- Policies for public access to the existing bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'flyer-backgrounds');
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Delete" ON storage.objects FOR DELETE USING (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated');

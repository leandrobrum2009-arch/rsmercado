-- Allow authenticated users to upload custom flyer backgrounds.
-- The frontend also falls back to existing public buckets until this migration
-- is applied to the live Supabase project.

INSERT INTO storage.buckets (id, name, public)
VALUES ('flyer-backgrounds', 'flyer-backgrounds', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public Access Flyer Backgrounds" ON storage.objects;
CREATE POLICY "Public Access Flyer Backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'flyer-backgrounds');

DROP POLICY IF EXISTS "Auth Upload Flyer Backgrounds" ON storage.objects;
CREATE POLICY "Auth Upload Flyer Backgrounds"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Update Flyer Backgrounds" ON storage.objects;
CREATE POLICY "Auth Update Flyer Backgrounds"
ON storage.objects FOR UPDATE
USING (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated')
WITH CHECK (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Auth Delete Flyer Backgrounds" ON storage.objects;
CREATE POLICY "Auth Delete Flyer Backgrounds"
ON storage.objects FOR DELETE
USING (bucket_id = 'flyer-backgrounds' AND auth.role() = 'authenticated');

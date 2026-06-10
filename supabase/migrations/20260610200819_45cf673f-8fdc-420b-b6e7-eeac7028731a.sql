-- Re-apply policies to ensure public read access to objects
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects 
FOR SELECT 
USING (bucket_id IN ('flyer-backgrounds', 'products', 'banners'));

-- Ensure authenticated users can upload
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
CREATE POLICY "Authenticated Upload" ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id IN ('flyer-backgrounds', 'products', 'banners'));

-- Ensure authenticated users can update/delete
DROP POLICY IF EXISTS "Authenticated Management" ON storage.objects;
CREATE POLICY "Authenticated Management" ON storage.objects 
FOR ALL 
TO authenticated 
USING (bucket_id IN ('flyer-backgrounds', 'products', 'banners'));

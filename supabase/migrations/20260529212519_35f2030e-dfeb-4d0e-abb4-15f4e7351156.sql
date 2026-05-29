-- Create storage bucket for products if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Set up storage policies for 'products' bucket
-- 1. Public can view images
CREATE POLICY "Public can view product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- 2. Admins can upload images
CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
);

-- 3. Admins can update/delete images
CREATE POLICY "Admins can manage product images"
ON storage.objects FOR ALL
USING (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id = 'products' 
  AND public.has_role(auth.uid(), 'admin')
);

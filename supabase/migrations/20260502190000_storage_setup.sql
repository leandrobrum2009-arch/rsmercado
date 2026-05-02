-- Create storage bucket for products
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for storage.objects
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Admin Insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products');
CREATE POLICY "Admin Update" ON storage.objects FOR UPDATE USING (bucket_id = 'products');
CREATE POLICY "Admin Delete" ON storage.objects FOR DELETE USING (bucket_id = 'products');

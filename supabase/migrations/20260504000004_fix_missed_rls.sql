-- FIX MISSED RLS POLICIES
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Users can view their own order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage all order items" ON public.order_items FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
ALTER TABLE IF EXISTS public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view valid coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Public can view valid coupons" ON public.coupons FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());
CREATE POLICY "Admins can manage all coupons" ON public.coupons FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- STORAGE REFINEMENT
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Ensure store-settings logo upload path is protected but readable
DO $$
BEGIN
    DROP POLICY IF EXISTS "Store Logos are Public" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can upload store logos" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can update store logos" ON storage.objects;
    
    CREATE POLICY "Store Logos are Public" ON storage.objects FOR SELECT USING (bucket_id = 'products' AND name LIKE 'store/%');
    CREATE POLICY "Admins can upload store logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'products' AND name LIKE 'store/%' AND public.is_admin());
    CREATE POLICY "Admins can update store logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'products' AND name LIKE 'store/%' AND public.is_admin());
END $$;

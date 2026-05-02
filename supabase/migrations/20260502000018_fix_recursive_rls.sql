-- SECURE RLS AND FUNCTIONS
-- This migration fixes recursive policies and secures vulnerable RPCs.

-- 1. Fix recursive policies using is_admin() helper
DROP POLICY IF EXISTS "Admins can manage flyers" ON flyers;
CREATE POLICY "Admins can manage flyers" ON flyers FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
CREATE POLICY "Admins can manage banners" ON banners FOR ALL USING (public.is_admin());

-- 2. Secure report_media_error against table injection
CREATE OR REPLACE FUNCTION report_media_error(target_table TEXT, item_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Whitelist allowed tables to prevent arbitrary table updates
    IF target_table NOT IN ('products', 'categories', 'news') THEN
        RAISE EXCEPTION 'Tabela inválida para relatório de mídia.';
    END IF;
    
    EXECUTE format('UPDATE %I SET has_media_error = TRUE WHERE id = %L', target_table, item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure profiles RLS is not recursive (already fixed in 08, but making sure)
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin());

-- 4. Tighten coupon visibility (don't show expired or first-purchase only if not applicable)
DROP POLICY IF EXISTS "Public can view valid coupons" ON coupons;
CREATE POLICY "Public can view valid coupons" ON coupons FOR SELECT USING (
    (expires_at IS NULL OR expires_at > NOW())
    -- We could add more logic here if needed
);

-- Fix store_settings exposure
DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON store_settings;
CREATE POLICY "Admins can view all store settings" ON store_settings FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Fix coupons exposure (optional but safer)
-- Only allow public to view non-expired coupons if needed, or keep it admin only for management
DROP POLICY IF EXISTS "Public coupons are viewable by everyone" ON coupons;
CREATE POLICY "Public can view valid coupons" ON coupons FOR SELECT USING (
    expires_at IS NULL OR expires_at > NOW()
);
CREATE POLICY "Admins can manage all coupons" ON coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Ensure order management is only for admins (beyond owner access)
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

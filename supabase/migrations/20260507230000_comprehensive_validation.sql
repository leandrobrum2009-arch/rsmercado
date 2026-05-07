-- 🏆 COMPREHENSIVE SYSTEM VALIDATION & SECURITY HARDENING
-- This migration consolidates all fixes and ensures schema consistency.

-- 1. ROBUST ADMIN CHECK
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth 
AS $$
DECLARE
  user_email TEXT;
BEGIN
  user_email := auth.jwt() ->> 'email';
  -- Master Admin
  IF (user_email = 'leandrobrum2009@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- Check roles table
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END; $$;

-- 2. SCHEMA INTEGRITY
-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT,
    customer_phone TEXT,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    delivery_address JSONB,
    points_earned INTEGER DEFAULT 0,
    coupon_code TEXT,
    change_for DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist (in case table was created differently)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Products
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Store Alerts (Ensuring shimmer speed and duration)
ALTER TABLE public.store_alerts ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 10;
ALTER TABLE public.store_alerts ADD COLUMN IF NOT EXISTS shimmer_speed_seconds DECIMAL(4,1) DEFAULT 2.0;

-- 3. SECURITY HARDENING (RLS)
DO $$ 
DECLARE 
  t TEXT;
BEGIN
  FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- Re-apply core policies to ensure they are the most secure versions
-- Orders
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = user_id 
  OR customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', ''))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin());

-- Store Settings (Protecting sensitive keys)
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
CREATE POLICY "Public read settings" ON public.store_settings 
FOR SELECT USING (key NOT IN ('whatsapp_config', 'api_keys', 'secret_config', 'admin_setup_secret', 'webhook_secrets'));

-- 4. ENSURE PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 5. REFRESH CACHE
COMMENT ON TABLE public.orders IS 'Consolidated Orders Table v2';
COMMENT ON TABLE public.products IS 'Consolidated Products Table v2';

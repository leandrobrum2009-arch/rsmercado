-- 🛠️ FINAL REVALIDATION & CONSOLIDATION MIGRATION

-- 1. SECURITY DEFINER FUNCTIONS (Bypassing RLS safely)
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth 
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- 1. Master bypass (JWT check is extremely fast)
  user_email := auth.jwt() ->> 'email';
  IF (user_email = 'leandrobrum2009@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- 2. Check user_roles table
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END; $$;

-- 2. ENSURE ALL TABLES EXIST WITH CORRECT COLUMNS
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Site Visits
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    path TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- App Feedback
CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    rating INTEGER,
    comment TEXT,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Alerts
CREATE TABLE IF NOT EXISTS public.store_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    target_url TEXT,
    duration_seconds INTEGER DEFAULT 10,
    shimmer_speed_seconds DECIMAL(4,1) DEFAULT 2.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store Settings (Ensure value is JSONB if possible, or consistent with code)
-- The code seems to expect store_settings to have key and value.
CREATE TABLE IF NOT EXISTS public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ENABLE RLS ON ALL TABLES
DO $$ 
DECLARE 
  t TEXT;
BEGIN
  FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- 4. CONSOLIDATED AND SECURE POLICIES

-- user_roles (FIX RECURSION)
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Admins manage roles" ON public.user_roles 
FOR ALL USING ( (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR public.is_admin() );

DROP POLICY IF EXISTS "Users view own role" ON public.user_roles;
CREATE POLICY "Users view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- orders
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = user_id 
  OR customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', ''))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin());

-- order_items
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
CREATE POLICY "Users view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE public.orders.id = order_id 
    AND (
      public.orders.user_id = auth.uid() 
      OR public.orders.customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', ''))
      OR public.is_admin()
    )
  )
);

-- site_visits
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can insert visits" ON public.site_visits FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins view all visits" ON public.site_visits;
CREATE POLICY "Admins view all visits" ON public.site_visits FOR SELECT USING (public.is_admin());

-- store_settings
DROP POLICY IF EXISTS "Public read settings" ON public.store_settings;
CREATE POLICY "Public read settings" ON public.store_settings 
FOR SELECT USING (key NOT IN ('whatsapp_config', 'api_keys', 'secret_config', 'admin_setup_secret', 'webhook_secrets'));

DROP POLICY IF EXISTS "Admin manage settings" ON public.store_settings;
CREATE POLICY "Admin manage settings" ON public.store_settings FOR ALL USING (public.is_admin());

-- store_alerts
DROP POLICY IF EXISTS "Public view alerts" ON public.store_alerts;
CREATE POLICY "Public view alerts" ON public.store_alerts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage alerts" ON public.store_alerts;
CREATE POLICY "Admin manage alerts" ON public.store_alerts FOR ALL USING (public.is_admin());

-- 5. ENSURE PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 6. ENSURE MASTER ADMIN
INSERT INTO public.user_roles (user_id, role) 
SELECT id, 'admin' FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

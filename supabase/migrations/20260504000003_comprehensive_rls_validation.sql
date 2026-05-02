-- COMPREHENSIVE RLS VALIDATION AND HARDENING
-- This migration ensures ALL tables have RLS enabled and use secure, non-recursive policies.

-- 1. Ensure the is_admin() function is the definitive version
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
  user_uid UUID;
BEGIN
  -- Get context
  user_uid := auth.uid();
  user_email := auth.jwt() ->> 'email';
  
  -- Master bypass (Hardcoded email for system recovery)
  IF user_email = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- If no UID, cannot be admin via table check
  IF user_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check user_roles table (Security Definer bypasses RLS here to avoid recursion)
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uid 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Fallback check on profiles table
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uid 
    AND is_admin = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. List of all tables to process
DO $$
DECLARE
    t TEXT;
    tables_to_harden TEXT[] := ARRAY[
        'categories', 'products', 'profiles', 'coupons', 'orders', 
        'order_items', 'comments', 'news', 'store_settings', 
        'banners', 'flyers', 'user_roles', 'recipes', 
        'user_recipes', 'import_logs', 'user_addresses', 'webhooks'
    ];
BEGIN
    FOREACH t IN ARRAY tables_to_harden LOOP
        -- Enable RLS
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);
    END LOOP;
END $$;

-- 3. SPECIFIC POLICIES PER TABLE

-- USER_ROLES (Crucial for auth)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own role" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- STORE_SETTINGS (Protect sensitive keys)
DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage store_settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can manage all store settings" ON public.store_settings;

CREATE POLICY "Public store settings are viewable by everyone" 
ON public.store_settings FOR SELECT 
USING (key NOT IN ('whatsapp_config', 'api_keys', 'secret_config', 'master_key', 'admin_key'));

CREATE POLICY "Admins can manage store_settings" 
ON public.store_settings FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- WEBHOOKS (Very sensitive)
DROP POLICY IF EXISTS "Only admins can manage webhooks" ON public.webhooks;
CREATE POLICY "Admins can manage webhooks" 
ON public.webhooks FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- PROFILES (Privacy and privilege protection)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- ORDERS & ADDRESSES
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.user_addresses;

CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (public.is_admin());
CREATE POLICY "Users can manage their own addresses" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);

-- PUBLIC CONTENT (Read for all, Write for admin)
-- Flyers, Banners, Products, Categories, News, Recipes
DO $$
DECLARE
    t TEXT;
    public_tables TEXT[] := ARRAY['categories', 'products', 'news', 'recipes', 'banners', 'flyers'];
BEGIN
    FOREACH t IN ARRAY public_tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public %I are viewable by everyone" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage %I" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access %I" ON public.%I', t, t);
        
        -- Special case for coupons (only valid ones)
        IF t = 'coupons' THEN
            CREATE POLICY "Public can view valid coupons" ON public.coupons FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());
        ELSE
            EXECUTE format('CREATE POLICY "Public %I are viewable by everyone" ON public.%I FOR SELECT USING (true)', t, t);
        END IF;

        EXECUTE format('CREATE POLICY "Admins can manage %I" ON public.%I FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())', t, t);
    END LOOP;
END $$;

-- COMMENTS (Auth users can read/write own)
DROP POLICY IF EXISTS "Public comments are viewable by everyone" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;

CREATE POLICY "Public comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert comments" ON public.comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can manage their own comments" ON public.comments FOR ALL USING (auth.uid() = user_id);

-- USER RECIPES
DROP POLICY IF EXISTS "Users can manage their own saved recipes" ON public.user_recipes;
CREATE POLICY "Users can manage their own saved recipes" ON public.user_recipes FOR ALL USING (auth.uid() = user_id);

-- IMPORT LOGS
DROP POLICY IF EXISTS "Admins can view all import logs" ON public.import_logs;
DROP POLICY IF EXISTS "Admins can insert import logs" ON public.import_logs;

CREATE POLICY "Admins can manage import logs" ON public.import_logs FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Final Verification: Ensure master email has role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';


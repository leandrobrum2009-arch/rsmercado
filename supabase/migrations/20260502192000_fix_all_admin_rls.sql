-- UNIFIED ADMIN RLS FIX

-- 1. Ensure the is_admin() function is robust
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
BEGIN
  -- Check if user is the master owner by email first
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- Then check user_roles table
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
\$\$;

-- 2. Apply to categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can do everything on categories" ON public.categories;
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;

CREATE POLICY "Public categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 3. Apply to products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can do everything on products" ON public.products;
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;

CREATE POLICY "Public products are viewable by everyone" 
ON public.products FOR SELECT USING (true);

CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 4. Apply to store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can view all store settings" ON public.store_settings;
DROP POLICY IF EXISTS "Admins can do everything on store_settings" ON public.store_settings;

CREATE POLICY "Public store settings are viewable by everyone" 
ON public.store_settings FOR SELECT USING (true);

CREATE POLICY "Admins can manage store_settings" 
ON public.store_settings FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 5. Apply to news
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public news are viewable by everyone" ON public.news;
DROP POLICY IF EXISTS "Admins can do everything on news" ON public.news;

CREATE POLICY "Public news are viewable by everyone" 
ON public.news FOR SELECT USING (true);

CREATE POLICY "Admins can manage news" 
ON public.news FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 6. Apply to coupons
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public coupons are viewable by everyone" ON public.coupons;
DROP POLICY IF EXISTS "Public can view valid coupons" ON public.coupons;
DROP POLICY IF EXISTS "Admins can manage all coupons" ON public.coupons;

CREATE POLICY "Public can view valid coupons" 
ON public.coupons FOR SELECT USING (expires_at IS NULL OR expires_at > NOW());

CREATE POLICY "Admins can manage coupons" 
ON public.coupons FOR ALL 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 7. Fix user_roles (Non-recursive with email bypass)
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles 
FOR ALL USING (
  (SELECT email FROM auth.users WHERE id = auth.uid()) = 'leandrobrum2009@gmail.com'
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ULTIMATE ADMIN ACCESS FIX

-- 1. Bulletproof is_admin function
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
  
  -- Master bypass (Hardcoded email)
  IF user_email = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- If no UID, can't be admin via tables
  IF user_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uid 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check profiles table
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

-- 2. Re-apply permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;

-- 3. Clean up and re-apply policies for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Master bypass categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can do everything on categories" ON public.categories;
DROP POLICY IF EXISTS "Public categories are viewable by everyone" ON public.categories;
DROP POLICY IF EXISTS "Admin Full Access Categories" ON public.categories;

CREATE POLICY "Public categories are viewable by everyone" 
ON public.categories FOR SELECT USING (true);

CREATE POLICY "Admin Full Access Categories" 
ON public.categories FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 4. Clean up and re-apply policies for products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Master bypass products" ON public.products;
DROP POLICY IF EXISTS "Admins can do everything on products" ON public.products;
DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Admin Full Access Products" ON public.products;

CREATE POLICY "Public products are viewable by everyone" 
ON public.products FOR SELECT USING (true);

CREATE POLICY "Admin Full Access Products" 
ON public.products FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 5. Ensure the master user has all flags set correctly
DO $$
BEGIN
  -- Ensure role in user_roles
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' 
  FROM auth.users 
  WHERE email = 'leandrobrum2009@gmail.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- Ensure flag in profiles
  UPDATE public.profiles 
  SET is_admin = true 
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
  );
END $$;

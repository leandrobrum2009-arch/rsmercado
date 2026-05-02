-- SUPER ADMIN BYPASS AND RLS FIX

-- 1. Update is_admin to be extremely robust
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from JWT
  user_email := auth.jwt() ->> 'email';
  
  -- Master bypass
  IF user_email = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- Check profiles table (SECURITY DEFINER bypasses RLS on profiles)
  IF EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_admin = true
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 2. Re-apply policies to categories with a specific bypass for the master email
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
DROP POLICY IF EXISTS "Master bypass categories" ON public.categories;

CREATE POLICY "Master bypass categories" 
ON public.categories FOR ALL 
TO authenticated
USING ( (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' )
WITH CHECK ( (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );

CREATE POLICY "Admins can manage categories" 
ON public.categories FOR ALL 
TO authenticated
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- 3. Re-apply policies to products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Master bypass products" ON public.products;

CREATE POLICY "Master bypass products" 
ON public.products FOR ALL 
TO authenticated
USING ( (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' )
WITH CHECK ( (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );

CREATE POLICY "Admins can manage products" 
ON public.products FOR ALL 
TO authenticated
USING ( public.is_admin() )
WITH CHECK ( public.is_admin() );

-- 4. Ensure the user is actually an admin in the database
DO $$
BEGIN
  UPDATE public.profiles 
  SET is_admin = true 
  WHERE id IN (SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com');
  
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin' FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
END $$;

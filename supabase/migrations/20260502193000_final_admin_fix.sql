-- FINAL ADMIN BYPASS FIX

CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
BEGIN
  -- 1. Check if user is the master owner by email in JWT (highest priority)
  IF (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- 2. Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check profiles table as fallback
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
\$\$;

-- Ensure the function is executable by all authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Update has_role to be more robust and use JWT claims
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
DECLARE
  v_email TEXT;
BEGIN
  -- Get email from JWT claims if available
  v_email := auth.jwt() ->> 'email';

  -- 1. Master bypass by email (case-insensitive)
  IF v_email IS NOT NULL AND LOWER(v_email) = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- 2. Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check profiles table if role is admin
  IF _role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND is_admin = true
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update is_admin to be a simple wrapper
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

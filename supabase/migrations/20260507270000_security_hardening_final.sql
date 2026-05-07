-- Security Hardening Migration
-- 1. Harden is_admin function to prevent search_path attacks
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  is_admin_result BOOLEAN;
BEGIN
  -- Check if there is a session
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check master email first
  IF (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  -- Check user_roles table
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO is_admin_result;
  
  IF is_admin_result THEN
    RETURN TRUE;
  END IF;

  -- Check profiles table (legacy)
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ) INTO is_admin_result;

  RETURN is_admin_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

-- 2. Ensure Storage Policies are robust
-- Storage buckets are usually managed by the storage schema
-- We ensure the public access is only for SELECT and Admin has full access
DROP POLICY IF EXISTS "Public access to storage" ON storage.objects;
CREATE POLICY "Public access to storage" ON storage.objects FOR SELECT USING (bucket_id IN ('products', 'avatars', 'banners'));

DROP POLICY IF EXISTS "Admin full access to storage" ON storage.objects;
CREATE POLICY "Admin full access to storage" ON storage.objects FOR ALL TO authenticated USING (
    bucket_id IN ('products', 'avatars', 'banners') AND public.is_admin()
) WITH CHECK (
    bucket_id IN ('products', 'avatars', 'banners') AND public.is_admin()
);

-- 3. Audit RLS on flyers
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Flyers are viewable by everyone" ON public.flyers;
CREATE POLICY "Flyers are viewable by everyone" ON public.flyers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage flyers" ON public.flyers;
CREATE POLICY "Admins can manage flyers" ON public.flyers FOR ALL TO authenticated 
USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Secure any remaining sensitive tables
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
CREATE POLICY "Users can view their own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.is_admin());


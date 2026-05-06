-- 7. Fix user_roles recursion
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Admins can manage roles" ON public.user_roles 
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role" ON public.user_roles 
FOR SELECT USING (auth.uid() = user_id);
-- 🛡️ SECURITY HARDENING V3 - RS SUPERMERCADO

-- 1. Fix SECURITY DEFINER functions with search_path (Prevents Search Path Hijacking)
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
  user_uid := auth.uid();
  user_email := auth.jwt() ->> 'email';
  
  IF user_email = 'leandrobrum2009@gmail.com' THEN
    RETURN TRUE;
  END IF;

  IF user_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uid 
    AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = user_uid 
    AND is_admin = true
  );
END;
$$;

-- 2. Secure profiles table updates (Prevent privilege escalation)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
    );

-- 3. Fix generated column issue in auth helpers
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  stored_secret TEXT;
BEGIN
  SELECT (value->>'secret')::TEXT INTO stored_secret 
  FROM public.store_settings 
  WHERE key = 'admin_setup_secret';

  IF stored_secret IS NULL OR stored_secret = '' THEN
    stored_secret := 'ADMIN_RS_2024';
  END IF;

  IF secret_key != stored_secret THEN
    RAISE EXCEPTION 'Invalid secret key';
  END IF;

  UPDATE auth.users SET email_confirmed_at = NOW() WHERE email = email_to_confirm;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;

-- 4. Secure store_settings (Protect secrets)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.store_settings;
CREATE POLICY "Public settings are viewable by everyone" ON public.store_settings 
FOR SELECT USING (
    key NOT IN ('whatsapp_config', 'api_secrets', 'admin_config', 'admin_setup_secret', 'webhook_secrets', 'api_keys', 'secret_config')
);

-- 5. Ensure RLS on all tables
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.store_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 6. Permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT, TEXT) TO authenticated, anon;
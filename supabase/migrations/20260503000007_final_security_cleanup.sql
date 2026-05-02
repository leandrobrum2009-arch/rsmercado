-- FINAL SECURITY CLEANUP AND HARDENING

-- 1. Consolidated and Secure is_admin function
-- Removes multiple definitions and ensures search_path is set for security
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
  
  -- Master bypass (Only this email can always access everything for recovery)
  IF user_email = 'leandrobrum2009@gmail.com' THEN
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

-- 2. Secure promote_to_admin: Remove hardcoded secrets
-- Now only allows the master owner to promote others or themselves
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    curr_user_id UUID;
    user_email TEXT;
BEGIN
    curr_user_id := auth.uid();
    user_email := auth.jwt() ->> 'email';

    -- Only allow if session exists
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada.');
    END IF;

    -- ONLY allow the master owner or an existing admin to use this
    -- We remove the hardcoded 'ADMIN_RS_2024' key as it's a security risk
    IF (user_email != 'leandrobrum2009@gmail.com') AND NOT public.is_admin() THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acesso negado. Apenas o proprietário do sistema pode conceder privilégios.');
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    UPDATE public.profiles SET is_admin = true WHERE id = curr_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN CONCEDIDO COM SUCESSO!');
END;
$$;

-- 3. Secure confirm_user_email: Remove hardcoded secrets
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT DEFAULT NULL)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Only allow the master owner or an existing admin
  IF (auth.jwt() ->> 'email' != 'leandrobrum2009@gmail.com') AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: Apenas o proprietário pode confirmar e-mails manualmente.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      last_sign_in_at = NOW()
  WHERE email = lower(trim(email_to_confirm));

  RETURN TRUE;
END;
$$;

-- 4. Secure store_settings: Ensure sensitive keys are NEVER exposed
DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;
CREATE POLICY "Public store settings are viewable by everyone" 
ON public.store_settings 
FOR SELECT 
USING (
  key NOT IN ('whatsapp_config', 'api_keys', 'secret_config', 'master_key', 'admin_key')
);

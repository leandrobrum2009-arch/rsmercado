-- SECURITY HARDENING FIXES

-- 1. Secure store_settings: Prevent public access to sensitive keys like whatsapp_config
DROP POLICY IF EXISTS "Public store settings are viewable by everyone" ON public.store_settings;

CREATE POLICY "Public store settings are viewable by everyone" 
ON public.store_settings 
FOR SELECT 
USING (
  key NOT IN ('whatsapp_config', 'api_keys', 'secret_config')
);

CREATE POLICY "Admins can manage all store settings" 
ON public.store_settings 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. Add missing admin policies for recipes
DROP POLICY IF EXISTS "Admins can manage recipes" ON public.recipes;
CREATE POLICY "Admins can manage recipes" 
ON public.recipes 
FOR ALL 
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 3. Secure promote_to_admin: Only allow for the master email OR if the user is already an admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
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

    -- Only allow the master email or a valid secret key + correct user
    IF (secret_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024')) AND (user_email != 'leandrobrum2009@gmail.com') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acesso negado.');
    END IF;

    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada.');
    END IF;

    -- Additional check: only promote the user with the master email OR if caller is already admin
    IF user_email != 'leandrobrum2009@gmail.com' AND NOT public.is_admin() THEN
         RETURN jsonb_build_object('success', false, 'message', 'Apenas o proprietário pode conceder acesso admin.');
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    UPDATE public.profiles SET is_admin = true WHERE id = curr_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN LIBERADO!');
END;
$$;

-- 4. Secure confirm_user_email: Only allow for specific emails or if caller is admin
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Validate secret key
  IF secret_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024') THEN
      RAISE EXCEPTION 'Chave secreta inválida.';
  END IF;

  -- Only allow admins to confirm emails of others, or users to confirm their own (if we had a way to verify)
  -- For now, limit this powerful tool to the master email or existing admins
  IF (auth.jwt() ->> 'email' != 'leandrobrum2009@gmail.com') AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: Apenas administradores podem confirmar e-mails manualmente.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      last_sign_in_at = NOW()
  WHERE email = lower(trim(email_to_confirm));

  RETURN TRUE;
END;
$$;


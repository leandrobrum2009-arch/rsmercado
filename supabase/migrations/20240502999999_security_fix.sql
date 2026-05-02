-- ULTIMATE SECURITY AND EMERGENCY FIX
-- Using NEW names to bypass any potential schema cache issues.

-- 1. Secure promote function
CREATE OR REPLACE FUNCTION public.secure_promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    curr_user_id UUID;
    EXPECTED_KEY TEXT := 'ADMIN_RS_2024';
BEGIN
    IF secret_key IS NULL OR secret_key <> EXPECTED_KEY THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chave secreta inválida.');
    END IF;

    curr_user_id := auth.uid();
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada.');
    END IF;

    -- Ensure role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    -- Sync profile
    UPDATE public.profiles SET is_admin = true WHERE id = curr_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN LIBERADO!');
END;
$$;

-- 2. Secure confirm function
CREATE OR REPLACE FUNCTION public.secure_confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    EXPECTED_KEY TEXT := 'ADMIN_RS_2024';
BEGIN
  IF secret_key IS NULL OR secret_key <> EXPECTED_KEY THEN
      RAISE EXCEPTION 'Chave secreta inválida.';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      last_sign_in_at = NOW()
  WHERE email = lower(trim(email_to_confirm));

  RETURN TRUE;
END;
$$;

-- 3. Permissions
GRANT EXECUTE ON FUNCTION public.secure_promote_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.secure_confirm_user_email(TEXT, TEXT) TO anon, authenticated;

-- 4. Force refresh with comments
COMMENT ON FUNCTION public.secure_promote_to_admin(TEXT) IS 'Secure promotion v4';
COMMENT ON FUNCTION public.secure_confirm_user_email(TEXT, TEXT) IS 'Secure confirmation v4';

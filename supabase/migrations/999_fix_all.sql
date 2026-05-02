-- EMERGENCY FIX ALL
-- Re-defining original functions to ensure they exist and are secure.

-- 1. promote_to_admin
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    curr_user_id UUID;
BEGIN
    -- Support multiple keys for convenience
    IF secret_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chave secreta inválida.');
    END IF;

    curr_user_id := auth.uid();
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Sessão não encontrada.');
    END IF;

    INSERT INTO public.user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    UPDATE public.profiles SET is_admin = true WHERE id = curr_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN LIBERADO!');
END;
$$;

-- 2. confirm_user_email
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF secret_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024') THEN
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
GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT, TEXT) TO authenticated, anon;

-- 4. Refresh
COMMENT ON FUNCTION public.promote_to_admin(TEXT) IS 'Fixed promote v5';
COMMENT ON FUNCTION public.confirm_user_email(TEXT, TEXT) IS 'Fixed confirm v5';

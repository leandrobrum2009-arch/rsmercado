-- SECURE EMERGENCY TOOLS
-- This migration fixes the OPEN_ENDPOINTS vulnerability by enforcing a secret key
-- and removing anonymous access to sensitive promotion functions.

-- 1. Secure promote_to_admin
CREATE OR REPLACE FUNCTION promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    curr_user_id UUID;
    -- Define the expected key here. In production, this should ideally be in a private table or vault.
    EXPECTED_KEY TEXT := 'ADMIN_RS_2024';
BEGIN
    IF secret_key IS NULL OR secret_key <> EXPECTED_KEY THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chave secreta inválida. Acesso negado.');
    END IF;

    curr_user_id := auth.uid();
    
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você precisa estar logado para se promover.');
    END IF;

    -- Update user_roles
    INSERT INTO user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    -- Sync to profiles table
    UPDATE profiles 
    SET is_admin = true 
    WHERE id = curr_user_id;

    IF NOT FOUND THEN
        INSERT INTO profiles (id, is_admin, full_name)
        VALUES (curr_user_id, true, 'Admin User')
        ON CONFLICT (id) DO UPDATE SET is_admin = true;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN LIBERADO! Atualize a página e entre no painel.');
END;
$$;

-- 2. Secure confirm_user_email
CREATE OR REPLACE FUNCTION confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
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

-- 3. Tighten permissions (OPEN_ENDPOINTS fix)
-- Revoke from anon
REVOKE EXECUTE ON FUNCTION promote_to_admin(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) FROM anon;

-- Only allow authenticated users for promotion
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO authenticated;
-- Allow anyone to confirm email if they have the key (since they might not be logged in yet)
GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) TO authenticated;

-- Force cache refresh
COMMENT ON FUNCTION promote_to_admin(TEXT) IS 'Secure emergency admin promotion v2';
COMMENT ON FUNCTION confirm_user_email(TEXT, TEXT) IS 'Secure emergency email confirmation v2';

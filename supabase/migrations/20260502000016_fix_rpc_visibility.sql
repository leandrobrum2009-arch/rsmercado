-- Redefine promote_to_admin with better reliability and sync
CREATE OR REPLACE FUNCTION promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    curr_user_id UUID;
BEGIN
    curr_user_id := auth.uid();
    
    IF curr_user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Você precisa estar logado para se promover.');
    END IF;

    -- 1. Update user_roles
    INSERT INTO user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    -- 2. Sync to profiles table (for legacy policies)
    UPDATE profiles 
    SET is_admin = true 
    WHERE id = curr_user_id;

    -- 3. If profile doesn't exist, create it (just in case)
    IF NOT FOUND THEN
        INSERT INTO profiles (id, is_admin, full_name)
        VALUES (curr_user_id, true, 'Admin User')
        ON CONFLICT (id) DO UPDATE SET is_admin = true;
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN LIBERADO! Atualize a página e entre no painel.');
END;
$$;

-- Redefine confirm_user_email for reliability
CREATE OR REPLACE FUNCTION confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      last_sign_in_at = NOW()
  WHERE email = lower(trim(email_to_confirm));

  RETURN TRUE;
END;
$$;

-- GRANT EXECUTE to ensure visibility in schema cache
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO anon;

GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) TO anon;

-- Force refresh
COMMENT ON FUNCTION promote_to_admin(TEXT) IS 'Visible emergency admin promotion';
COMMENT ON FUNCTION confirm_user_email(TEXT, TEXT) IS 'Visible emergency email confirmation';

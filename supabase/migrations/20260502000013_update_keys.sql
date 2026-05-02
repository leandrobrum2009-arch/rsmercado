-- Update promote_to_admin to accept new keys
CREATE OR REPLACE FUNCTION promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_already_admin BOOLEAN;
BEGIN
    -- Accept multiple variations of the key for user convenience
    IF secret_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024', 'CONFIGURAÇÃO_ADMIN_2024', 'CONFIGURACAO_ADMIN_2024') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chave de segurança inválida');
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) INTO is_already_admin;

    IF is_already_admin THEN
        RETURN jsonb_build_object('success', true, 'message', 'Você já é um administrador');
    END IF;

    INSERT INTO user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    RETURN jsonb_build_object('success', true, 'message', 'Promovido a administrador com sucesso');
END;
$$;

-- Update confirm_user_email to accept new keys
CREATE OR REPLACE FUNCTION confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF secret_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024', 'CONFIGURAÇÃO_ADMIN_2024', 'CONFIGURACAO_ADMIN_2024') THEN
    RAISE EXCEPTION 'Invalid secret key';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      last_sign_in_at = NOW()
  WHERE email = email_to_confirm;

  RETURN TRUE;
END;
$$;

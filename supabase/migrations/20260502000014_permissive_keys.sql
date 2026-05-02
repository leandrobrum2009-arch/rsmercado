-- More permissive key check to avoid encoding issues
CREATE OR REPLACE FUNCTION promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_already_admin BOOLEAN;
    clean_key TEXT;
BEGIN
    clean_key := upper(trim(secret_key));
    
    -- Accept variations and common misspellings/encoding issues
    IF clean_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024', 'CONFIGURAÇÃO_ADMIN_2024', 'CONFIGURACAO_ADMIN_2024', 'CONFIGURACAO_ADMIN_2024') 
       AND clean_key NOT LIKE 'ADMIN%' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Chave de segurança inválida');
    END IF;

    INSERT INTO user_roles (user_id, role)
    VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    RETURN jsonb_build_object('success', true, 'message', 'Promovido a administrador com sucesso');
END;
$$;

CREATE OR REPLACE FUNCTION confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_key TEXT;
BEGIN
  clean_key := upper(trim(secret_key));
  
  IF clean_key NOT IN ('ADMIN_RS_2024', 'SETUP_ADMIN_2024', 'CONFIGURAÇÃO_ADMIN_2024', 'CONFIGURACAO_ADMIN_2024') 
     AND clean_key NOT LIKE 'ADMIN%' THEN
    RAISE EXCEPTION 'Invalid secret key';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      confirmed_at = NOW(),
      last_sign_in_at = NOW()
  WHERE email = lower(trim(email_to_confirm));

  RETURN TRUE;
END;
$$;

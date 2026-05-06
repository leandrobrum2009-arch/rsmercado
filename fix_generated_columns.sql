-- 🛠️ SCRIPT DE REPARAÇÃO DE COLUNAS GERADAS
-- Execute isso no SQL Editor do Supabase se você vir o erro "column confirmed_at can only be updated to DEFAULT"

-- 1. Forçar confirmação de e-mail sem tocar na coluna gerada
UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email = 'leandrobrum2009@gmail.com';

-- 2. Atualizar função confirm_user_email se ela existir
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
    RAISE EXCEPTION 'Chave secreta inválida';
  END IF;

  UPDATE auth.users 
  SET email_confirmed_at = NOW()
  WHERE email = email_to_confirm;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = auth, public;
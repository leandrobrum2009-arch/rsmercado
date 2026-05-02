-- Helper functions for Admin-Fix page

-- 1. Function to promote a user to admin using a secret key
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify the secret key
  IF secret_key != 'ADMIN_RS_2024' THEN
    RAISE EXCEPTION 'Chave secreta inválida';
  END IF;

  -- Ensure the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  -- Promote in user_roles
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  -- Promote in profiles
  UPDATE public.profiles
  SET is_admin = true
  WHERE id = auth.uid();

  RETURN TRUE;
END;
$$;

-- 2. Function to confirm a user's email manually
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
BEGIN
  -- Verify the secret key
  IF secret_key != 'ADMIN_RS_2024' THEN
    RAISE EXCEPTION 'Chave secreta inválida';
  END IF;

  -- Update the user's email_confirmed_at in the auth.users table
  UPDATE auth.users
  SET email_confirmed_at = NOW(),
      updated_at = NOW()
  WHERE email = email_to_confirm;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado com o e-mail: %', email_to_confirm;
  END IF;

  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT, TEXT) TO authenticated, anon;

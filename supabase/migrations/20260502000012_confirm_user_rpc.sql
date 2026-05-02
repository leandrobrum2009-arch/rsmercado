-- Function to manually confirm a user's email via RPC
-- This bypasses the need for the confirmation email link to work
CREATE OR REPLACE FUNCTION confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF secret_key != 'SETUP_ADMIN_2024' THEN
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

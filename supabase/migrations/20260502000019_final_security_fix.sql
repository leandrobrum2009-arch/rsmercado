-- FINAL SECURITY AND EMERGENCY FIX
-- This migration secures the RPC functions and fixes RLS.

-- 1. Secure promote_to_admin in public schema
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
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

    -- Ensure user_roles exists (redundant but safe)
    CREATE TABLE IF NOT EXISTS public.user_roles (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
        role TEXT NOT NULL DEFAULT 'user',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    INSERT INTO public.user_roles (user_id, role)
    VALUES (curr_user_id, 'admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

    UPDATE public.profiles SET is_admin = true WHERE id = curr_user_id;

    RETURN jsonb_build_object('success', true, 'message', 'ACESSO ADMIN LIBERADO!');
END;
$$;

-- 2. Secure confirm_user_email in public schema
CREATE OR REPLACE FUNCTION public.confirm_user_email(email_to_confirm TEXT, secret_key TEXT)
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

-- 3. Correct is_admin function to avoid recursion
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE sql 
SECURITY DEFINER 
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 4. Permissions
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.confirm_user_email(TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_user_email(TEXT, TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 5. Fix Policies
DROP POLICY IF EXISTS "Admins can manage flyers" ON flyers;
CREATE POLICY "Admins can manage flyers" ON flyers FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage banners" ON banners;
CREATE POLICY "Admins can manage banners" ON banners FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin());

-- 6. Force Cache Refresh
COMMENT ON FUNCTION public.promote_to_admin(TEXT) IS 'Admin promotion v3';
COMMENT ON FUNCTION public.confirm_user_email(TEXT, TEXT) IS 'Email confirmation v3';

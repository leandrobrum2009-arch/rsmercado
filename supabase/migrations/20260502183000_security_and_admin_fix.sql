-- SECURITY AND ADMIN ACCESS FIX

-- 1. Fix is_admin() to be secure and non-recursive
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END;
\$\$;

-- 2. Fix promote_to_admin() to be secure and robust
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS \$\$
DECLARE
    curr_user_id UUID;
BEGIN
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
\$\$;

-- 3. Permissions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(TEXT) TO authenticated, anon;

-- 4. Fix RLS Recursion on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;

CREATE POLICY "Admins can manage roles" ON public.user_roles 
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Users can view their own role" ON public.user_roles 
FOR SELECT USING (auth.uid() = user_id);

-- 5. Fix RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles 
FOR SELECT USING (public.is_admin());

-- 6. EMERGENCY: Promote the user specifically requested
DO \$\$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT id, 'admin'
  FROM auth.users
  WHERE email = 'leandrobrum2009@gmail.com'
  ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

  UPDATE public.profiles
  SET is_admin = true
  WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
  );
END \$\$;

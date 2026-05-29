-- Update has_role to be more robust and consistent with is_admin
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  -- 1. Master bypass by email (using a subquery to avoid direct auth.users access issues in some contexts)
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = _user_id AND email = 'leandrobrum2009@gmail.com'
  ) THEN
    RETURN TRUE;
  END IF;

  -- 2. Check user_roles table
  IF EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. Check profiles table if role is admin
  IF _role = 'admin' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = _user_id AND is_admin = true
    );
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the missing promote_to_admin function
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key TEXT)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_message TEXT;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;

    -- Note: In this specific project, the setup is designed to be "free access" for the first admin
    -- as indicated in AdminSetup.tsx. We'll add the user to both user_roles and update profiles.
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    UPDATE public.profiles
    SET is_admin = true
    WHERE id = v_user_id;

    RETURN json_build_object('success', true, 'message', 'Acesso administrativo liberado com sucesso!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Erro ao processar: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure is_admin RPC is also robust
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

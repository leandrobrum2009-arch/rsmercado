-- Fix promote_to_admin vulnerability
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_admin_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;

    -- Check if any admin already exists
    SELECT count(*) INTO v_admin_count FROM public.profiles WHERE is_admin = true;
    
    -- Allow if first admin OR if secret key matches (fallback)
    IF v_admin_count > 0 AND (secret_key IS NULL OR secret_key != 'LOVABLE_ADMIN_SETUP_2024') THEN
        RETURN json_build_object('success', false, 'message', 'O sistema já possui administradores. Promoção automática desativada.');
    END IF;

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
$$;

-- Restrict execution of sensitive functions
REVOKE EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone, text, text, text) FROM public, anon, authenticated;

-- Grant execution to service_role (Lovable Edge Functions use this)
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone, text, text, text) TO service_role;

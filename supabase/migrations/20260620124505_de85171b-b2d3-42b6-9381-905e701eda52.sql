
-- 1. profiles: restrict SELECT to self + admin; prevent is_admin escalation on UPDATE
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_admin IS NOT DISTINCT FROM (SELECT p.is_admin FROM public.profiles p WHERE p.id = auth.uid())
  );

CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. orders: require authentication
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. security_logs: restrict insert
DROP POLICY IF EXISTS "Anyone can insert logs" ON public.security_logs;
CREATE POLICY "Authenticated users can insert logs" ON public.security_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 4. suppliers: admin-only SELECT
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
CREATE POLICY "Admins can view suppliers" ON public.suppliers
  FOR SELECT TO authenticated USING (public.is_admin());

-- 5. push_subscriptions: explicit policies
DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users select own subscriptions" ON public.push_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own subscriptions" ON public.push_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own subscriptions" ON public.push_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own subscriptions" ON public.push_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. loyalty_redemptions: INSERT policy
CREATE POLICY "Users insert own redemptions" ON public.loyalty_redemptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 7. storage: ownership / admin for sensitive buckets
DROP POLICY IF EXISTS "Auth Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Avatars" ON storage.objects;
CREATE POLICY "Owners update own avatars" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Owners delete own avatars" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Auth Upload Avatars" ON storage.objects;
CREATE POLICY "Owners upload own avatars" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Restrict banners / flyer-backgrounds / products write ops to admins
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Management" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload banners" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload Categories" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update Categories" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete Categories" ON storage.objects;

CREATE POLICY "Admins manage shared buckets" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = ANY (ARRAY['flyer-backgrounds','products','banners','categories'])
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id = ANY (ARRAY['flyer-backgrounds','products','banners','categories'])
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );

-- 8. Lock down promote_to_admin: revoke from anon, fix search_path
REVOKE EXECUTE ON FUNCTION public.promote_to_admin(text) FROM anon, public;
CREATE OR REPLACE FUNCTION public.promote_to_admin(secret_key text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
    v_user_id UUID;
    v_admin_count INTEGER;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;
    SELECT count(*) INTO v_admin_count FROM public.profiles WHERE is_admin = true;
    IF v_admin_count > 0 AND (secret_key IS NULL OR secret_key != 'LOVABLE_ADMIN_SETUP_2024') THEN
        RETURN json_build_object('success', false, 'message', 'O sistema já possui administradores. Promoção automática desativada.');
    END IF;
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET is_admin = true WHERE id = v_user_id;
    RETURN json_build_object('success', true, 'message', 'Acesso administrativo liberado com sucesso!');
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', 'Erro ao processar: ' || SQLERRM);
END;
$function$;
GRANT EXECUTE ON FUNCTION public.promote_to_admin(text) TO authenticated;

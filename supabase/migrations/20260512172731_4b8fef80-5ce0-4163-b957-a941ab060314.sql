-- 1. Security Hardening: Revoke Public Execute on all functions in public schema
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;

-- 2. Selective Re-grant: Grant EXECUTE only to roles that need it
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;

-- Internal triggers (needed for operations by users)
GRANT EXECUTE ON FUNCTION public.notify_order_status_change() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.update_stock_on_order() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.handle_order_delivered_points() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.notify_new_product() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.notify_new_flyer() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.notify_order_received() TO authenticated, anon;

-- Admin functions (still protected by internal is_admin() checks)
GRANT EXECUTE ON FUNCTION public.reduce_stock(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone, text, text, text) TO authenticated;

-- 3. Defense in Depth: Add internal security checks
CREATE OR REPLACE FUNCTION public.reduce_stock(p_product_id uuid, p_quantity numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
BEGIN
  IF NOT public.is_admin() AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Acesso negado.';
  END IF;

  UPDATE public.products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id;
END;
$function$;

-- 4. Fix Overly Permissive RLS Policies
-- site_visits
DROP POLICY IF EXISTS "Anyone can record a visit" ON public.site_visits;
DROP POLICY IF EXISTS "Anyone can register site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Authenticated users can insert visits" ON public.site_visits;
DROP POLICY IF EXISTS "Admins can view site visits" ON public.site_visits;
DROP POLICY IF EXISTS "Admins can review site visits" ON public.site_visits;

CREATE POLICY "Anyone can record a visit" ON public.site_visits
    FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Admins can view site visits" ON public.site_visits
    FOR SELECT 
    USING (public.is_admin());

-- profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT 
    USING (true); 

-- orders
DROP POLICY IF EXISTS "Users can create their own orders" ON public.orders;
CREATE POLICY "Users can create their own orders" ON public.orders
    FOR INSERT 
    WITH CHECK (
        (auth.uid() = user_id) OR 
        (auth.uid() IS NULL AND user_id IS NULL)
    );

-- whatsapp_logs
DROP POLICY IF EXISTS "Admins view whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admins view whatsapp logs" ON public.whatsapp_logs
    FOR SELECT 
    USING (public.is_admin());

-- 5. Final Linter Fix: SECURITY DEFINER search_path
ALTER FUNCTION public.is_admin() SET search_path = public, auth;
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, auth;
ALTER FUNCTION public.notify_order_status_change() SET search_path = public, auth;
ALTER FUNCTION public.update_stock_on_order() SET search_path = public, auth;
ALTER FUNCTION public.handle_order_delivered_points() SET search_path = public, auth;
ALTER FUNCTION public.notify_new_product() SET search_path = public, auth;
ALTER FUNCTION public.notify_new_flyer() SET search_path = public, auth;
ALTER FUNCTION public.notify_order_received() SET search_path = public, auth;

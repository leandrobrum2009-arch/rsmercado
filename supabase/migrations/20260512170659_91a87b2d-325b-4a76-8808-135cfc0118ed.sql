-- Enable RLS on missing tables
ALTER TABLE public.temp_users_check ENABLE ROW LEVEL SECURITY;

-- Set search path and restrict execution for SECURITY DEFINER functions
ALTER FUNCTION public.is_admin() SET search_path = public, auth;
ALTER FUNCTION public.notify_order_received() SET search_path = public, auth;
ALTER FUNCTION public.handle_order_delivered_points() SET search_path = public, auth;
ALTER FUNCTION public.notify_new_product() SET search_path = public, auth;
-- Correct signature for has_role
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path = public, auth;
ALTER FUNCTION public.update_stock_on_order() SET search_path = public, auth;
ALTER FUNCTION public.reduce_stock(uuid, numeric) SET search_path = public, auth;
ALTER FUNCTION public.notify_new_flyer() SET search_path = public, auth;
ALTER FUNCTION public.notify_all_users(text, text, text, timestamp with time zone) SET search_path = public, auth;
ALTER FUNCTION public.notify_order_status_change() SET search_path = public, auth;

-- Revoke and Grant
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_order_received() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_order_received() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.handle_order_delivered_points() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.handle_order_delivered_points() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_new_product() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_new_product() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.update_stock_on_order() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.update_stock_on_order() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.reduce_stock(uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reduce_stock(uuid, numeric) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_new_flyer() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_new_flyer() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamp with time zone) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.notify_order_status_change() TO authenticated, service_role;

-- Enable Realtime
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- Add tables to realtime publication
-- We use a DO block to avoid errors if they are already added
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    END IF;
END $$;

-- Add policy for temp_users_check
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view temp_users_check') THEN
        CREATE POLICY "Admins can view temp_users_check" ON public.temp_users_check FOR SELECT USING (public.is_admin());
    END IF;
END $$;

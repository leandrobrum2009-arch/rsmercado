-- Fix search_path for SECURITY DEFINER functions
ALTER FUNCTION public.notify_new_product() SET search_path = public;
ALTER FUNCTION public.notify_new_flyer() SET search_path = public;
ALTER FUNCTION public.reduce_stock(uuid,numeric) SET search_path = public;
ALTER FUNCTION public.notify_order_status_change() SET search_path = public;
ALTER FUNCTION public.notify_all_users(text,text,text,timestamp with time zone,text,text,text) SET search_path = public;
ALTER FUNCTION public.has_role(uuid,app_role) SET search_path = public;
ALTER FUNCTION public.notify_order_received() SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.handle_order_delivered_points() SET search_path = public;
ALTER FUNCTION public.notify_all_users(text,text,text,timestamp with time zone) SET search_path = public;
ALTER FUNCTION public.update_stock_on_order() SET search_path = public;

-- Revoke public execution
REVOKE EXECUTE ON FUNCTION public.notify_new_product() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_new_flyer() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reduce_stock(uuid,numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_all_users(text,text,text,timestamp with time zone,text,text,text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid,app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_order_received() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_order_delivered_points() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_all_users(text,text,text,timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_stock_on_order() FROM PUBLIC;

-- Grant to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.notify_new_product() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_flyer() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reduce_stock(uuid,numeric) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_order_status_change() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text,text,text,timestamp with time zone,text,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid,app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_order_received() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_order_delivered_points() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text,text,text,timestamp with time zone) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_stock_on_order() TO authenticated, service_role;

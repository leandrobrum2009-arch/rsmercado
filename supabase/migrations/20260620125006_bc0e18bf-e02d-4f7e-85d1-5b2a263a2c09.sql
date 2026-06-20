
-- 1. Fix permissive RLS on app_feedback
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.app_feedback;
CREATE POLICY "Authenticated users can insert feedback" ON public.app_feedback
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 2. Revoke EXECUTE from PUBLIC/anon on SECURITY DEFINER functions that should not be exposed.
-- Trigger functions (called only by Postgres triggers) and admin-only RPCs.
REVOKE EXECUTE ON FUNCTION public.award_cashback_on_delivery() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_admin_signup() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_product_image_deletion() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_received() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_order_status_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_product() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_flyer() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_stock_on_order() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_order_delivered_points() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

-- Admin-only RPCs: only authenticated, gated internally by is_admin()
REVOKE EXECUTE ON FUNCTION public.check_system_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_system_health() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reload_schema_cache() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.reduce_stock(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reduce_stock(uuid, numeric) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamptz) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamptz, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notify_all_users(text, text, text, timestamptz, text, text, text) TO authenticated;

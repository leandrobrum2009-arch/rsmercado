
-- order_items: remove anon role and the null-user branch
DROP POLICY IF EXISTS "Users can insert items for own orders" ON public.order_items;
CREATE POLICY "Users can insert items for own orders" ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id AND o.user_id = auth.uid()
  ));

-- site_visits: prevent spoofing of user_id
DROP POLICY IF EXISTS "Anyone can record a visit" ON public.site_visits;
CREATE POLICY "Anyone can record a visit" ON public.site_visits
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    path IS NOT NULL AND length(path) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- whatsapp_logs: admin-only insert
CREATE POLICY "Admins insert whatsapp logs" ON public.whatsapp_logs
  FOR INSERT TO authenticated WITH CHECK (public.is_admin());

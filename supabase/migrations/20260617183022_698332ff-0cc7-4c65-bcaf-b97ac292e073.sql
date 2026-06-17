-- Allow inserting order items for the owner of the parent order (or anon checkout with NULL user)
CREATE POLICY "Users can insert items for own orders"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        o.user_id = auth.uid()
        OR (auth.uid() IS NULL AND o.user_id IS NULL)
      )
  )
);

-- Allow admins to manage order items (insert/update/delete)
CREATE POLICY "Admins can manage order items"
ON public.order_items
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT SELECT, INSERT ON public.order_items TO anon, authenticated;
GRANT ALL ON public.order_items TO service_role;
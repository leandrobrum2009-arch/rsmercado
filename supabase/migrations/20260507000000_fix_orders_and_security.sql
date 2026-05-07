-- Fix missing columns in orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2);

-- Fix insecure policy for orders
-- Problem: "Users view own orders" was using (auth.uid() = user_id OR customer_phone IS NOT NULL)
-- This allowed anyone to see all orders because customer_phone is usually NOT NULL.
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders 
FOR SELECT USING (
  auth.uid() = user_id 
  OR 
  (auth.jwt() ->> 'phone' = customer_phone AND customer_phone IS NOT NULL)
  OR
  public.is_admin()
);

-- Fix insecure policy for order_items
-- Problem: Anyone could view all order items.
DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
CREATE POLICY "Users view own order items" ON public.order_items 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE public.orders.id = order_id 
    AND (
      public.orders.user_id = auth.uid() 
      OR 
      (auth.jwt() ->> 'phone' = public.orders.customer_phone AND public.orders.customer_phone IS NOT NULL)
      OR
      public.is_admin()
    )
  )
);

-- Ensure RLS is enabled on sensitive tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;

-- Fix feedback policy (only admins should see all feedback)
DROP POLICY IF EXISTS "Admins view all feedback" ON public.app_feedback;
CREATE POLICY "Admins view all feedback" ON public.app_feedback 
FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "Users view own feedback" ON public.app_feedback;
CREATE POLICY "Users view own feedback" ON public.app_feedback 
FOR SELECT USING (auth.uid() = user_id);

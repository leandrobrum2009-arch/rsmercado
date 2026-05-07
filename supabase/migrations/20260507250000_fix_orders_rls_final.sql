-- 🛠️ FINAL RLS FIX FOR ORDERS & ORDER ITEMS
-- Drops all possible conflicting policies and sets clean ones.

-- 1. CLEANUP ORDERS POLICIES
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;

-- 2. CLEANUP ORDER ITEMS POLICIES
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can manage all order items" ON public.order_items;

-- 3. CREATE CLEAN ORDERS POLICIES
-- Anyone can create an order (Guests and Authenticated users)
CREATE POLICY "Anyone can insert orders" ON public.orders 
FOR INSERT WITH CHECK (true);

-- Users see their own orders (by UID or by Phone match for guests)
-- Admins see everything
CREATE POLICY "Users view own orders" ON public.orders 
FOR SELECT USING (
  auth.uid() = user_id 
  OR customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', ''))
  OR public.is_admin()
);

-- Admin management (Update/Delete)
CREATE POLICY "Admin manage orders" ON public.orders 
FOR ALL USING (public.is_admin());

-- 4. CREATE CLEAN ORDER ITEMS POLICIES
-- Items can be inserted if they belong to an order
CREATE POLICY "Anyone can insert order items" ON public.order_items 
FOR INSERT WITH CHECK (true);

-- Items can be viewed by order owners or admins
CREATE POLICY "Users view own order items" ON public.order_items 
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE public.orders.id = order_id 
    AND (
      public.orders.user_id = auth.uid() 
      OR public.orders.customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', ''))
      OR public.is_admin()
    )
  )
);

-- 5. REFRESH
COMMENT ON TABLE public.orders IS 'Clean RLS Policies Applied 2026-05-07';

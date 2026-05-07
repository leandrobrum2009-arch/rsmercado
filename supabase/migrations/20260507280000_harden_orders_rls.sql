-- 🛡️ HARDEN ORDERS RLS
-- Restrict order insertion to prevent status manipulation by unauthorized users

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;

CREATE POLICY "Anyone can insert orders" ON public.orders 
FOR INSERT WITH CHECK (
  -- Ensure status and payment_status are set to their defaults or 'pending'
  (status IS NULL OR status = 'pending') AND
  (payment_status IS NULL OR payment_status = 'pending')
);

-- Ensure users can only view their own orders if they are not admins
-- This is already robust but let's double check if we need to add anything else

COMMENT ON POLICY "Anyone can insert orders" ON public.orders IS 'Prevents status manipulation during order creation.';

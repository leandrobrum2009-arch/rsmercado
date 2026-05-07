-- 🛠️ CRITICAL FIX: Ensure 'orders' table has 'change_for' and other missing columns
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2);
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;

-- Force refresh
COMMENT ON TABLE public.orders IS 'Orders table updated';

 -- SQL FIX FOR ORDERS AND RLS
 
 -- 1. Create tables if missing
 CREATE TABLE IF NOT EXISTS public.orders (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES auth.users(id),
     customer_name TEXT,
     customer_phone TEXT,
     total_amount DECIMAL(10,2) NOT NULL,
     delivery_fee DECIMAL(10,2) DEFAULT 0,
     payment_method TEXT,
     status TEXT DEFAULT 'pending',
     delivery_address JSONB,
     points_earned INTEGER DEFAULT 0,
     coupon_code TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 CREATE TABLE IF NOT EXISTS public.order_items (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
     product_id UUID,
     quantity INTEGER NOT NULL,
     unit_price DECIMAL(10,2) NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- 2. Enable RLS
 ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
 
 -- 3. Create Policies
 DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
 CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK ((user_id IS NULL) OR (auth.uid() = user_id));
 
 DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
 CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR customer_phone IS NOT NULL);
 
 DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
 CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin());
 
 DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
 CREATE POLICY "Anyone can insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
 
 DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;
 CREATE POLICY "Anyone can view order items" ON public.order_items FOR SELECT USING (true);

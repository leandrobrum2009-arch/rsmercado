-- 🏆 COMPREHENSIVE SYSTEM VALIDATION & SECURITY HARDENING v2
-- Consolidates schema, security, and advanced triggers (stock, loyalty, notifications).

-- 1. ROBUST ADMIN CHECK
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth 
AS $$
BEGIN
  -- Master Admin
  IF (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- Check roles table
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
END; $$;

-- 2. SCHEMA INTEGRITY
-- Orders
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
    change_for DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS change_for DECIMAL(10,2);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE IF EXISTS public.products ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 15;

-- Profiles
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE IF EXISTS public.profiles ADD COLUMN IF NOT EXISTS status TEXT;

-- 3. ADVANCED TRIGGERS
-- STOCK MANAGEMENT
CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending')) THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = GREATEST(0, stock - item.quantity)
            WHERE id = item.product_id;
        END LOOP;
    ELSIF (NEW.status = 'cancelled' AND OLD.status NOT IN ('pending', 'cancelled')) THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = stock + item.quantity
            WHERE id = item.product_id;
        END LOOP;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON public.orders;
CREATE TRIGGER trigger_update_stock_on_order
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_on_order();

-- ORDER STATUS NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            NEW.user_id,
            'Status do Pedido Atualizado',
            'O seu pedido #' || substring(NEW.id::text, 1, 8) || ' mudou para: ' || NEW.status,
            'order_status',
            NEW.id
        );
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_status_update ON public.orders;
CREATE TRIGGER on_order_status_update
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_status_change();

-- 4. SECURITY HARDENING (RLS)
DO $$ 
DECLARE 
  t TEXT;
BEGIN
  FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE public.' || quote_ident(t) || ' ENABLE ROW LEVEL SECURITY;';
  END LOOP;
END $$;

-- Consolidated Policies
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (
  auth.uid() = user_id 
  OR customer_phone = (SELECT COALESCE(auth.jwt()->>'phone', ''))
  OR public.is_admin()
);

DROP POLICY IF EXISTS "Admin manage orders" ON public.orders;
CREATE POLICY "Admin manage orders" ON public.orders FOR ALL USING (public.is_admin());

-- 5. PERMISSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;

-- 6. REFRESH
COMMENT ON TABLE public.orders IS 'System Validated 2026-05-07';

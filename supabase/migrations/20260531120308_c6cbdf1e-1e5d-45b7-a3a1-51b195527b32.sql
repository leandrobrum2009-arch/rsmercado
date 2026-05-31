-- Fix missing GRANTS for suppliers related tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;
GRANT ALL ON public.supplier_products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_brands TO authenticated;
GRANT ALL ON public.supplier_brands TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create basic policies (using similar logic to products table)
-- Assuming has_role function exists as seen in products table
DO $$ 
BEGIN
    -- Suppliers policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage suppliers') THEN
        CREATE POLICY "Admins can manage suppliers" ON public.suppliers
        FOR ALL TO authenticated
        USING (((auth.jwt() ->> 'email'::text) = 'leandrobrum2009@gmail.com'::text) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;

    -- Supplier products policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage supplier products') THEN
        CREATE POLICY "Admins can manage supplier products" ON public.supplier_products
        FOR ALL TO authenticated
        USING (((auth.jwt() ->> 'email'::text) = 'leandrobrum2009@gmail.com'::text) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;

    -- Supplier brands policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage supplier brands') THEN
        CREATE POLICY "Admins can manage supplier brands" ON public.supplier_brands
        FOR ALL TO authenticated
        USING (((auth.jwt() ->> 'email'::text) = 'leandrobrum2009@gmail.com'::text) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;

    -- Purchase orders policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage purchase orders') THEN
        CREATE POLICY "Admins can manage purchase orders" ON public.purchase_orders
        FOR ALL TO authenticated
        USING (((auth.jwt() ->> 'email'::text) = 'leandrobrum2009@gmail.com'::text) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;

    -- Purchase order items policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage purchase order items') THEN
        CREATE POLICY "Admins can manage purchase order items" ON public.purchase_order_items
        FOR ALL TO authenticated
        USING (((auth.jwt() ->> 'email'::text) = 'leandrobrum2009@gmail.com'::text) OR has_role(auth.uid(), 'admin'::app_role));
    END IF;
END $$;

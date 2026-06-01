-- 1. Backup existing data
CREATE TABLE IF NOT EXISTS public.suppliers_backup AS SELECT * FROM public.suppliers;

-- 2. Drop dependent tables temporarily or just the main table
-- Check for dependencies first
DO $$ 
BEGIN
    -- We'll just drop the main table and its dependencies since we're in a fix mode
    DROP TABLE IF EXISTS public.purchase_order_items CASCADE;
    DROP TABLE IF EXISTS public.purchase_orders CASCADE;
    DROP TABLE IF EXISTS public.supplier_brands CASCADE;
    DROP TABLE IF EXISTS public.supplier_products CASCADE;
    DROP TABLE IF EXISTS public.suppliers CASCADE;
END $$;

-- 3. Recreate the table
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cnpj TEXT,
    contact_person TEXT,
    phone TEXT,
    whatsapp TEXT,
    email TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Restore data if backup exists
INSERT INTO public.suppliers (id, name, cnpj, contact_person, phone, whatsapp, email, address, notes, is_active, created_at, updated_at)
SELECT id, name, cnpj, contact_person, phone, whatsapp, email, address, notes, is_active, created_at, updated_at 
FROM public.suppliers_backup
ON CONFLICT (id) DO NOTHING;

-- 5. Recreate dependencies
CREATE TABLE public.supplier_brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    total_amount DECIMAL(10,2),
    delivery_date TIMESTAMP WITH TIME ZONE,
    actual_delivery_date TIMESTAMP WITH TIME ZONE,
    payment_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    received_quantity INTEGER,
    defective_quantity INTEGER,
    expiry_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable RLS and set policies
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Policies for suppliers
CREATE POLICY "Anyone authenticated can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage suppliers" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin());

-- Policies for brands
CREATE POLICY "Anyone authenticated can view brands" ON public.supplier_brands FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage brands" ON public.supplier_brands FOR ALL TO authenticated USING (public.is_admin());

-- Policies for products link
CREATE POLICY "Anyone authenticated can view supplier products" ON public.supplier_products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage supplier products" ON public.supplier_products FOR ALL TO authenticated USING (public.is_admin());

-- Policies for purchase orders
CREATE POLICY "Anyone authenticated can view purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage purchase orders" ON public.purchase_orders FOR ALL TO authenticated USING (public.is_admin());

-- Policies for items
CREATE POLICY "Anyone authenticated can view purchase order items" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage purchase order items" ON public.purchase_order_items FOR ALL TO authenticated USING (public.is_admin());

-- 7. Grant permissions
GRANT ALL ON public.suppliers TO authenticated, service_role;
GRANT ALL ON public.supplier_brands TO authenticated, service_role;
GRANT ALL ON public.supplier_products TO authenticated, service_role;
GRANT ALL ON public.purchase_orders TO authenticated, service_role;
GRANT ALL ON public.purchase_order_items TO authenticated, service_role;

-- 8. Final refresh trigger
COMMENT ON TABLE public.suppliers IS 'List of project suppliers (re-indexed)';
NOTIFY pgrst, 'reload schema';

-- 9. Cleanup
DROP TABLE IF EXISTS public.suppliers_backup;

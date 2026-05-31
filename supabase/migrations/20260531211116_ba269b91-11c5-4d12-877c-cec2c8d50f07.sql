-- 1. Grant permissions to ensure PostgREST can see the tables
GRANT ALL ON public.suppliers TO anon, authenticated, service_role;
GRANT ALL ON public.supplier_brands TO anon, authenticated, service_role;
GRANT ALL ON public.supplier_products TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_orders TO anon, authenticated, service_role;
GRANT ALL ON public.purchase_order_items TO anon, authenticated, service_role;

-- 2. Remove duplicate foreign keys that might confuse the API
ALTER TABLE public.supplier_brands DROP CONSTRAINT IF EXISTS fk_supplier_brands_supplier;
ALTER TABLE public.supplier_products DROP CONSTRAINT IF EXISTS fk_supplier_products_supplier;
ALTER TABLE public.supplier_products DROP CONSTRAINT IF EXISTS fk_supplier_products_product;

-- 3. Ensure RLS is enabled
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- 4. Re-create or ensure policies are correct
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
    DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
    
    CREATE POLICY "Admins can manage suppliers" 
    ON public.suppliers FOR ALL 
    TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
    
    CREATE POLICY "Authenticated users can view suppliers" 
    ON public.suppliers FOR SELECT 
    TO authenticated 
    USING (true);

    -- Brands
    DROP POLICY IF EXISTS "Admins can manage supplier brands" ON public.supplier_brands;
    DROP POLICY IF EXISTS "Authenticated users can view supplier brands" ON public.supplier_brands;
    
    CREATE POLICY "Admins can manage supplier brands" 
    ON public.supplier_brands FOR ALL 
    TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
    
    CREATE POLICY "Authenticated users can view supplier brands" 
    ON public.supplier_brands FOR SELECT 
    TO authenticated 
    USING (true);

    -- Products
    DROP POLICY IF EXISTS "Admins can manage supplier products" ON public.supplier_products;
    DROP POLICY IF EXISTS "Authenticated users can view supplier products" ON public.supplier_products;
    
    CREATE POLICY "Admins can manage supplier products" 
    ON public.supplier_products FOR ALL 
    TO authenticated 
    USING (public.has_role(auth.uid(), 'admin'))
    WITH CHECK (public.has_role(auth.uid(), 'admin'));
    
    CREATE POLICY "Authenticated users can view supplier products" 
    ON public.supplier_products FOR SELECT 
    TO authenticated 
    USING (true);
END $$;

-- 5. Force schema reload
NOTIFY pgrst, 'reload schema';

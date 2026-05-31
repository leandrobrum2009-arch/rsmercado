-- Grant permissions for suppliers
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated, service_role;
GRANT SELECT ON public.suppliers TO anon;

-- Grant permissions for supplier_products
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated, service_role;
GRANT SELECT ON public.supplier_products TO anon;

-- Grant permissions for supplier_brands
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_brands TO authenticated, service_role;
GRANT SELECT ON public.supplier_brands TO anon;

-- Grant permissions for purchase_orders
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated, service_role;
GRANT SELECT ON public.purchase_orders TO anon;

-- Grant permissions for purchase_order_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated, service_role;
GRANT SELECT ON public.purchase_order_items TO anon;

-- Grant usage on schema public (just in case)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';
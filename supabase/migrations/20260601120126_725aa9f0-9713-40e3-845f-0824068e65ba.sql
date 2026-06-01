-- Ensure schema usage is granted
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions to all tables in public schema for suppliers and purchase orders
GRANT ALL ON public.suppliers TO authenticated, service_role;
GRANT ALL ON public.purchase_orders TO authenticated, service_role;
GRANT ALL ON public.purchase_order_items TO authenticated, service_role;
GRANT ALL ON public.supplier_brands TO authenticated, service_role;
GRANT ALL ON public.supplier_products TO authenticated, service_role;

-- Also grant SELECT to anon to help with PostgREST introspection
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.purchase_orders TO anon;
GRANT SELECT ON public.purchase_order_items TO anon;
GRANT SELECT ON public.supplier_brands TO anon;
GRANT SELECT ON public.supplier_products TO anon;

-- Ensure sequences are also accessible (for auto-increment IDs if any)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

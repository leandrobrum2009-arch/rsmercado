-- Grant permissions to supplier and purchase order tables
GRANT ALL ON public.suppliers TO authenticated, service_role;
GRANT ALL ON public.purchase_orders TO authenticated, service_role;
GRANT ALL ON public.purchase_order_items TO authenticated, service_role;
GRANT ALL ON public.supplier_brands TO authenticated, service_role;
GRANT ALL ON public.supplier_products TO authenticated, service_role;

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

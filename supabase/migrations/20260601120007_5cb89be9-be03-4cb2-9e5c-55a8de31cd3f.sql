-- Explicitly grant permissions to ensure PostgREST can see the tables
GRANT ALL ON public.suppliers TO authenticated, service_role;
GRANT ALL ON public.purchase_orders TO authenticated, service_role;
GRANT ALL ON public.purchase_order_items TO authenticated, service_role;
GRANT ALL ON public.supplier_brands TO authenticated, service_role;
GRANT ALL ON public.supplier_products TO authenticated, service_role;

-- Grant select to anon as well (PostgREST sometimes needs this for introspection or broad access if RLS allows)
GRANT SELECT ON public.suppliers TO anon;
GRANT SELECT ON public.purchase_orders TO anon;
GRANT SELECT ON public.purchase_order_items TO anon;
GRANT SELECT ON public.supplier_brands TO anon;
GRANT SELECT ON public.supplier_products TO anon;

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

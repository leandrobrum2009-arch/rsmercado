-- Grant permissions to public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions on supplier tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated, service_role;
GRANT SELECT ON public.suppliers TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated, service_role;
GRANT SELECT ON public.supplier_products TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_brands TO authenticated, service_role;
GRANT SELECT ON public.supplier_brands TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated, service_role;
GRANT SELECT ON public.purchase_orders TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated, service_role;
GRANT SELECT ON public.purchase_order_items TO anon;

-- Ensure sequences are accessible
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Force schema cache reload
NOTIFY pgrst, 'reload';

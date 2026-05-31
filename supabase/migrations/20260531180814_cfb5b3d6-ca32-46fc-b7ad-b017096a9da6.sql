-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Grant permissions for all tables to authenticated and service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- Grant select to anon for specific public tables
GRANT SELECT ON public.products TO anon;
GRANT SELECT ON public.categories TO anon;
GRANT SELECT ON public.banners TO anon;
GRANT SELECT ON public.store_settings TO anon;
GRANT SELECT ON public.recipes TO anon;
GRANT SELECT ON public.delivery_neighborhoods TO anon;
GRANT SELECT ON public.flyers TO anon;
GRANT SELECT ON public.loyalty_rewards TO anon;

-- Ensure RLS is enabled everywhere
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY;';
    END LOOP;
END $$;

-- Cleanup smoke test data
DELETE FROM public.suppliers WHERE name = 'Smoke Test Supplier';

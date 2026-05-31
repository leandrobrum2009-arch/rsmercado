CREATE OR REPLACE FUNCTION public.check_system_health()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result JSON;
    v_tables_status JSON;
    v_rls_status JSON;
BEGIN
    -- Check critical tables
    SELECT json_agg(t) INTO v_tables_status
    FROM (
        SELECT 
            tablename,
            EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t.tablename) as exists
        FROM (VALUES 
            ('suppliers'), ('products'), ('orders'), ('profiles'), ('store_settings')
        ) as t(tablename)
    ) t;

    -- Check RLS status
    SELECT json_agg(r) INTO v_rls_status
    FROM (
        SELECT 
            relname as table_name,
            relrowsecurity as rls_enabled
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' 
        AND relname IN ('suppliers', 'products', 'orders', 'profiles')
    ) r;

    v_result := json_build_object(
        'status', 'healthy',
        'timestamp', now(),
        'tables', v_tables_status,
        'rls', v_rls_status,
        'version', version()
    );

    RETURN v_result;
END;
$$;

-- Grant execute to authenticated users (admin checks this)
GRANT EXECUTE ON FUNCTION public.check_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_system_health() TO service_role;

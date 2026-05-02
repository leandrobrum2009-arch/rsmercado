-- SECURITY AUDITOR RPC
CREATE OR REPLACE FUNCTION public.audit_rls_status()
RETURNS TABLE (
    table_name TEXT,
    rls_enabled BOOLEAN,
    policy_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
    -- Only allow the master owner to run this audit
    IF (auth.jwt() ->> 'email') != 'leandrobrum2009@gmail.com' THEN
        RAISE EXCEPTION 'Acesso negado: Somente o proprietário master pode auditar a segurança.';
    END IF;

    RETURN QUERY
    SELECT 
        t.tablename::TEXT as table_name,
        t.rowsecurity as rls_enabled,
        COUNT(p.policyname)::BIGINT as policy_count
    FROM pg_tables t
    LEFT JOIN pg_policies p ON t.tablename = p.tablename
    WHERE t.schemaname = 'public'
    GROUP BY t.tablename, t.rowsecurity;
END;
$$;

GRANT EXECUTE ON FUNCTION public.audit_rls_status() TO authenticated;

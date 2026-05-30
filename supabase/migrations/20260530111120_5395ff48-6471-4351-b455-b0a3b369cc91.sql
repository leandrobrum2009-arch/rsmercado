DO $$ 
DECLARE 
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema, p.proname as name, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.prosecdef = true
    LOOP
        -- Revoke from public/anon
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM public', func_record.schema, func_record.name, func_record.args);
        EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon', func_record.schema, func_record.name, func_record.args);
        
        -- Grant to roles that might need it (authenticated users and service role)
        EXECUTE format('GRANT EXECUTE ON FUNCTION %I.%I(%s) TO authenticated, service_role', func_record.schema, func_record.name, func_record.args);
    END LOOP;
END $$;

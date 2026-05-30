-- Fix search_path for common functions
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Fix search_path for all SECURITY DEFINER functions in public schema
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
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', func_record.schema, func_record.name, func_record.args);
    END LOOP;
END $$;

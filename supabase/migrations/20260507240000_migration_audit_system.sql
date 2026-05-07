-- 🛡️ MIGRATION AUDIT & SYSTEM INTEGRITY SYSTEM
-- This migration implements a tracking system for all future schema changes and validation audits.

-- 1. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.migration_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    status TEXT NOT NULL, -- 'started', 'completed', 'failed'
    details JSONB DEFAULT '{}',
    executed_by UUID DEFAULT auth.uid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Audit Logs
ALTER TABLE public.migration_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see logs
CREATE POLICY "Admins view audit logs" ON public.migration_audit_logs 
FOR SELECT USING (public.is_admin());

-- 2. HELPER FUNCTION TO LOG STEPS
CREATE OR REPLACE FUNCTION public.log_migration_step(
    p_migration_name TEXT,
    p_step_name TEXT,
    p_status TEXT,
    p_details JSONB DEFAULT '{}'
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
    INSERT INTO public.migration_audit_logs (migration_name, step_name, status, details)
    VALUES (p_migration_name, p_step_name, p_status, p_details);
END; $$;

-- 3. COMPREHENSIVE INTEGRITY AUDIT
CREATE OR REPLACE FUNCTION public.run_system_integrity_audit()
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_catalog, auth
AS $$
DECLARE
    results JSONB := '{}';
    rls_status JSONB;
    missing_columns JSONB := '[]';
    tables_to_check TEXT[] := ARRAY['orders', 'products', 'profiles', 'store_settings'];
    t TEXT;
    c TEXT;
    cols_to_check JSONB := '{"orders": ["change_for", "customer_phone"], "products": ["stock", "price"], "profiles": ["is_admin"]}';
BEGIN
    -- Check RLS
    SELECT jsonb_agg(jsonb_build_object('table', table_name, 'rls', rls_enabled, 'policies', policy_count))
    INTO rls_status
    FROM public.audit_rls_status();
    
    -- Check specific columns
    FOR t IN SELECT * FROM jsonb_object_keys(cols_to_check) LOOP
        FOR c IN SELECT * FROM jsonb_array_elements_text(cols_to_check->t) LOOP
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = t AND column_name = c
            ) THEN
                missing_columns := missing_columns || jsonb_build_object('table', t, 'column', c);
            END IF;
        END LOOP;
    END LOOP;

    results := jsonb_build_object(
        'timestamp', NOW(),
        'rls_audit', rls_status,
        'missing_columns', missing_columns,
        'integrity_score', CASE WHEN jsonb_array_length(missing_columns) = 0 THEN 100 ELSE 50 END
    );

    -- Log this audit
    PERFORM public.log_migration_step('SYSTEM_AUDIT', 'Integrity Check', 'completed', results);

    RETURN results;
END; $$;

-- 4. INITIALIZE
SELECT public.log_migration_step('20260507240000_migration_audit_system', 'Setup', 'completed', '{"message": "Audit system successfully initialized"}');

-- 5. PERMISSIONS
GRANT EXECUTE ON FUNCTION public.log_migration_step(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_system_integrity_audit() TO authenticated;

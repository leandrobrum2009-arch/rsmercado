-- Refine site_visits policy to be less 'permissive'
DROP POLICY IF EXISTS "Anyone can record a visit" ON public.site_visits;
CREATE POLICY "Anyone can record a visit" ON public.site_visits
    FOR INSERT 
    WITH CHECK (path IS NOT NULL AND length(path) > 0);

-- Ensure anon roles don't have excessive permissions
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;

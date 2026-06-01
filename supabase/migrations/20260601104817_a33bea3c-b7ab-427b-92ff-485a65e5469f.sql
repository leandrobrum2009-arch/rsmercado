-- Ensure the authenticated role can use the public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Re-grant permissions just in case
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

-- Add a comment to trigger schema cache reload in some environments
COMMENT ON TABLE public.suppliers IS 'List of project suppliers';

-- Explicitly notify PostgREST to reload schema if supported
NOTIFY pgrst, 'reload schema';

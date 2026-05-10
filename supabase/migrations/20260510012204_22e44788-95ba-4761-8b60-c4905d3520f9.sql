REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO postgres, service_role;

REVOKE ALL ON FUNCTION public.is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

DROP POLICY IF EXISTS "Anyone can register site visits" ON public.site_visits;
CREATE POLICY "Anyone can register site visits"
ON public.site_visits
FOR INSERT
TO anon, authenticated
WITH CHECK (path IS NOT NULL AND btrim(path) <> '');
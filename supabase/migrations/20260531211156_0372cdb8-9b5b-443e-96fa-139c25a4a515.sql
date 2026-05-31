CREATE OR REPLACE FUNCTION public.reload_schema_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can reload schema
  IF NOT public.is_admin() AND (auth.jwt() ->> 'email' != 'leandrobrum2009@gmail.com') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores podem recarregar o esquema.';
  END IF;
  
  NOTIFY pgrst, 'reload schema';
END;
$$;

GRANT EXECUTE ON FUNCTION public.reload_schema_cache() TO authenticated;

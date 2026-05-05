-- Secure store_settings table
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read non-sensitive settings
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.store_settings;
CREATE POLICY "Public settings are viewable by everyone" ON public.store_settings 
FOR SELECT USING (
    key NOT IN ('whatsapp_config', 'api_secrets', 'admin_config')
);

-- Allow admins to read everything
DROP POLICY IF EXISTS "Admins can manage settings" ON public.store_settings;
CREATE POLICY "Admins can manage settings" ON public.store_settings 
FOR ALL USING (
    public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- Allow authenticated users to read specific config if they need it (e.g. for basic store info)
-- This is already covered by the "Public settings" policy for non-sensitive keys.

-- IMPORT LOGS FOR AUDITING
CREATE TABLE IF NOT EXISTS public.import_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID DEFAULT auth.uid(),
    category TEXT,
    total_attempted INTEGER,
    successful_count INTEGER,
    duplicate_count INTEGER,
    error_count INTEGER,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all import logs" 
ON public.import_logs FOR SELECT 
TO authenticated
USING ( public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );

CREATE POLICY "Admins can insert import logs" 
ON public.import_logs FOR INSERT 
TO authenticated
WITH CHECK ( public.is_admin() OR (auth.jwt() ->> 'email') = 'leandrobrum2009@gmail.com' );

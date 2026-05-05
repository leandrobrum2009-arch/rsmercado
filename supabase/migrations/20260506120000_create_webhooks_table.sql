-- Create Webhooks table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    url TEXT NOT NULL,
    event_type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- Policies for Admins
DROP POLICY IF EXISTS "Admins can manage webhooks" ON public.webhooks;
CREATE POLICY "Admins can manage webhooks" ON public.webhooks 
FOR ALL USING (
    public.is_admin() OR (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com')
);

-- Index
CREATE INDEX IF NOT EXISTS idx_webhooks_event_type ON public.webhooks(event_type);

-- Permissions
GRANT ALL ON public.webhooks TO authenticated;
GRANT SELECT ON public.webhooks TO anon;

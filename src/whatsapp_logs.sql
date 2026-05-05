 -- Table to track sent messages and prevent duplicates
 CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     phone TEXT NOT NULL,
     message_hash TEXT NOT NULL, -- MD5 of message to identify content
     campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
     sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- Index for fast duplicate checking
 CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone_hash ON public.whatsapp_logs(phone, message_hash);
 
 -- Enable RLS
 ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;
 
 -- Policies
 CREATE POLICY "Admins can view logs" ON public.whatsapp_logs
     FOR SELECT USING (public.is_admin());
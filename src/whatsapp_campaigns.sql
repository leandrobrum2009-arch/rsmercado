 -- Table for storing WhatsApp campaigns (bulk sends and scheduled)
 CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     message TEXT NOT NULL,
     target_audience TEXT DEFAULT 'all', -- 'all', 'loyalty_only', etc.
     status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'scheduled'
     scheduled_for TIMESTAMP WITH TIME ZONE,
     sent_count INTEGER DEFAULT 0,
     total_recipients INTEGER DEFAULT 0,
     error_log TEXT,
     created_by UUID REFERENCES auth.users(id),
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- Enable RLS
 ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
 
 -- Policies
 CREATE POLICY "Admins can manage campaigns" ON public.whatsapp_campaigns
     FOR ALL USING (public.is_admin());
 
 -- Note: For actual execution of scheduled campaigns, an Edge Function with a cron job
 -- would be required to poll this table for 'scheduled' status where scheduled_for <= NOW().
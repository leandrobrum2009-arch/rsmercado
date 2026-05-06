-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create store_alerts table
CREATE TABLE IF NOT EXISTS public.store_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WhatsApp related tables
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    target_segment TEXT DEFAULT 'all',
    status TEXT DEFAULT 'sent', -- 'sent', 'scheduled'
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone TEXT NOT NULL,
    message_text TEXT NOT NULL,
    message_hash TEXT NOT NULL,
    campaign_id UUID REFERENCES public.whatsapp_campaigns(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for store_alerts
DROP POLICY IF EXISTS "Everyone can see active alerts" ON public.store_alerts;
CREATE POLICY "Everyone can see active alerts" ON public.store_alerts
    FOR SELECT USING (is_active = TRUE);

DROP POLICY IF EXISTS "Admins can manage alerts" ON public.store_alerts;
CREATE POLICY "Admins can manage alerts" ON public.store_alerts
    ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Policies for WhatsApp tables
DROP POLICY IF EXISTS "Admins manage whatsapp templates" ON public.whatsapp_templates;
CREATE POLICY "Admins manage whatsapp templates" ON public.whatsapp_templates
    ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins manage whatsapp campaigns" ON public.whatsapp_campaigns;
CREATE POLICY "Admins manage whatsapp campaigns" ON public.whatsapp_campaigns
    ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

DROP POLICY IF EXISTS "Admins view whatsapp logs" ON public.whatsapp_logs;
CREATE POLICY "Admins view whatsapp logs" ON public.whatsapp_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- RPC function to notify all users
CREATE OR REPLACE FUNCTION public.notify_all_users(message TEXT, title TEXT, type TEXT DEFAULT 'promo')
RETURNS void AS 18090
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can send notifications to all users';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT p.id, notify_all_users.title, notify_all_users.message, notify_all_users.type 
    FROM public.profiles p;
END;
18090 LANGUAGE plpgsql SECURITY DEFINER;

-- Notify postgrest to reload schema
NOTIFY pgrst, 'reload schema';

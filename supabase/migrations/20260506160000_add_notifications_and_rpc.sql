-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
DROP POLICY IF EXISTS "Users can see own notifications" ON public.notifications;
CREATE POLICY "Users can see own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- RPC function to notify all users
CREATE OR REPLACE FUNCTION public.notify_all_users(message TEXT, title TEXT, type TEXT DEFAULT 'promo')
RETURNS void AS 17354
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT p.id, notify_all_users.title, notify_all_users.message, notify_all_users.type 
    FROM public.profiles p;
END;
17354 LANGUAGE plpgsql SECURITY DEFINER;

-- Notify postgrest to reload schema
NOTIFY pgrst, 'reload schema';

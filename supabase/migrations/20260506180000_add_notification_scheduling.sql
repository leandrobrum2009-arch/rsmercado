-- Add scheduled_at to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Update notify_all_users to handle scheduling
CREATE OR REPLACE FUNCTION public.notify_all_users(message TEXT, title TEXT, type TEXT DEFAULT 'promo', scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS void AS $$
BEGIN
    -- Check if the caller is an admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_admin = true
    ) THEN
        RAISE EXCEPTION 'Only admins can send notifications to all users';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, scheduled_at)
    SELECT p.id, notify_all_users.title, notify_all_users.message, notify_all_users.type, notify_all_users.scheduled_at
    FROM public.profiles p;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Notify postgrest to reload schema
NOTIFY pgrst, 'reload schema';

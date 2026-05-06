-- 1. Secure profiles table
-- Prevent users from updating their own is_admin status
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND 
        (is_admin = (SELECT is_admin FROM public.profiles WHERE id = auth.uid()))
    );

-- 2. Secure store_settings table
-- Exclude more sensitive keys from public read access
DROP POLICY IF EXISTS "Public settings are viewable by everyone" ON public.store_settings;
CREATE POLICY "Public settings are viewable by everyone" ON public.store_settings 
FOR SELECT USING (
    key NOT IN ('whatsapp_config', 'api_secrets', 'admin_config', 'admin_setup_secret', 'webhook_secrets')
);

-- 3. Create and secure push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT,
    auth TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Admins view all push subscriptions" ON public.push_subscriptions
    FOR SELECT USING (public.is_admin());

-- 4. Fix typo in notify_all_users migration (if it exists)
CREATE OR REPLACE FUNCTION public.notify_all_users(message TEXT, title TEXT, type TEXT DEFAULT 'promo')
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Secure edge function calls (conceptually, we check for JWT in the function itself)

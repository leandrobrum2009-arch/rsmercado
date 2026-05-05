 -- Table for storing Web Push subscriptions
 CREATE TABLE IF NOT EXISTS public.push_subscriptions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
     endpoint TEXT NOT NULL,
     p256dh TEXT NOT NULL,
     auth TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, endpoint)
 );
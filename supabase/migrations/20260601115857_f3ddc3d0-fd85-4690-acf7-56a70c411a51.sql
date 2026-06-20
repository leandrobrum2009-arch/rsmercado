-- @security-legacy: superseded by later hardening migrations
-- Create app_feedback table
CREATE TABLE IF NOT EXISTS public.app_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    rating INTEGER,
    comment TEXT,
    page_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    related_id UUID,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.app_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT ALL ON public.app_feedback TO authenticated, service_role;
GRANT ALL ON public.notifications TO authenticated, service_role;

-- Policies for feedback
CREATE POLICY "Anyone can insert feedback" ON public.app_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view feedback" ON public.app_feedback FOR SELECT USING (public.is_admin());

-- Policies for notifications
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage notifications" ON public.notifications FOR ALL USING (public.is_admin());

-- Reload schema
NOTIFY pgrst, 'reload schema';

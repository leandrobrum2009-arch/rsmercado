CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL DEFAULT 'product',
    reward_data JSONB DEFAULT '{}',
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read rewards" ON public.loyalty_rewards;
CREATE POLICY "Public read rewards" ON public.loyalty_rewards FOR SELECT USING (active = true);
DROP POLICY IF EXISTS "Admin manage rewards" ON public.loyalty_rewards;
CREATE POLICY "Admin manage rewards" ON public.loyalty_rewards FOR ALL USING (public.is_admin());

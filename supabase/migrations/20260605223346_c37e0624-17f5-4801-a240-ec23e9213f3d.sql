-- 1. Create user_recipes table (for favorites/bookmarks)
CREATE TABLE IF NOT EXISTS public.user_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, recipe_id)
);

-- 2. Create weekly_challenges table
CREATE TABLE IF NOT EXISTS public.weekly_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points_reward INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    end_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create user_challenge_progress table
CREATE TABLE IF NOT EXISTS public.user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'in_progress', -- 'in_progress', 'completed', 'claimed'
    progress_data JSONB DEFAULT '{}'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, challenge_id)
);

-- 4. Enable RLS
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenge_progress ENABLE ROW LEVEL SECURITY;

-- 5. Policies for user_recipes
CREATE POLICY "Users can manage their own favorite recipes" 
ON public.user_recipes FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 6. Policies for weekly_challenges
CREATE POLICY "Anyone can view active challenges" 
ON public.weekly_challenges FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage challenges" 
ON public.weekly_challenges FOR ALL 
USING (public.is_admin());

-- 7. Policies for user_challenge_progress
CREATE POLICY "Users can manage their own progress" 
ON public.user_challenge_progress FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

-- 8. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_recipes TO authenticated;
GRANT SELECT ON public.weekly_challenges TO anon, authenticated;
GRANT ALL ON public.weekly_challenges TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.user_challenge_progress TO authenticated;
GRANT ALL ON public.user_challenge_progress TO service_role;
GRANT ALL ON public.user_recipes TO service_role;
GRANT ALL ON public.user_challenge_progress TO service_role;
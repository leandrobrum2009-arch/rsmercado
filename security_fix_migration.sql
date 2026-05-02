 -- Security Fix: Restrict comment insertion to the authenticated user's own ID
 DROP POLICY IF EXISTS "Authenticated users can insert comments" ON public.comments;
 CREATE POLICY "Users can insert their own comments" 
 ON public.comments FOR INSERT 
 TO authenticated 
 WITH CHECK (auth.uid() = user_id);
 
 -- Security Fix: Restrict recipe creation to the authenticated user's own ID
 DROP POLICY IF EXISTS "Users can create their own recipes" ON public.recipes;
 CREATE POLICY "Users can create their own recipes" 
 ON public.recipes FOR INSERT 
 TO authenticated 
 WITH CHECK (auth.uid() = author_id);
 
 -- Ensure author_id in recipes defaults to the current user
 ALTER TABLE public.recipes ALTER COLUMN author_id SET DEFAULT auth.uid();
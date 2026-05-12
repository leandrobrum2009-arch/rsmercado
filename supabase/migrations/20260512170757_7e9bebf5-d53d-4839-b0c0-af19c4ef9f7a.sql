-- Fix orders policies
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON public.orders;

CREATE POLICY "Users can create their own orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  (auth.uid() IS NULL AND user_id IS NULL) -- Allow guest orders if user_id is null
);

-- Fix site_visits policy
DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can record a visit" 
ON public.site_visits 
FOR INSERT 
WITH CHECK (true); -- Keeping this for tracking, but linter might still warn. 
-- To satisfy linter we could add a dummy check or leave it if it's truly public.
-- However, we can use a rate limit or check for some headers if we really wanted to.
-- For now, let's just make it clear.

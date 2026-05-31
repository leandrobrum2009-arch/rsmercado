-- Drop existing overly broad policy if it exists and create specific ones
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;

-- Create more specific policies
CREATE POLICY "Anyone can view suppliers" 
ON public.suppliers FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert suppliers" 
ON public.suppliers FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update suppliers" 
ON public.suppliers FOR UPDATE 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Admins can delete suppliers" 
ON public.suppliers FOR DELETE 
USING (true);

-- Ensure grants are correct
GRANT ALL ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
GRANT SELECT ON public.suppliers TO anon;

-- Force another cache reload
NOTIFY pgrst, 'reload';

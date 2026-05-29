-- Update the products management policy to be more robust
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR
  public.has_role(auth.uid(), 'admin')
);

-- Do the same for categories just in case
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR
  public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (auth.jwt() ->> 'email' = 'leandrobrum2009@gmail.com') OR
  public.has_role(auth.uid(), 'admin')
);

-- Tighten security policies for suppliers
DROP POLICY IF EXISTS "Authenticated users can manage suppliers" ON public.suppliers;
CREATE POLICY "Admins can manage suppliers" 
ON public.suppliers 
FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tighten security policies for purchase orders
DROP POLICY IF EXISTS "Authenticated users can manage purchase orders" ON public.purchase_orders;
CREATE POLICY "Admins can manage purchase orders" 
ON public.purchase_orders 
FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tighten security policies for purchase order items
DROP POLICY IF EXISTS "Authenticated users can manage purchase order items" ON public.purchase_order_items;
CREATE POLICY "Admins can manage purchase order items" 
ON public.purchase_order_items 
FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tighten security policies for supplier brands
DROP POLICY IF EXISTS "Authenticated users can manage supplier brands" ON public.supplier_brands;
CREATE POLICY "Admins can manage supplier brands" 
ON public.supplier_brands 
FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Tighten security policies for supplier products
DROP POLICY IF EXISTS "Authenticated users can manage supplier products" ON public.supplier_products;
CREATE POLICY "Admins can manage supplier products" 
ON public.supplier_products 
FOR ALL 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Ensure PostgREST cache is refreshed
NOTIFY pgrst, 'reload schema';

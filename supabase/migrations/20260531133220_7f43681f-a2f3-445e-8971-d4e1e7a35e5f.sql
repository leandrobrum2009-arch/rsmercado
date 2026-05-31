-- 1. Secure Functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- 2. Secure Suppliers Table
DROP POLICY IF EXISTS "Anyone can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can insert suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can update suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can delete suppliers" ON public.suppliers;

CREATE POLICY "Authenticated users can view suppliers" 
ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage suppliers" 
ON public.suppliers FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Secure Supplier Products Table
DROP POLICY IF EXISTS "Anyone can view supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Admins can manage supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Admins can manage supplier_products" ON public.supplier_products;

CREATE POLICY "Authenticated users can view supplier products" 
ON public.supplier_products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage supplier products" 
ON public.supplier_products FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Secure Supplier Brands Table
DROP POLICY IF EXISTS "Admins can manage supplier brands" ON public.supplier_brands;
DROP POLICY IF EXISTS "Admins can manage supplier_brands" ON public.supplier_brands;

CREATE POLICY "Authenticated users can view supplier brands" 
ON public.supplier_brands FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage supplier brands" 
ON public.supplier_brands FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Secure Purchase Orders Table
DROP POLICY IF EXISTS "Admins can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admins can manage purchase_orders" ON public.purchase_orders;

CREATE POLICY "Authenticated users can view purchase orders" 
ON public.purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage purchase orders" 
ON public.purchase_orders FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. Secure Purchase Order Items Table
DROP POLICY IF EXISTS "Admins can manage purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admins can manage purchase_order_items" ON public.purchase_order_items;

CREATE POLICY "Authenticated users can view purchase order items" 
ON public.purchase_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage purchase order items" 
ON public.purchase_order_items FOR ALL TO authenticated 
USING (public.has_role(auth.uid(), 'admin')) 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

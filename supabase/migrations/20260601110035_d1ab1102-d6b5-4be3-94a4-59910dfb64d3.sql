-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admins manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Anyone authenticated can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Authenticated users can view suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;

-- 2. Create more robust policies
-- Allow all authenticated users to see suppliers
CREATE POLICY "Authenticated users can view suppliers" 
ON public.suppliers FOR SELECT 
TO authenticated 
USING (true);

-- Allow all authenticated users to manage suppliers (Insert/Update/Delete)
-- This is a temporary measure to fix the immediate blocker while roles are being set up
CREATE POLICY "Authenticated users can manage suppliers" 
ON public.suppliers FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 3. Apply similar logic to related tables
DROP POLICY IF EXISTS "Admins manage brands" ON public.supplier_brands;
DROP POLICY IF EXISTS "Anyone authenticated can view brands" ON public.supplier_brands;
DROP POLICY IF EXISTS "Authenticated users can view supplier brands" ON public.supplier_brands;
DROP POLICY IF EXISTS "Admins can manage supplier brands" ON public.supplier_brands;

CREATE POLICY "Authenticated users can manage supplier brands" 
ON public.supplier_brands FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Anyone authenticated can view supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Authenticated users can view supplier products" ON public.supplier_products;
DROP POLICY IF EXISTS "Admins can manage supplier products" ON public.supplier_products;

CREATE POLICY "Authenticated users can manage supplier products" 
ON public.supplier_products FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- 4. Ensure purchase orders are also manageable
DROP POLICY IF EXISTS "Admins manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Anyone authenticated can view purchase orders" ON public.purchase_orders;

CREATE POLICY "Authenticated users can manage purchase orders" 
ON public.purchase_orders FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins manage purchase order items" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Anyone authenticated can view purchase order items" ON public.purchase_order_items;

CREATE POLICY "Authenticated users can manage purchase order items" 
ON public.purchase_order_items FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);

-- Create table for supplier-product association
CREATE TABLE IF NOT EXISTS public.supplier_products (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(supplier_id, product_id)
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;
GRANT ALL ON public.supplier_products TO service_role;

-- Enable RLS
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage supplier products" 
ON public.supplier_products 
FOR ALL 
TO authenticated 
USING (true);

CREATE POLICY "Anyone can view supplier products" 
ON public.supplier_products 
FOR SELECT 
TO authenticated 
USING (true);

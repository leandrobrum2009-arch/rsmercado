CREATE OR REPLACE FUNCTION public.reduce_stock(p_product_id UUID, p_quantity NUMERIC)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - p_quantity)
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
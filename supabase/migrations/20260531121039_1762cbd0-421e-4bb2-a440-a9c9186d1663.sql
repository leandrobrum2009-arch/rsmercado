-- Grant permissions to authenticated and service_role for the new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_products TO authenticated;
GRANT ALL ON public.supplier_products TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplier_brands TO authenticated;
GRANT ALL ON public.supplier_brands TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_orders TO authenticated;
GRANT ALL ON public.purchase_orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_order_items TO authenticated;
GRANT ALL ON public.purchase_order_items TO service_role;

-- Ensure sequences are also granted if they exist (though UUIDs are likely used)
-- If these tables use serial IDs, we'd need to grant usage on sequences.
-- Checking suppliers table structure just in case.

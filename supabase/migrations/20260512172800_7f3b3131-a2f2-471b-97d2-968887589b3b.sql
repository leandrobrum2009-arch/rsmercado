-- Refine stock management trigger
CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- 1. Reserve stock when order is created (status 'pending' or 'approved')
    -- OR when status changes from something that didn't reserve stock to something that does
    IF (TG_OP = 'INSERT' AND (NEW.status = 'pending' OR NEW.status = 'approved')) OR
       (TG_OP = 'UPDATE' AND (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending' OR OLD.status = 'cancelled'))) THEN
        
        -- If it's an update from cancelled, we already reverted stock, so we need to decrease again.
        -- If it's an insert or update from pending to approved, we only do it once.
        -- Let's simplify: only decrease on INSERT if status is pending/approved, 
        -- and on UPDATE if status changes TO approved FROM pending/cancelled (if not already done).
        
        IF (TG_OP = 'INSERT') THEN
            FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
                UPDATE public.products 
                SET stock = GREATEST(0, stock - item.quantity)
                WHERE id = item.product_id;
            END LOOP;
        ELSIF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'cancelled') THEN
             -- Re-decrease if it was cancelled before
            FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
                UPDATE public.products 
                SET stock = GREATEST(0, stock - item.quantity)
                WHERE id = item.product_id;
            END LOOP;
        END IF;
    END IF;

    -- 2. Revert stock when order is cancelled
    IF (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status != 'cancelled') THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = stock + item.quantity
            WHERE id = item.product_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth;

-- Re-apply trigger to both INSERT and UPDATE
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON public.orders;
CREATE TRIGGER trigger_update_stock_on_order
    AFTER INSERT OR UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_order();

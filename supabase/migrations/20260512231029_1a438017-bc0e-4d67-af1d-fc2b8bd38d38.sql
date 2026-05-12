CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
BEGIN
    -- 1. Decrease stock when moving TO 'approved'
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved')) THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = GREATEST(0, stock - item.quantity)
            WHERE id = item.product_id;
        END LOOP;
    END IF;

    -- 2. Restore stock when moving FROM 'approved' TO 'cancelled' (or anything else that isn't approved)
    IF (OLD.status = 'approved' AND NEW.status != 'approved') THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = stock + item.quantity
            WHERE id = item.product_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Função para diminuir ou reverter estoque baseado no status do pedido
CREATE OR REPLACE FUNCTION public.update_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
    item RECORD;
BEGIN
    -- 1. Diminuir estoque quando o pedido é aprovado (somente se era pendente/novo)
    IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending')) THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = GREATEST(0, stock - item.quantity)
            WHERE id = item.product_id;
        END LOOP;
    END IF;

    -- 2. Reverter estoque quando o pedido é cancelado (somente se já estava aprovado ou posterior)
    IF (NEW.status = 'cancelled' AND OLD.status NOT IN ('pending', 'cancelled')) THEN
        FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
            UPDATE public.products 
            SET stock = stock + item.quantity
            WHERE id = item.product_id;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar gatilho para estoque
DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON public.orders;
CREATE TRIGGER trigger_update_stock_on_order
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_stock_on_order();

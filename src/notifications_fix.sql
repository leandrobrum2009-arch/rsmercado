 -- 1. Trigger for Order Status changes (Improved)
 CREATE OR REPLACE FUNCTION notify_order_status_change()
 RETURNS TRIGGER AS $$
 BEGIN
     IF (OLD.status IS NULL OR OLD.status != NEW.status) THEN
         INSERT INTO public.notifications (user_id, title, message, type, related_id)
         VALUES (
             NEW.user_id,
             CASE 
                 WHEN NEW.status = 'delivered' THEN '✅ Pedido Entregue!'
                 WHEN NEW.status = 'out_for_delivery' THEN '🛵 Pedido a Caminho!'
                 WHEN NEW.status = 'approved' THEN '👍 Pedido Aprovado'
                 ELSE '📦 Status do Pedido Atualizado'
             END,
             CASE 
                 WHEN NEW.status = 'delivered' THEN 'Seu pedido #' || substring(NEW.id::text, 1, 8) || ' foi entregue. Bom proveito!'
                 WHEN NEW.status = 'out_for_delivery' THEN 'O entregador já saiu com seu pedido #' || substring(NEW.id::text, 1, 8) || '.'
                 WHEN NEW.status = 'approved' THEN 'Recebemos seu pagamento! Estamos preparando seu pedido #' || substring(NEW.id::text, 1, 8) || '.'
                 ELSE 'O seu pedido #' || substring(NEW.id::text, 1, 8) || ' mudou para: ' || NEW.status
             END,
             'order_status',
             NEW.id
         );
     END IF;
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;
 
 -- 2. Trigger for New Products
 CREATE OR REPLACE FUNCTION notify_new_product()
 RETURNS TRIGGER AS $$
 BEGIN
     -- Notify all users for every new product
     INSERT INTO public.notifications (user_id, title, message, type)
     SELECT id, '✨ Novo Produto Chegou!', 'Acabamos de adicionar ' || NEW.name || ' ao nosso catálogo. Confira as novidades!', 'promo' 
     FROM public.profiles;
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;
 
 DROP TRIGGER IF EXISTS on_product_created ON public.products;
 CREATE TRIGGER on_product_created
     AFTER INSERT ON public.products
     FOR EACH ROW
     EXECUTE FUNCTION notify_new_product();
 
 -- 3. Trigger for New Flyers
 CREATE OR REPLACE FUNCTION notify_new_flyer()
 RETURNS TRIGGER AS $$
 BEGIN
     INSERT INTO public.notifications (user_id, title, message, type)
     SELECT id, '🔥 Encarte do Dia Disponível!', 'Confira as ofertas imperdíveis no nosso novo encarte: ' || NEW.title, 'promo'
     FROM public.profiles;
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;
 
 DROP TRIGGER IF EXISTS on_flyer_created ON public.flyers;
 CREATE TRIGGER on_flyer_created
     AFTER INSERT ON public.flyers
     FOR EACH ROW
     EXECUTE FUNCTION notify_new_flyer();
 
 -- 4. Fix for is_read vs read column mismatch
 DO $$
 BEGIN
     IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
         ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;
     END IF;
 END $$;
 
 -- 5. Re-apply order status trigger
 DROP TRIGGER IF EXISTS on_order_status_update ON public.orders;
 CREATE TRIGGER on_order_status_update
     AFTER UPDATE ON public.orders
     FOR EACH ROW
     EXECUTE FUNCTION notify_order_status_change();
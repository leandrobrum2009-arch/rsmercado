-- 1. Fix notifications table structure
DO $$ 
BEGIN 
    -- Add related_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'related_id') THEN
        ALTER TABLE public.notifications ADD COLUMN related_id UUID;
    END IF;

    -- Add scheduled_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'scheduled_at') THEN
        ALTER TABLE public.notifications ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Handle potential 'read' vs 'is_read' column mismatch
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') AND 
       NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications RENAME COLUMN "read" TO is_read;
    END IF;
END $$;

-- 2. Update notify_order_status_change function
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Só envia notificação se houver um usuário associado e o status mudou
    IF (NEW.user_id IS NOT NULL) AND (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            NEW.user_id,
            'Status do Pedido Atualizado',
            'O seu pedido #' || substring(NEW.id::text, 1, 8) || ' mudou para: ' || 
            CASE NEW.status
                WHEN 'pending' THEN 'Pendente'
                WHEN 'approved' THEN 'Aprovado'
                WHEN 'collecting' THEN 'Em Coleta'
                WHEN 'collected' THEN 'Coletado'
                WHEN 'waiting_courier' THEN 'Aguardando Entregador'
                WHEN 'out_for_delivery' THEN 'Saiu para Entrega'
                WHEN 'delivered' THEN 'Entregue'
                WHEN 'cancelled' THEN 'Cancelado'
                ELSE NEW.status
            END,
            'order_status',
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Update notify_all_users function
CREATE OR REPLACE FUNCTION public.notify_all_users(p_title TEXT, p_message TEXT, p_type TEXT DEFAULT 'info', p_scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NULL)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, auth
AS $$
BEGIN
    -- Security check: only admins can call this
    IF NOT public.is_admin() AND (auth.jwt() ->> 'email' != 'leandrobrum2009@gmail.com') THEN
        RAISE EXCEPTION 'Acesso negado: apenas administradores podem enviar notificações para todos.';
    END IF;

    INSERT INTO public.notifications (user_id, title, message, type, scheduled_at)
    SELECT id, p_title, p_message, p_type, p_scheduled_at FROM auth.users;
END;
$$;

-- 4. Re-apply trigger to ensure it's using the latest function
DROP TRIGGER IF EXISTS on_order_status_update ON public.orders;
CREATE TRIGGER on_order_status_update
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_status_change();

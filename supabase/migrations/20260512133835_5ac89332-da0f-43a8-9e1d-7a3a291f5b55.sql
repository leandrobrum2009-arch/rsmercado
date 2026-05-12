-- 1. REPARAR TABELA DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    related_id UUID,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Garantir colunas se a tabela já existia
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS related_id UUID;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'info';

-- 2. REPARAR FUNÇÕES DE TRIGGER
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
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
                ELSE COALESCE(NEW.status, 'Desconhecido')
            END,
            'order_status',
            NEW.id
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Silently fail to not block order update, but log it if possible
    -- In a real production app we might want to log this to a separate table
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_order_received()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF (NEW.user_id IS NOT NULL) THEN
        INSERT INTO public.notifications (user_id, title, message, type, related_id)
        VALUES (
            NEW.user_id,
            '✅ Pedido Recebido!',
            'Seu pedido #' || substring(NEW.id::text, 1, 8) || ' foi recebido e está aguardando aprovação.',
            'order_status',
            NEW.id
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$;

-- 3. RE-VINCULAR TRIGGERS
DROP TRIGGER IF EXISTS on_order_status_update ON public.orders;
CREATE TRIGGER on_order_status_update
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_status_change();

DROP TRIGGER IF EXISTS on_order_inserted ON public.orders;
CREATE TRIGGER on_order_inserted
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_received();

-- 4. POLÍTICAS DE SEGURANÇA
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" 
ON public.notifications 
FOR ALL 
USING (public.is_admin());

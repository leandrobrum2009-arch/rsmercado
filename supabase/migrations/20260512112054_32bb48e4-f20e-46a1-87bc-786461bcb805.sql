-- 1. Tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tabela de alertas globais
CREATE TABLE IF NOT EXISTS public.store_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    target_url TEXT,
    duration_seconds INTEGER DEFAULT 10,
    shimmer_speed_seconds DECIMAL(4,1) DEFAULT 2.0,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Tabela de inscrições push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, endpoint)
);

-- 4. Tabela de visitas ao site
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    path TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins manage notifications" ON public.notifications;
CREATE POLICY "Admins manage notifications" ON public.notifications 
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Everyone can see active alerts" ON public.store_alerts;
CREATE POLICY "Everyone can see active alerts" ON public.store_alerts
FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));

DROP POLICY IF EXISTS "Admins can manage alerts" ON public.store_alerts;
CREATE POLICY "Admins can manage alerts" ON public.store_alerts
FOR ALL USING (public.is_admin());

DROP POLICY IF EXISTS "Users can manage own subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can insert visits" ON public.site_visits;
CREATE POLICY "Anyone can insert visits" ON public.site_visits 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view site visits" ON public.site_visits;
CREATE POLICY "Admins can view site visits" ON public.site_visits 
FOR SELECT USING (public.is_admin());

-- 7. Corrigir Gatilho de Status do Pedido (Adicionar tratamento para user_id nulo)
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Só envia notificação se houver um usuário associado
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-vincular o gatilho
DROP TRIGGER IF EXISTS on_order_status_update ON public.orders;
CREATE TRIGGER on_order_status_update
    AFTER UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_status_change();

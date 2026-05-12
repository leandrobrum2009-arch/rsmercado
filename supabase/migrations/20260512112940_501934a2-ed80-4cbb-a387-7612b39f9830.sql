-- 1. Criar tabela de encartes (flyers)
CREATE TABLE IF NOT EXISTS public.flyers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    image_url TEXT,
    pdf_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    is_template BOOLEAN DEFAULT FALSE,
    template_name TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.flyers ENABLE ROW LEVEL SECURITY;

-- Políticas para flyers
DROP POLICY IF EXISTS "Anyone can view flyers" ON public.flyers;
CREATE POLICY "Anyone can view flyers" ON public.flyers FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin manage flyers" ON public.flyers;
CREATE POLICY "Admin manage flyers" ON public.flyers FOR ALL USING (public.is_admin());

-- 2. Gatilho para Pedido Recebido (INSERT)
CREATE OR REPLACE FUNCTION public.notify_order_received()
RETURNS TRIGGER AS $$
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_order_inserted ON public.orders;
CREATE TRIGGER on_order_inserted
    AFTER INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_order_received();

-- 3. Melhorar Gatilho de Novo Produto (evitar spam se inserido em massa)
-- Vamos apenas notificar se for um produto individual e não durante importação em massa 
-- (Poderia ser controlado por uma flag, mas por enquanto vamos manter simples)
CREATE OR REPLACE FUNCTION public.notify_new_product()
RETURNS TRIGGER AS $$
BEGIN
    -- Notifica apenas os últimos 100 usuários ativos para não sobrecarregar
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, '✨ Novo Produto Chegou!', 'Acabamos de adicionar ' || NEW.name || ' ao nosso catálogo. Confira!', 'promo' 
    FROM public.profiles
    ORDER BY updated_at DESC
    LIMIT 100;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Melhorar Gatilho de Encarte
CREATE OR REPLACE FUNCTION public.notify_new_flyer()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT id, '🔥 Novo Encarte Disponível!', 'Confira as ofertas no encarte: ' || NEW.title, 'promo'
    FROM public.profiles
    ORDER BY updated_at DESC
    LIMIT 500; -- Limite para não explodir em notificações
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

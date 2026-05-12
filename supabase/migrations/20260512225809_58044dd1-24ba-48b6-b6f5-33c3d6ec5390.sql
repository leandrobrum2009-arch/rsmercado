-- 1. Create sales_notes table (Nota de Venda)
CREATE TABLE IF NOT EXISTS public.sales_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID REFERENCES public.lots(id),
    user_id UUID REFERENCES auth.users(id),
    auction_id UUID REFERENCES public.auctions(id),
    amount NUMERIC NOT NULL,
    status TEXT DEFAULT 'pending', 
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sales notes" ON public.sales_notes;
CREATE POLICY "Users can view their own sales notes" ON public.sales_notes
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage all sales notes" ON public.sales_notes;
CREATE POLICY "Admins can manage all sales notes" ON public.sales_notes
    FOR ALL USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- 2. Trigger to generate sales note automatically
CREATE OR REPLACE FUNCTION public.generate_sales_note_on_lot_close()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.status::text IN ('closed', 'sold', 'finalizado', 'vendido')) AND NEW.winner_id IS NOT NULL THEN
        INSERT INTO public.sales_notes (lot_id, user_id, auction_id, amount, content)
        VALUES (
            NEW.id, 
            NEW.winner_id, 
            NEW.auction_id,
            NEW.sold_price,
            'Nota de Venda para o Lote ' || NEW.lot_number || ' - ' || NEW.title || '. Valor: R$ ' || NEW.sold_price
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_lot_closed_sales_note ON public.lots;
CREATE TRIGGER on_lot_closed_sales_note
    AFTER UPDATE OF status ON public.lots
    FOR EACH ROW
    EXECUTE FUNCTION public.generate_sales_note_on_lot_close();

-- 3. Fraud Detection Logging Table
CREATE TABLE IF NOT EXISTS public.fraud_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    event_type TEXT, 
    details JSONB,
    severity TEXT DEFAULT 'low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fraud_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view fraud logs" ON public.fraud_logs;
CREATE POLICY "Admins can view fraud logs" ON public.fraud_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- 4. Update place_bid to log suspicious activity
CREATE OR REPLACE FUNCTION public.place_bid(p_lot_id UUID, p_amount NUMERIC)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_auction_id UUID;
    v_current_price NUMERIC;
    v_increment NUMERIC;
    v_end_date TIMESTAMP WITH TIME ZONE;
    v_is_registered BOOLEAN;
    v_last_bid_time TIMESTAMP WITH TIME ZONE;
    v_new_end_date TIMESTAMP WITH TIME ZONE;
    v_lot_status TEXT;
    v_auction_status TEXT;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Usuário não autenticado');
    END IF;

    -- Lock the lot row to prevent race conditions
    SELECT l.auction_id, COALESCE(l.sold_price, l.minimum_bid, 0), l.increment_value, a.end_date, l.status::text, a.status::text
    INTO v_auction_id, v_current_price, v_increment, v_end_date, v_lot_status, v_auction_status
    FROM public.lots l
    JOIN public.auctions a ON l.auction_id = a.id
    WHERE l.id = p_lot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'message', 'Lote não encontrado');
    END IF;

    -- Basic status checks
    IF v_auction_status NOT IN ('active', 'ativo', 'ongoing') THEN
        RETURN json_build_object('success', false, 'message', 'Leilão não está ativo');
    END IF;

    IF v_lot_status NOT IN ('open', 'aberto', 'active') THEN
        RETURN json_build_object('success', false, 'message', 'Lote não está aberto para lances');
    END IF;

    IF v_end_date < now() THEN
        RETURN json_build_object('success', false, 'message', 'O leilão já encerrou');
    END IF;

    -- Registration and Caução check
    SELECT EXISTS (
        SELECT 1 FROM public.auction_registrations
        WHERE auction_id = v_auction_id 
        AND user_id = v_user_id 
        AND (status = 'approved' OR caucao_paid = true)
    ) INTO v_is_registered;

    IF NOT v_is_registered THEN
        INSERT INTO public.fraud_logs (user_id, event_type, details, severity)
        VALUES (v_user_id, 'suspicious_bid_attempt', jsonb_build_object('lot_id', p_lot_id, 'reason', 'Not registered/paid'), 'medium');
        RETURN json_build_object('success', false, 'message', 'Participação não autorizada. Verifique sua caução/cadastro.');
    END IF;

    -- Rate limiting
    SELECT created_at INTO v_last_bid_time
    FROM public.bids
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_bid_time IS NOT NULL AND (now() - v_last_bid_time) < interval '1 second' THEN
        INSERT INTO public.fraud_logs (user_id, event_type, details, severity)
        VALUES (v_user_id, 'rate_limit_hit', jsonb_build_object('lot_id', p_lot_id), 'low');
        RETURN json_build_object('success', false, 'message', 'Muitos lances em pouco tempo. Aguarde um momento.');
    END IF;

    -- Validate bid amount
    IF p_amount < (v_current_price + COALESCE(v_increment, 0)) THEN
        RETURN json_build_object('success', false, 'message', 'O valor do lance deve respeitar o incremento mínimo');
    END IF;

    -- Anti-sniper
    v_new_end_date := v_end_date;
    IF (v_end_date - now()) < interval '30 seconds' THEN
        UPDATE public.auctions SET end_date = end_date + interval '60 seconds'
        WHERE id = v_auction_id;
        v_new_end_date := v_end_date + interval '60 seconds';
    END IF;

    -- Record the bid
    INSERT INTO public.bids (lot_id, user_id, amount, created_at)
    VALUES (p_lot_id, v_user_id, p_amount, now());

    -- Update the lot
    UPDATE public.lots SET 
        sold_price = p_amount,
        winner_id = v_user_id,
        updated_at = now()
    WHERE id = p_lot_id;

    RETURN json_build_object(
        'success', true, 
        'amount', p_amount, 
        'end_date', v_new_end_date,
        'message', 'Lance registrado com sucesso!'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

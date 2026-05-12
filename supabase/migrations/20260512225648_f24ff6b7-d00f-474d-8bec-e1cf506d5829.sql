-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON public.audit_logs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    ));

-- 2. Audit trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (
        TG_TABLE_NAME,
        CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
        TG_OP,
        CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
        auth.uid()
    );
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply audit trigger to sensitive tables
DROP TRIGGER IF EXISTS audit_auctions_trigger ON public.auctions;
CREATE TRIGGER audit_auctions_trigger AFTER INSERT OR UPDATE OR DELETE ON public.auctions FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_lots_trigger ON public.lots;
CREATE TRIGGER audit_lots_trigger AFTER INSERT OR UPDATE OR DELETE ON public.lots FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

DROP TRIGGER IF EXISTS audit_bids_trigger ON public.bids;
CREATE TRIGGER audit_bids_trigger AFTER INSERT OR UPDATE OR DELETE ON public.bids FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 3. Automatic contract generation trigger
CREATE OR REPLACE FUNCTION public.generate_contract_on_lot_close()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if status changed to 'closed' or 'sold' and there is a winner
    -- Note: Adjust status names based on your enum/text values
    IF (NEW.status::text IN ('closed', 'sold', 'finalizado', 'vendido')) AND NEW.winner_id IS NOT NULL THEN
        INSERT INTO public.contracts (lot_id, user_id, status, content, created_at)
        VALUES (
            NEW.id, 
            NEW.winner_id, 
            'pending', 
            'Contrato gerado automaticamente para o lote ' || NEW.lot_number || ': ' || NEW.title,
            now()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_lot_closed_contract ON public.lots;
CREATE TRIGGER on_lot_closed_contract
    AFTER UPDATE OF status ON public.lots
    FOR EACH ROW
    EXECUTE FUNCTION generate_contract_on_lot_close();

-- 4. RPC for placing bids (Centralized business logic)
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
        RETURN json_build_object('success', false, 'message', 'Participação não autorizada. Verifique sua caução/cadastro.');
    END IF;

    -- Rate limiting (Anti-spam/Bot protection)
    -- Allow 1 bid per second per user
    SELECT created_at INTO v_last_bid_time
    FROM public.bids
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_last_bid_time IS NOT NULL AND (now() - v_last_bid_time) < interval '1 second' THEN
        RETURN json_build_object('success', false, 'message', 'Muitos lances em pouco tempo. Aguarde um momento.');
    END IF;

    -- Validate bid amount
    IF p_amount < (v_current_price + COALESCE(v_increment, 0)) THEN
        RETURN json_build_object('success', false, 'message', 'O valor do lance deve respeitar o incremento mínimo');
    END IF;

    -- Anti-sniper: extend by 60 seconds if bid is placed in the last 30 seconds
    v_new_end_date := v_end_date;
    IF (v_end_date - now()) < interval '30 seconds' THEN
        UPDATE public.auctions SET end_date = end_date + interval '60 seconds'
        WHERE id = v_auction_id;
        v_new_end_date := v_end_date + interval '60 seconds';
    END IF;

    -- Record the bid
    INSERT INTO public.bids (lot_id, user_id, amount, created_at)
    VALUES (p_lot_id, v_user_id, p_amount, now());

    -- Update the lot current winner and price
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

-- 5. Helper function for closing auctions (Sales Note could be triggered here)
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS VOID AS $$
BEGIN
    -- Update auctions that have reached end_date
    UPDATE public.auctions
    SET status = 'closed', updated_at = now()
    WHERE end_date <= now() AND status = 'active';

    -- Update lots of those auctions
    UPDATE public.lots l
    SET status = 'closed', updated_at = now()
    FROM public.auctions a
    WHERE l.auction_id = a.id AND a.status = 'closed' AND l.status = 'open';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

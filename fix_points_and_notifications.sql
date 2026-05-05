-- 1. Create Notifications table if missing
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);

-- 2. Fix points calculation function to be robust
CREATE OR REPLACE FUNCTION calculate_points_on_order()
RETURNS TRIGGER AS $$
DECLARE
    v_points_multiplier DECIMAL;
    v_points_to_add INTEGER;
BEGIN
    -- Only award points when status changes to 'delivered'
    IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
        -- Get points per real from settings (try points_multiplier then points_ratio)
        SELECT 
            COALESCE(
                (value->>'points_per_real')::DECIMAL, 
                CASE 
                    WHEN (value::text ~ '^[0-9.]+$') THEN value::text::DECIMAL 
                    ELSE 0.5 
                END
            ) INTO v_points_multiplier 
        FROM public.store_settings 
        WHERE key = 'points_multiplier';
        
        IF v_points_multiplier IS NULL THEN
            SELECT 
                CASE 
                    WHEN (value::text ~ '^[0-9.]+$') THEN value::text::DECIMAL 
                    ELSE 0.5 
                END INTO v_points_multiplier
            FROM public.store_settings
            WHERE key = 'points_ratio';
        END IF;

        IF v_points_multiplier IS NULL THEN v_points_multiplier := 0.5; END IF;

        -- Use points_earned if already set by frontend, otherwise calculate
        IF NEW.points_earned IS NOT NULL AND NEW.points_earned > 0 THEN
            v_points_to_add := NEW.points_earned;
        ELSE
            -- Calculate: (total - delivery) * multiplier
            v_points_to_add := floor((NEW.total_amount - COALESCE(NEW.delivery_fee, 0)) * v_points_multiplier);
            NEW.points_earned := v_points_to_add;
        END IF;

        -- Update user points (sync both columns)
        UPDATE public.profiles 
        SET 
            loyalty_points = COALESCE(loyalty_points, 0) + v_points_to_add,
            points_balance = COALESCE(points_balance, 0) + v_points_to_add
        WHERE id = NEW.user_id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix notification trigger to NOT crash if profile is updated
CREATE OR REPLACE FUNCTION notify_points_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only notify if loyalty_points increased
    IF (NEW.loyalty_points > COALESCE(OLD.loyalty_points, 0)) THEN
        -- Wrap in EXCEPTION block to ensure point update doesn't fail if notification fails
        BEGIN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.id,
                'Você ganhou pontos!',
                'Parabéns! Você acaba de ganhar pontos em sua conta. Seu novo saldo é: ' || NEW.loyalty_points,
                'loyalty'
            );
        EXCEPTION WHEN OTHERS THEN
            -- Ignore notification errors to not block the main transaction
            RETURN NEW;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply triggers
DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
CREATE TRIGGER on_order_delivered
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_points_on_order();

DROP TRIGGER IF EXISTS on_profile_points_update ON public.profiles;
CREATE TRIGGER on_profile_points_update
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.loyalty_points IS DISTINCT FROM NEW.loyalty_points)
    EXECUTE FUNCTION notify_points_change();

-- 4. Reload schema
NOTIFY pgrst, 'reload schema';

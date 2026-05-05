-- 1. Ensure columns exist on orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_earned INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;

-- 2. Ensure both points columns exist on profiles table to avoid trigger failures
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points_balance INTEGER DEFAULT 0;

-- 3. Fix the points calculation trigger function
CREATE OR REPLACE FUNCTION calculate_points_on_order()
RETURNS TRIGGER AS $$
DECLARE
    v_points_multiplier DECIMAL;
    v_points_to_add INTEGER;
BEGIN
    -- Only award points when status changes to 'delivered'
    IF (NEW.status = 'delivered' AND (OLD.status IS NULL OR OLD.status != 'delivered')) THEN
        -- Get points per real from settings
        -- Handling different possible JSON structures in store_settings
        SELECT 
            COALESCE(
                (value->>'points_per_real')::DECIMAL, 
                CASE 
                    WHEN (value::text ~ '^[0-9.]+$') THEN value::text::DECIMAL 
                    ELSE 1 
                END
            ) INTO v_points_multiplier 
        FROM public.store_settings 
        WHERE key = 'points_multiplier';
        
        IF v_points_multiplier IS NULL THEN v_points_multiplier := 1; END IF;

        -- Calculate points based on total amount
        v_points_to_add := floor(NEW.total_amount * v_points_multiplier);
        
        -- Update the order's points_earned field if it hasn't been set yet
        IF NEW.points_earned IS NULL OR NEW.points_earned = 0 THEN
            NEW.points_earned := v_points_to_add;
        ELSE
            v_points_to_add := NEW.points_earned;
        END IF;

        -- Update user points (update BOTH columns to keep them in sync and avoid errors)
        UPDATE public.profiles 
        SET 
            loyalty_points = COALESCE(loyalty_points, 0) + v_points_to_add,
            points_balance = COALESCE(points_balance, 0) + v_points_to_add
        WHERE id = NEW.user_id;
        
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-create the trigger for order delivered
DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
CREATE TRIGGER on_order_delivered
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_points_on_order();

-- 5. Fix the notification trigger for points
CREATE OR REPLACE FUNCTION notify_points_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify on loyalty_points change (which we use in UI)
    IF (OLD.loyalty_points IS NULL OR OLD.loyalty_points != NEW.loyalty_points) AND NEW.loyalty_points > COALESCE(OLD.loyalty_points, 0) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.id,
            'Você ganhou pontos!',
            'Parabéns! Seu novo saldo de pontos é: ' || NEW.loyalty_points,
            'loyalty'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-create the trigger for points notification
DROP TRIGGER IF EXISTS on_profile_points_update ON public.profiles;
CREATE TRIGGER on_profile_points_update
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    WHEN (OLD.loyalty_points IS DISTINCT FROM NEW.loyalty_points)
    EXECUTE FUNCTION notify_points_change();

-- 6. Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- 7. Notify schema reload
NOTIFY pgrst, 'reload schema';

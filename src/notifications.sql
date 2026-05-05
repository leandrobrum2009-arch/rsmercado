 -- Global store alerts table
 CREATE TABLE IF NOT EXISTS public.store_alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     message TEXT NOT NULL,
     type TEXT DEFAULT 'info', -- 'info', 'warning', 'success', 'danger'
     is_active BOOLEAN DEFAULT TRUE,
     expires_at TIMESTAMP WITH TIME ZONE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- Enable RLS
 ALTER TABLE public.store_alerts ENABLE ROW LEVEL SECURITY;
 
 -- Policies
 CREATE POLICY "Everyone can see active alerts" ON public.store_alerts
     FOR SELECT USING (is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW()));
 
 CREATE POLICY "Admins can manage alerts" ON public.store_alerts
     FOR ALL USING (public.is_admin());
 -- Table for storing Web Push subscriptions
 CREATE TABLE IF NOT EXISTS public.push_subscriptions (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
     endpoint TEXT NOT NULL,
     p256dh TEXT NOT NULL,
     auth TEXT NOT NULL,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     UNIQUE(user_id, endpoint)
 );
 
 -- Table for storing notifications (history)
 CREATE TABLE IF NOT EXISTS public.notifications (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     message TEXT NOT NULL,
     type TEXT DEFAULT 'info', -- 'order_status', 'promo', 'loyalty', 'admin_msg'
     related_id UUID, -- order_id, product_id, etc.
     is_read BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- Enable RLS
 ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
 ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
 
 -- Policies
 CREATE POLICY "Users can manage own subscriptions" ON public.push_subscriptions
     FOR ALL USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can see own notifications" ON public.notifications
     FOR SELECT USING (auth.uid() = user_id);
 
 CREATE POLICY "Users can update own notifications" ON public.notifications
     FOR UPDATE USING (auth.uid() = user_id);
 
 -- Admin policy for notifications
 CREATE POLICY "Admins can manage notifications" ON public.notifications
     FOR ALL USING (public.is_admin());
 
 -- Admin policy for subscriptions
 CREATE POLICY "Admins can manage push subscriptions" ON public.push_subscriptions
     FOR ALL USING (public.is_admin());
 
 -- Function to decrease or revert stock based on order status
 CREATE OR REPLACE FUNCTION update_stock_on_order()
 RETURNS TRIGGER AS $$
 DECLARE
     item RECORD;
 BEGIN
     -- 1. Decrease stock when order is approved (only if it was pending/new)
     IF (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status = 'pending')) THEN
         FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
             UPDATE public.products 
             SET stock = GREATEST(0, stock - item.quantity)
             WHERE id = item.product_id;
         END LOOP;
     END IF;
 
     -- 2. Revert stock when order is cancelled (only if it was already approved/later)
     IF (NEW.status = 'cancelled' AND OLD.status NOT IN ('pending', 'cancelled')) THEN
         FOR item IN SELECT product_id, quantity FROM public.order_items WHERE order_id = NEW.id LOOP
             UPDATE public.products 
             SET stock = stock + item.quantity
             WHERE id = item.product_id;
         END LOOP;
     END IF;
 
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;
 
 DROP TRIGGER IF EXISTS trigger_update_stock_on_order ON public.orders;
 CREATE TRIGGER trigger_update_stock_on_order
     AFTER UPDATE ON public.orders
     FOR EACH ROW
     EXECUTE FUNCTION update_stock_on_order();
 
 -- Set initial stock for all products to 15 if not already set
 UPDATE public.products SET stock = 15 WHERE stock IS NULL OR stock = 0;
 
 -- Trigger for Order Status changes
 CREATE OR REPLACE FUNCTION notify_order_status_change()
 RETURNS TRIGGER AS $$
 BEGIN
     IF (OLD.status IS NULL OR OLD.status != NEW.status) THEN
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
 
 DROP TRIGGER IF EXISTS on_order_status_update ON public.orders;
 CREATE TRIGGER on_order_status_update
     AFTER UPDATE ON public.orders
     FOR EACH ROW
     EXECUTE FUNCTION notify_order_status_change();
 
 -- Trigger for Points change
 CREATE OR REPLACE FUNCTION notify_points_change()
 RETURNS TRIGGER AS $$
 BEGIN
     IF (OLD.points_balance IS NULL OR OLD.points_balance != NEW.points_balance) AND NEW.points_balance > COALESCE(OLD.points_balance, 0) THEN
         INSERT INTO public.notifications (user_id, title, message, type)
         VALUES (
             NEW.id,
             'Você ganhou pontos!',
             'Parabéns! Seu novo saldo de pontos é: ' || NEW.points_balance,
             'loyalty'
         );
     END IF;
     RETURN NEW;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;
 
 DROP TRIGGER IF EXISTS on_profile_points_update ON public.profiles;
 CREATE TRIGGER on_profile_points_update
     AFTER UPDATE ON public.profiles
     FOR EACH ROW
     WHEN (OLD.points_balance IS DISTINCT FROM NEW.points_balance)
     EXECUTE FUNCTION notify_points_change();
 
 -- Function to send notification to all users
 CREATE OR REPLACE FUNCTION notify_all_users(title TEXT, message TEXT, type TEXT DEFAULT 'promo')
 RETURNS void AS $$
 BEGIN
     INSERT INTO public.notifications (user_id, title, message, type)
     SELECT id, title, message, type FROM public.profiles;
 END;
 $$ LANGUAGE plpgsql SECURITY DEFINER;
 
 -- Add demographic columns to profiles
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gender TEXT; -- 'male', 'female', 'other'
 ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status TEXT; -- 'single', 'couple', 'family'
 
 -- Table for site visits tracking
 CREATE TABLE IF NOT EXISTS public.site_visits (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
     path TEXT,
     user_agent TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );
 
 -- Enable RLS
 ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
 
 -- Policy for site visits
 CREATE POLICY "Authenticated users can insert visits" ON public.site_visits
     FOR INSERT WITH CHECK (true);
 
 CREATE POLICY "Admins can view site visits" ON public.site_visits
     FOR SELECT USING (public.is_admin());
-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    avatar_url TEXT,
    whatsapp TEXT,
    birth_date DATE,
    gender TEXT,
    household_status TEXT,
    accept_marketing BOOLEAN DEFAULT true,
    points_balance INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create user_addresses table
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
    label TEXT, -- Home, Work, etc.
    recipient_name TEXT,
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT,
    reference_point TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address JSONB,
    total_amount DECIMAL(10,2) NOT NULL,
    delivery_fee DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    payment_method TEXT,
    status TEXT DEFAULT 'pending',
    points_earned INTEGER DEFAULT 0,
    coupon_code TEXT,
    change_for DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products ON DELETE SET NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- User Addresses Policies
CREATE POLICY "Users can view own addresses" ON public.user_addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own addresses" ON public.user_addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.user_addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.user_addresses FOR DELETE USING (auth.uid() = user_id);

-- Orders Policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id OR customer_phone = (SELECT whatsapp FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert own orders" ON public.orders FOR INSERT WITH CHECK (true); -- Allow guest checkout if needed, but usually auth.uid() = user_id
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update all orders" ON public.orders FOR UPDATE USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Order Items Policies
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND (user_id = auth.uid() OR customer_phone = (SELECT whatsapp FROM public.profiles WHERE id = auth.uid()))));
CREATE POLICY "Admins can view all order items" ON public.order_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Set up PIX config if missing
INSERT INTO public.store_settings (key, value)
VALUES ('pix_config', '{"enabled": true, "key": "rs-supermercado-pix-key-test-123", "merchant_name": "RS SUPERMERCADO", "merchant_city": "SAO PAULO"}')
ON CONFLICT (key) DO UPDATE SET value = public.store_settings.value || '{"enabled": true}';

-- Ensure the admin user has the role
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'leandrobrum2009@gmail.com') THEN
        INSERT INTO public.user_roles (user_id, role)
        SELECT id, 'admin' FROM auth.users WHERE email = 'leandrobrum2009@gmail.com'
        ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
    END IF;
END $$;

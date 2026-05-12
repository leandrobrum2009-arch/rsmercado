-- Create Auction Status Enum
DO $$ BEGIN
    CREATE TYPE auction_status AS ENUM ('draft', 'scheduled', 'live', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Lot Status Enum
DO $$ BEGIN
    CREATE TYPE lot_status AS ENUM ('pending', 'active', 'sold', 'unsold');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Auctions Table
CREATE TABLE IF NOT EXISTS public.auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    status auction_status NOT NULL DEFAULT 'draft',
    type TEXT, -- e.g., 'Judicial', 'Extrajudicial'
    location TEXT,
    main_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Lots Table
CREATE TABLE IF NOT EXISTS public.lots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
    lot_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT,
    minimum_bid DECIMAL(12, 2) NOT NULL DEFAULT 0,
    increment_value DECIMAL(12, 2) NOT NULL DEFAULT 0,
    start_price DECIMAL(12, 2) NOT NULL DEFAULT 0,
    status lot_status NOT NULL DEFAULT 'pending',
    winner_id UUID REFERENCES auth.users(id),
    sold_price DECIMAL(12, 2),
    images TEXT[] DEFAULT '{}',
    is_highlighted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Auction Registrations Table
CREATE TABLE IF NOT EXISTS public.auction_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    caucao_paid BOOLEAN DEFAULT false,
    caucao_amount DECIMAL(12, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(auction_id, user_id)
);

-- Create Bids Table
CREATE TABLE IF NOT EXISTS public.bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID REFERENCES public.lots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    is_automatic BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Caucao Payments Table
CREATE TABLE IF NOT EXISTS public.caucao_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    auction_id UUID REFERENCES public.auctions(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'failed'
    payment_method TEXT,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create Contracts Table
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lot_id UUID REFERENCES public.lots(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    signed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'signed', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caucao_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Auctions: Anyone can view non-draft auctions
CREATE POLICY "Anyone can view active auctions" ON public.auctions
    FOR SELECT USING (status != 'draft' OR (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)));

-- Lots: Anyone can view lots of active auctions
CREATE POLICY "Anyone can view lots" ON public.lots
    FOR SELECT USING (true);

-- Registrations: Users can view their own, admins all
CREATE POLICY "Users can view own registrations" ON public.auction_registrations
    FOR SELECT USING (auth.uid() = user_id OR (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)));

CREATE POLICY "Users can register for auctions" ON public.auction_registrations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Bids: Anyone can view bids, only registered & approved users can bid
CREATE POLICY "Anyone can view bids" ON public.bids
    FOR SELECT USING (true);

CREATE POLICY "Registered users can bid" ON public.bids
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND 
        EXISTS (
            SELECT 1 FROM public.auction_registrations ar
            JOIN public.lots l ON l.auction_id = ar.auction_id
            WHERE ar.user_id = auth.uid() 
            AND ar.status = 'approved'
            AND l.id = lot_id
        )
    );

-- Caucao Payments: Users can view/create own
CREATE POLICY "Users can manage own caucao payments" ON public.caucao_payments
    FOR ALL USING (auth.uid() = user_id OR (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)));

-- Contracts: Users can view own
CREATE POLICY "Users can view own contracts" ON public.contracts
    FOR SELECT USING (auth.uid() = user_id OR (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true)));

-- Admin Policies (Full Access)
CREATE POLICY "Admins full access auctions" ON public.auctions FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
CREATE POLICY "Admins full access lots" ON public.lots FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
CREATE POLICY "Admins full access bids" ON public.bids FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
CREATE POLICY "Admins full access registrations" ON public.auction_registrations FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
CREATE POLICY "Admins full access contracts" ON public.contracts FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- Realtime Settings
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;

-- Update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auctions_updated_at BEFORE UPDATE ON public.auctions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_lots_updated_at BEFORE UPDATE ON public.lots FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

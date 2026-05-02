-- Addresses Table
CREATE TABLE IF NOT EXISTS user_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT DEFAULT 'Casa', -- 'Casa', 'Trabalho', etc
    street TEXT NOT NULL,
    number TEXT NOT NULL,
    complement TEXT,
    neighborhood TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    zip_code TEXT NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhooks Table
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    url TEXT NOT NULL,
    event_type TEXT NOT NULL, -- 'order.created', 'order.status_updated'
    is_active BOOLEAN DEFAULT TRUE,
    secret TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS for Addresses
ALTER TABLE user_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own addresses" ON user_addresses FOR ALL USING (auth.uid() = user_id);

-- RLS for Webhooks
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Only admins can manage webhooks" ON webhooks FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);

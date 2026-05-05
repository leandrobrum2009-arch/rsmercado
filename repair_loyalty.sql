-- Ensure tables exist with correct structures
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    fee DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL,
    reward_data JSONB DEFAULT '{}',
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    requirement_type TEXT NOT NULL DEFAULT 'total_amount',
    requirement_data JSONB DEFAULT '{}',
    points_reward INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix RLS policies
ALTER TABLE delivery_neighborhoods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage neighborhoods" ON delivery_neighborhoods;
DROP POLICY IF EXISTS "Everyone can see active neighborhoods" ON delivery_neighborhoods;
CREATE POLICY "Everyone can see active neighborhoods" ON delivery_neighborhoods FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage neighborhoods" ON delivery_neighborhoods ALL USING (TRUE);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage rewards" ON loyalty_rewards;
DROP POLICY IF EXISTS "Everyone can see active rewards" ON loyalty_rewards;
CREATE POLICY "Everyone can see active rewards" ON loyalty_rewards FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage rewards" ON loyalty_rewards ALL USING (TRUE);

ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage challenges" ON weekly_challenges;
DROP POLICY IF EXISTS "Everyone can see active challenges" ON weekly_challenges;
CREATE POLICY "Everyone can see active challenges" ON weekly_challenges FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage challenges" ON weekly_challenges ALL USING (TRUE);

-- Ensure store_settings policy
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage store settings" ON store_settings;
CREATE POLICY "Admins manage store settings" ON store_settings ALL USING (TRUE);


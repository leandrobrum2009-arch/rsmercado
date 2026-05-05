-- 1. Add tags to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 2. Delivery Neighborhoods
CREATE TABLE IF NOT EXISTS delivery_neighborhoods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    fee DECIMAL(10,2) DEFAULT 0,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Loyalty Rewards (Products/Coupons you can get with points)
CREATE TABLE IF NOT EXISTS loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    reward_type TEXT NOT NULL, -- 'product', 'coupon'
    reward_data JSONB, -- { product_id: '...', coupon_code: '...' }
    image_url TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Weekly Challenges
CREATE TABLE IF NOT EXISTS weekly_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    requirement_type TEXT NOT NULL, -- 'category_purchase', 'total_amount'
    requirement_data JSONB, -- { category_id: '...', min_items: 3 }
    points_reward INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Track User Progress on Challenges
CREATE TABLE IF NOT EXISTS user_challenge_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES weekly_challenges(id) ON DELETE CASCADE,
    progress JSONB DEFAULT '{}',
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, challenge_id)
);

-- 6. Update Orders for delivery tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_neighborhood_id UUID REFERENCES delivery_neighborhoods(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_status TEXT DEFAULT 'pending'; -- 'pending', 'approved', 'collecting', 'waiting_courier', 'out_for_delivery', 'delivered'
ALTER TABLE orders ADD COLUMN IF NOT EXISTS whatsapp_notified_at TIMESTAMP WITH TIME ZONE;

-- 7. User Recipes (Ensure it exists)
CREATE TABLE IF NOT EXISTS user_recipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, recipe_id)
);

-- 8. Seed some initial neighborhoods
INSERT INTO delivery_neighborhoods (name, fee) VALUES
('Centro', 5.00),
('Bairro Alto', 7.00),
('Vila Nova', 4.50)
ON CONFLICT (name) DO NOTHING;

-- 9. Add point multiplier to store settings if not exists
INSERT INTO store_settings (key, value) 
VALUES ('points_multiplier', '{"multiplier": 1, "points_per_real": 1}')
ON CONFLICT (key) DO NOTHING;

-- Policies for new tables
ALTER TABLE delivery_neighborhoods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see active neighborhoods" ON delivery_neighborhoods FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins manage neighborhoods" ON delivery_neighborhoods ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

ALTER TABLE loyalty_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see active rewards" ON loyalty_rewards FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins manage rewards" ON loyalty_rewards ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can see active challenges" ON weekly_challenges FOR SELECT USING (active = TRUE);
CREATE POLICY "Admins manage challenges" ON weekly_challenges ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see own progress" ON user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON user_challenge_progress FOR UPDATE USING (auth.uid() = user_id);

ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own saved recipes" ON user_recipes ALL USING (auth.uid() = user_id);

-- Trigger for points calculation on order completion (simplified)
CREATE OR REPLACE FUNCTION calculate_points_on_order()
RETURNS TRIGGER AS $$
DECLARE
    points_multiplier INTEGER;
BEGIN
    IF (NEW.status = 'delivered' AND OLD.status != 'delivered') THEN
        -- Get points per real from settings
        SELECT (value->>'points_per_real')::INTEGER INTO points_multiplier 
        FROM store_settings WHERE key = 'points_multiplier';
        
        IF points_multiplier IS NULL THEN points_multiplier := 1; END IF;

        -- Update user points
        UPDATE profiles 
        SET points_balance = points_balance + floor(NEW.total_amount * points_multiplier)
        WHERE id = NEW.user_id;
        
        -- Update order points earned
        NEW.points_earned := floor(NEW.total_amount * points_multiplier);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_order_delivered
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION calculate_points_on_order();


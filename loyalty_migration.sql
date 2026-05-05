-- Create table for loyalty redemptions
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES loyalty_rewards(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'cancelled'
    points_spent INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE loyalty_redemptions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can see own redemptions" ON loyalty_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins manage all redemptions" ON loyalty_redemptions ALL USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Function to redeem a reward
CREATE OR REPLACE FUNCTION redeem_reward(p_user_id UUID, p_reward_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_points_cost INTEGER;
    v_user_points INTEGER;
    v_reward_title TEXT;
BEGIN
    -- Get reward cost and title
    SELECT points_cost, title INTO v_points_cost, v_reward_title
    FROM loyalty_rewards WHERE id = p_reward_id AND active = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Recompensa não encontrada ou inativa');
    END IF;

    -- Get user current points
    SELECT points_balance INTO v_user_points FROM profiles WHERE id = p_user_id;

    IF v_user_points < v_points_cost THEN
        RETURN jsonb_build_object('success', false, 'message', 'Saldo de pontos insuficiente');
    END IF;

    -- Subtract points
    UPDATE profiles SET points_balance = points_balance - v_points_cost WHERE id = p_user_id;

    -- Create redemption record
    INSERT INTO loyalty_redemptions (user_id, reward_id, points_spent, status)
    VALUES (p_user_id, p_reward_id, v_points_cost, 'pending');

    RETURN jsonb_build_object('success', true, 'message', 'Resgate realizado com sucesso! Utilize o cupom ou retire seu produto.', 'new_balance', v_user_points - v_points_cost);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION redeem_reward TO authenticated;

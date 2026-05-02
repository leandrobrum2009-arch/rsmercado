CREATE TABLE IF NOT EXISTS flyers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    valid_until DATE,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE flyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Flyers are viewable by everyone" ON flyers FOR SELECT USING (true);
CREATE POLICY "Admins can manage flyers" ON flyers FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

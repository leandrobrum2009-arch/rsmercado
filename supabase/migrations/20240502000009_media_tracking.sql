-- Add tracking column for broken images
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_media_error BOOLEAN DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS has_media_error BOOLEAN DEFAULT FALSE;
ALTER TABLE news ADD COLUMN IF NOT EXISTS has_media_error BOOLEAN DEFAULT FALSE;

-- Function to report media error
CREATE OR REPLACE FUNCTION report_media_error(table_name TEXT, item_id UUID)
RETURNS VOID AS $$
BEGIN
    EXECUTE format('UPDATE %I SET has_media_error = TRUE WHERE id = %L', table_name, item_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

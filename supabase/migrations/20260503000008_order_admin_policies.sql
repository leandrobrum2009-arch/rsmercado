-- Add update policy for admins on orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'orders' AND policyname = 'Admins can update all orders'
    ) THEN
        CREATE POLICY "Admins can update all orders" ON orders FOR UPDATE USING (
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
        );
    END IF;
END
$$;

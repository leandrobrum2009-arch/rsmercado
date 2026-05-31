-- Force schema cache reload
NOTIFY pgrst, 'reload schema';

-- Ensure all permissions are absolutely set for the API to see the tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

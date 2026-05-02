-- GRANT EXECUTE to ensure the functions are visible in the schema cache for PostgREST
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_to_admin(TEXT) TO anon;

GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_user_email(TEXT, TEXT) TO anon;

-- Force a schema cache refresh
COMMENT ON FUNCTION promote_to_admin(TEXT) IS 'Emergency promotion to admin';
COMMENT ON FUNCTION confirm_user_email(TEXT, TEXT) IS 'Emergency email confirmation';

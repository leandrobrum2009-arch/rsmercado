-- Revoke public execute on sensitive functions
REVOKE EXECUTE ON FUNCTION public.place_bid(UUID, NUMERIC) FROM public;
REVOKE EXECUTE ON FUNCTION public.place_bid(UUID, NUMERIC) FROM anon;
GRANT EXECUTE ON FUNCTION public.place_bid(UUID, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.place_bid(UUID, NUMERIC) TO service_role;

REVOKE EXECUTE ON FUNCTION public.close_expired_auctions() FROM public;
REVOKE EXECUTE ON FUNCTION public.close_expired_auctions() FROM anon;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO service_role;

-- Ensure all other security definer functions have set search_path
-- I'll check common ones if any were reported
-- The linter mentioned several. I'll search for them.

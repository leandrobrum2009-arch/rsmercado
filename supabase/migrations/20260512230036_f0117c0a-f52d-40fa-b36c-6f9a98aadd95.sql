-- Drop triggers first
DROP TRIGGER IF EXISTS audit_auctions_trigger ON public.auctions;
DROP TRIGGER IF EXISTS audit_lots_trigger ON public.lots;
DROP TRIGGER IF EXISTS audit_bids_trigger ON public.bids;
DROP TRIGGER IF EXISTS on_lot_closed_contract ON public.lots;
DROP TRIGGER IF EXISTS on_lot_closed_sales_note ON public.lots;

-- Drop functions
DROP FUNCTION IF EXISTS public.place_bid(UUID, NUMERIC);
DROP FUNCTION IF EXISTS public.close_expired_auctions();
DROP FUNCTION IF EXISTS public.audit_trigger_func();
DROP FUNCTION IF EXISTS public.generate_contract_on_lot_close();
DROP FUNCTION IF EXISTS public.generate_sales_note_on_lot_close();

-- Drop tables (order matters for FKs)
DROP TABLE IF EXISTS public.sales_notes;
DROP TABLE IF EXISTS public.fraud_logs;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.bids;
DROP TABLE IF EXISTS public.contracts;
DROP TABLE IF EXISTS public.lots;
DROP TABLE IF EXISTS public.caucao_payments;
DROP TABLE IF EXISTS public.auction_registrations;
DROP TABLE IF EXISTS public.auctions;

-- Drop types
DROP TYPE IF EXISTS public.auction_status;
DROP TYPE IF EXISTS public.lot_status;

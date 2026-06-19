-- =========================
-- API KEYS
-- =========================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  permissions TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  allowed_ips TEXT[] DEFAULT ARRAY[]::TEXT[],
  rate_limit_per_min INTEGER NOT NULL DEFAULT 60,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_keys TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys TO authenticated;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api_keys" ON public.api_keys FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON public.api_keys(is_active);

CREATE TRIGGER trg_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- API KEY LOGS
-- =========================
CREATE TABLE IF NOT EXISTS public.api_key_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE CASCADE,
  request_id TEXT,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  status_code INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_key_logs TO service_role;
GRANT SELECT ON public.api_key_logs TO authenticated;
ALTER TABLE public.api_key_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view api_key_logs" ON public.api_key_logs FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_api_key_logs_api_key_id ON public.api_key_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_logs_created_at ON public.api_key_logs(created_at DESC);

-- =========================
-- API WEBHOOKS
-- =========================
CREATE TABLE IF NOT EXISTS public.api_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  max_retries INTEGER NOT NULL DEFAULT 5,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_webhooks TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_webhooks TO authenticated;
ALTER TABLE public.api_webhooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage api_webhooks" ON public.api_webhooks FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TRIGGER trg_api_webhooks_updated_at
  BEFORE UPDATE ON public.api_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- API WEBHOOK DELIVERIES
-- =========================
CREATE TABLE IF NOT EXISTS public.api_webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES public.api_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 0,
  last_status_code INTEGER,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.api_webhook_deliveries TO service_role;
GRANT SELECT ON public.api_webhook_deliveries TO authenticated;
ALTER TABLE public.api_webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view webhook_deliveries" ON public.api_webhook_deliveries FOR SELECT
  USING (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON public.api_webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON public.api_webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_next_retry ON public.api_webhook_deliveries(next_retry_at) WHERE status = 'pending';

-- =========================
-- PRODUCTS: novos campos para integração
-- =========================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS sku TEXT,
  ADD COLUMN IF NOT EXISTS barcode TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS promo_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS cost DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS weight DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS width DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS height DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS length DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_updated_at ON public.products(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(active);

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
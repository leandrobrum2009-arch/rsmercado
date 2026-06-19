
-- product_images
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  file_name TEXT,
  url TEXT NOT NULL,
  is_main BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  file_size BIGINT,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  file_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.product_images TO anon, authenticated;
GRANT ALL ON public.product_images TO service_role;

ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product_images" ON public.product_images;
CREATE POLICY "Public read product_images"
  ON public.product_images FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins manage product_images" ON public.product_images;
CREATE POLICY "Admins manage product_images"
  ON public.product_images FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images (product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_updated_at ON public.product_images (updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS uq_product_images_main
  ON public.product_images (product_id) WHERE is_main = true;

DROP TRIGGER IF EXISTS trg_product_images_updated_at ON public.product_images;
CREATE TRIGGER trg_product_images_updated_at
  BEFORE UPDATE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- image_deletions (tombstones)
CREATE TABLE IF NOT EXISTS public.image_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id UUID NOT NULL,
  product_id UUID,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.image_deletions TO authenticated;
GRANT ALL ON public.image_deletions TO service_role;

ALTER TABLE public.image_deletions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage image_deletions" ON public.image_deletions;
CREATE POLICY "Admins manage image_deletions"
  ON public.image_deletions FOR ALL
  USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE INDEX IF NOT EXISTS idx_image_deletions_deleted_at ON public.image_deletions (deleted_at);
CREATE INDEX IF NOT EXISTS idx_image_deletions_product_id ON public.image_deletions (product_id);

CREATE OR REPLACE FUNCTION public.log_product_image_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.image_deletions (image_id, product_id)
  VALUES (OLD.id, OLD.product_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_images_log_delete ON public.product_images;
CREATE TRIGGER trg_product_images_log_delete
  AFTER DELETE ON public.product_images
  FOR EACH ROW EXECUTE FUNCTION public.log_product_image_deletion();

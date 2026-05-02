-- ADVANCED AUTO-DEDUPLICATION FUNCTION
CREATE OR REPLACE FUNCTION public.auto_deduplicate_products()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    deleted_count INTEGER := 0;
    duplicate_record RECORD;
BEGIN
    -- Only allow the master owner to run this
    IF (auth.jwt() ->> 'email') != 'leandrobrum2009@gmail.com' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Acesso negado.');
    END IF;

    -- CTE to find duplicates based on normalized name
    -- We keep the record with the image_url if available, otherwise the oldest one
    WITH product_groups AS (
        SELECT 
            id,
            name,
            ROW_NUMBER() OVER (
                PARTITION BY LOWER(TRIM(REGEXP_REPLACE(name, '[^\w\s]', '', 'g'))) 
                ORDER BY (image_url IS NOT NULL AND image_url != '') DESC, created_at ASC
            ) as rank
        FROM public.products
    )
    DELETE FROM public.products
    WHERE id IN (
        SELECT id FROM product_groups WHERE rank > 1
    );

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Desduplicação concluída!', 
        'deleted_count', deleted_count
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.auto_deduplicate_products() TO authenticated;

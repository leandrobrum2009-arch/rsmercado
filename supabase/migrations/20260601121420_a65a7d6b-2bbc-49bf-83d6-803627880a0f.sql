BEGIN;
-- Delete existing products and categories to avoid conflicts and start fresh from old data
DELETE FROM public.products;
DELETE FROM public.categories;
DELETE FROM public.banners;
COMMIT;
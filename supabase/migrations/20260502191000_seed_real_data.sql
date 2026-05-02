-- SEED REAL DATA - CATEGORIES AND PRODUCTS

-- 1. Categories
INSERT INTO public.categories (name, slug, icon_url) VALUES
('Mercearia', 'mercearia', 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png'),
('Padaria', 'padaria', 'https://cdn-icons-png.flaticon.com/512/992/992743.png'),
('Açougue', 'acougue', 'https://cdn-icons-png.flaticon.com/512/1046/1046769.png'),
('Bebidas', 'bebidas', 'https://cdn-icons-png.flaticon.com/512/3122/3122040.png'),
('Laticínios', 'laticinios', 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png'),
('Limpeza', 'limpeza', 'https://cdn-icons-png.flaticon.com/512/2553/2553642.png'),
('Hortifruti', 'hortifruti', 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png'),
('Pet Shop', 'pet-shop', 'https://cdn-icons-png.flaticon.com/512/616/616408.png')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

-- 2. Products
DO \$\$
DECLARE
    cat_mercearia UUID;
    cat_bebidas UUID;
    cat_limpeza UUID;
BEGIN
    SELECT id INTO cat_mercearia FROM categories WHERE slug = 'mercearia';
    SELECT id INTO cat_bebidas FROM categories WHERE slug = 'bebidas';
    SELECT id INTO cat_limpeza FROM categories WHERE slug = 'limpeza';

    -- Mercearia
    INSERT INTO public.products (name, description, price, old_price, category_id, stock, image_url) VALUES
    ('Arroz Tio João Tipo 1 5kg', 'Arroz agulhinha tipo 1, grãos selecionados e branquinhos.', 29.90, 32.50, cat_mercearia, 100, 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800'),
    ('Feijão Carioca Camil 1kg', 'Feijão carioca novo, cozinha rápido e faz caldo grosso.', 8.50, 9.90, cat_mercearia, 150, 'https://images.unsplash.com/photo-1551462147-37885acc3c41?auto=format&fit=crop&q=80&w=800'),
    ('Açúcar Refinado União 1kg', 'Açúcar de cana refinado, ideal para doces e cafés.', 4.20, 4.80, cat_mercearia, 200, 'https://images.unsplash.com/photo-1581448670546-07b57f40ed5b?auto=format&fit=crop&q=80&w=800'),
    ('Café Pilão Tradicional 500g', 'O café forte do Brasil, vácuo.', 18.90, 21.00, cat_mercearia, 80, 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&q=80&w=800');

    -- Bebidas
    INSERT INTO public.products (name, description, price, category_id, stock, image_url) VALUES
    ('Cerveja Skol Lata 350ml', 'Cerveja pilsen, a que desce redondo.', 3.49, cat_bebidas, 500, 'https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&q=80&w=800'),
    ('Refrigerante Coca-Cola 2L', 'Sabor original, refrescante.', 11.90, cat_bebidas, 300, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&q=80&w=800'),
    ('Vinho Tinto Casillero del Diablo 750ml', 'Vinho Cabernet Sauvignon chileno.', 45.00, cat_bebidas, 50, 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&q=80&w=800');

    -- Limpeza
    INSERT INTO public.products (name, description, price, category_id, stock, image_url) VALUES
    ('Detergente Ypê Neutro 500ml', 'Lava-louças rendimento e brilho.', 2.45, cat_limpeza, 400, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&q=80&w=800'),
    ('Amaciante Comfort 1.8L', 'Perfume prolongado e maciez.', 19.90, cat_limpeza, 60, 'https://images.unsplash.com/photo-1558317374-067fb5f30001?auto=format&fit=crop&q=80&w=800');

END \$\$;

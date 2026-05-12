-- Remove the trigger that sends a notification to all users for every single new product added
DROP TRIGGER IF EXISTS on_product_created ON public.products;

-- Also remove the flyer trigger if it's too frequent, or at least keep it but it's less likely to be the cause of "20 notifications" at once
-- However, let's keep it for flyers as they are usually intentional and rare events.

-- Optional: Delete existing "Novo Produto Chegou!" notifications to clean up for users
DELETE FROM public.notifications WHERE title = '✨ Novo Produto Chegou!';

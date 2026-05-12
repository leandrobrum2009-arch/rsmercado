ALTER TABLE public.whatsapp_logs ADD COLUMN order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;
CREATE INDEX idx_whatsapp_logs_order_id ON public.whatsapp_logs(order_id);

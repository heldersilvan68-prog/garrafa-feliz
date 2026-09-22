ALTER TABLE public.client_purchases ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_client_purchases_order_id ON public.client_purchases(order_id);
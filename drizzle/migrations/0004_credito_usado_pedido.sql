ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS credito_usado numeric NOT NULL DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS order_id uuid;
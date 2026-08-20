ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vales_saldo integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vales_credito integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS vales_resgatados integer NOT NULL DEFAULT 0;
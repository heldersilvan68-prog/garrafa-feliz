ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS unidades_por_fardo integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS preco_custo_fardo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preco_fardo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margem_desejada numeric NOT NULL DEFAULT 0;
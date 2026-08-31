ALTER TABLE public.returnable_movements
  ADD COLUMN IF NOT EXISTS valor_total numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custo_unitario numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fornecedor text,
  ADD COLUMN IF NOT EXISTS forma_pagamento text,
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL;
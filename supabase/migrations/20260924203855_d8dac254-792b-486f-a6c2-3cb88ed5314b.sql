ALTER TABLE public.client_credit_entries ADD COLUMN IF NOT EXISTS estornado_em timestamptz, ADD COLUMN IF NOT EXISTS motivo_estorno text;
GRANT UPDATE ON public.client_credit_entries TO authenticated;
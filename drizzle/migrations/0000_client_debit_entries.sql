CREATE TABLE public.client_debit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  valor numeric NOT NULL CHECK (valor > 0),
  descricao text NOT NULL,
  vencimento date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_debit_entries TO authenticated;
GRANT ALL ON public.client_debit_entries TO service_role;
ALTER TABLE public.client_debit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own debit entries" ON public.client_debit_entries FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
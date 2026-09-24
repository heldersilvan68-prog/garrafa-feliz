CREATE TABLE public.client_credit_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  forma text NOT NULL,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_credit_entries TO authenticated;
GRANT ALL ON public.client_credit_entries TO service_role;
ALTER TABLE public.client_credit_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own credit entries" ON public.client_credit_entries FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_client_credit_entries_client ON public.client_credit_entries(client_id, created_at DESC);
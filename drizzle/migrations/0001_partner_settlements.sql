ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS parceiro boolean NOT NULL DEFAULT false;

CREATE TABLE public.partner_commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  preco_venda numeric NOT NULL DEFAULT 0,
  comissao_unit numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_commission_rules TO authenticated;
GRANT ALL ON public.partner_commission_rules TO service_role;
ALTER TABLE public.partner_commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own partner rules" ON public.partner_commission_rules FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.partner_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  inicio date NOT NULL,
  fim date NOT NULL,
  qtd integer NOT NULL DEFAULT 0,
  fiado_total numeric NOT NULL DEFAULT 0,
  comissao_total numeric NOT NULL DEFAULT 0,
  liquido numeric NOT NULL DEFAULT 0,
  forma text NOT NULL DEFAULT 'PIX',
  expense_id uuid REFERENCES public.expenses(id) ON DELETE SET NULL,
  estornado_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_settlements TO authenticated;
GRANT ALL ON public.partner_settlements TO service_role;
ALTER TABLE public.partner_settlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own partner settlements" ON public.partner_settlements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS partner_settlement_id uuid REFERENCES public.partner_settlements(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS comissao_parceria numeric NOT NULL DEFAULT 0;
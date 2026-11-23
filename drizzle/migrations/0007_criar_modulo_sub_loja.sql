ALTER TABLE public.products
  ADD COLUMN sub_loja boolean NOT NULL DEFAULT false;

ALTER TABLE public.order_items
  ADD COLUMN sub_loja boolean NOT NULL DEFAULT false,
  ADD COLUMN cmv numeric;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_cmv_nao_negativo CHECK (cmv IS NULL OR cmv >= 0);

UPDATE public.order_items AS item
SET sub_loja = COALESCE(produto.sub_loja, false),
    cmv = CASE
      WHEN item.composicao IS NULL AND produto.id IS NOT NULL
        THEN ROUND((COALESCE(produto.preco_custo, 0) * item.qtd)::numeric, 2)
      ELSE NULL
    END
FROM public.products AS produto
WHERE produto.id = item.product_id
  AND produto.user_id = item.user_id;

CREATE INDEX order_items_sub_loja_order_idx
  ON public.order_items (user_id, sub_loja, order_id);

CREATE TABLE public.sub_loja_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  descricao text NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  categoria text NOT NULL,
  data date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sub_loja_expenses TO authenticated;
GRANT ALL ON public.sub_loja_expenses TO service_role;
ALTER TABLE public.sub_loja_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário gerencia despesas da própria sub-loja"
ON public.sub_loja_expenses FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
CREATE INDEX sub_loja_expenses_user_data_idx
  ON public.sub_loja_expenses (user_id, data DESC);
CREATE TRIGGER sub_loja_expenses_updated_at
BEFORE UPDATE ON public.sub_loja_expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.sub_loja_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dia date NOT NULL,
  faturamento numeric NOT NULL DEFAULT 0,
  pix numeric NOT NULL DEFAULT 0,
  dinheiro numeric NOT NULL DEFAULT 0,
  debito numeric NOT NULL DEFAULT 0,
  credito numeric NOT NULL DEFAULT 0,
  fiado numeric NOT NULL DEFAULT 0,
  vale numeric NOT NULL DEFAULT 0,
  cmv numeric NOT NULL DEFAULT 0,
  despesas numeric NOT NULL DEFAULT 0,
  lucro_bruto numeric NOT NULL DEFAULT 0,
  lucro_liquido numeric NOT NULL DEFAULT 0,
  pedidos integer NOT NULL DEFAULT 0,
  quantidade_itens numeric NOT NULL DEFAULT 0,
  fechado_em timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dia)
);

GRANT SELECT, INSERT, DELETE ON public.sub_loja_closings TO authenticated;
GRANT ALL ON public.sub_loja_closings TO service_role;
ALTER TABLE public.sub_loja_closings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuário consulta e cria fechamentos da própria sub-loja"
ON public.sub_loja_closings FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Usuário registra fechamentos da própria sub-loja"
ON public.sub_loja_closings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuário exclui fechamentos da própria sub-loja"
ON public.sub_loja_closings FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE INDEX sub_loja_closings_user_dia_idx
  ON public.sub_loja_closings (user_id, dia DESC);

COMMENT ON COLUMN public.products.sub_loja IS 'Identifica produtos cuja receita e resultado pertencem à Sub-Loja.';
COMMENT ON COLUMN public.order_items.sub_loja IS 'Vínculo histórico da Sub-Loja no momento da venda; não muda com o cadastro atual do produto.';
COMMENT ON COLUMN public.order_items.cmv IS 'Custo total do item no momento da venda, incluindo a composição da modalidade; NULL em registros antigos sem custo preservado.';
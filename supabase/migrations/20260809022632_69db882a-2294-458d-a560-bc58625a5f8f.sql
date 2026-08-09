-- 1. Cadastros auxiliares dinâmicos
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_categories TO authenticated;
GRANT ALL ON public.product_categories TO service_role;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_categories_own ON public.product_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_product_categories_updated_at BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_brands TO authenticated;
GRANT ALL ON public.product_brands TO service_role;
ALTER TABLE public.product_brands ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_brands_own ON public.product_brands FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_product_brands_updated_at BEFORE UPDATE ON public.product_brands
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.product_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_units TO authenticated;
GRANT ALL ON public.product_units TO service_role;
ALTER TABLE public.product_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY product_units_own ON public.product_units FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_product_units_updated_at BEFORE UPDATE ON public.product_units
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Semeia categorias a partir dos produtos existentes
INSERT INTO public.product_categories (user_id, nome)
SELECT DISTINCT user_id, categoria FROM public.products WHERE categoria <> ''
ON CONFLICT (user_id, nome) DO NOTHING;

-- 2. Produtos: marca, unidade e custos de casco/envase
ALTER TABLE public.products
  ADD COLUMN marca text,
  ADD COLUMN unidade text,
  ADD COLUMN custo_casco numeric NOT NULL DEFAULT 0,
  ADD COLUMN custo_envase numeric NOT NULL DEFAULT 0;

-- 3. Clientes: vasilhames na rua
ALTER TABLE public.clients
  ADD COLUMN vasilhames_rua integer NOT NULL DEFAULT 0;

-- 4. Pedidos: valor exato lançado em fiado
ALTER TABLE public.orders
  ADD COLUMN valor_fiado numeric NOT NULL DEFAULT 0;

-- 5. Pagamentos fracionados por pedido
CREATE TABLE public.order_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  forma payment_method NOT NULL,
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_payments TO authenticated;
GRANT ALL ON public.order_payments TO service_role;
ALTER TABLE public.order_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY order_payments_own ON public.order_payments FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_order_payments_order ON public.order_payments(order_id);

-- 6. Histórico de vasilhames: novos tipos, motivo e usuário
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'avaria_cheio';
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'avaria_vazio';
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'retorno_sem_envase';
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'venda_casco';
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'venda_completa';
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'devolucao_cliente';
ALTER TYPE public.returnable_movement_type ADD VALUE IF NOT EXISTS 'estorno';

ALTER TABLE public.returnable_movements
  ADD COLUMN motivo text,
  ADD COLUMN usuario text,
  ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  ADD COLUMN delta_cheio integer NOT NULL DEFAULT 0,
  ADD COLUMN delta_vazio integer NOT NULL DEFAULT 0,
  ADD COLUMN delta_patrimonio integer NOT NULL DEFAULT 0;
CREATE INDEX idx_returnable_movements_created ON public.returnable_movements(user_id, created_at DESC);
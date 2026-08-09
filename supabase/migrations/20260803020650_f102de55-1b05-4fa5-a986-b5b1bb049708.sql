-- =========================
-- ENUMS
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'gerente', 'entregador');
CREATE TYPE public.order_status AS ENUM ('pendente', 'em-rota', 'concluido', 'cancelado');
CREATE TYPE public.payment_method AS ENUM ('PIX', 'Dinheiro', 'Débito', 'Crédito', 'Fiado');
CREATE TYPE public.cash_movement_type AS ENUM ('sangria', 'suprimento', 'recebimento');
CREATE TYPE public.expense_status AS ENUM ('Pago', 'Pendente');
CREATE TYPE public.returnable_movement_type AS ENUM ('recolhido', 'envasado', 'entrada', 'compra');

-- =========================
-- SHARED FUNCTIONS
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- USER ROLES
-- =========================
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

-- =========================
-- PRODUCTS
-- =========================
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  legacy_id TEXT,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL,
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque_minimo INTEGER NOT NULL DEFAULT 0,
  retornavel BOOLEAN NOT NULL DEFAULT false,
  estoque_cheio INTEGER NOT NULL DEFAULT 0,
  estoque_vazio INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_products_user ON public.products(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_own" ON public.products FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- CLIENTS
-- =========================
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  legacy_id TEXT,
  nome TEXT NOT NULL,
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  bairro TEXT,
  documento TEXT,
  limite_fiado NUMERIC(12,2) NOT NULL DEFAULT 0,
  divida NUMERIC(12,2) NOT NULL DEFAULT 0,
  consumo_medio_dias INTEGER NOT NULL DEFAULT 7,
  ultima_compra DATE,
  cadastrado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_clients_user ON public.clients(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clients TO authenticated;
GRANT ALL ON public.clients TO service_role;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_own" ON public.clients FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_client_purchases_client ON public.client_purchases(client_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_purchases TO authenticated;
GRANT ALL ON public.client_purchases TO service_role;
ALTER TABLE public.client_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_purchases_own" ON public.client_purchases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- CASH REGISTER
-- =========================
CREATE TABLE public.cash_registers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  legacy_id TEXT,
  dia DATE NOT NULL DEFAULT CURRENT_DATE,
  troco_inicial NUMERIC(12,2) NOT NULL DEFAULT 0,
  aberto_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  fechado_em TIMESTAMPTZ,
  contado NUMERIC(12,2),
  diferenca NUMERIC(12,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cash_registers_user ON public.cash_registers(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_registers TO authenticated;
GRANT ALL ON public.cash_registers TO service_role;
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_registers_own" ON public.cash_registers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_cash_registers_updated_at BEFORE UPDATE ON public.cash_registers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.cash_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
  tipo public.cash_movement_type NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_cash_movements_register ON public.cash_movements(cash_register_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_movements TO authenticated;
GRANT ALL ON public.cash_movements TO service_role;
ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cash_movements_own" ON public.cash_movements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- ORDERS
-- =========================
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  legacy_id TEXT,
  numero INTEGER NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  cliente_nome TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  endereco TEXT NOT NULL DEFAULT '',
  bairro TEXT NOT NULL DEFAULT '',
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  pagamento public.payment_method NOT NULL DEFAULT 'Dinheiro',
  pago BOOLEAN NOT NULL DEFAULT false,
  troco_para NUMERIC(12,2),
  vazios_recolhidos INTEGER NOT NULL DEFAULT 0,
  entregador TEXT NOT NULL DEFAULT '',
  status public.order_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  motivo_cancelamento TEXT,
  obs_cancelamento TEXT,
  forma_baixa public.payment_method,
  pago_em TIMESTAMPTZ,
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_user ON public.orders(user_id);
CREATE INDEX idx_orders_created ON public.orders(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_own" ON public.orders FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  nome TEXT NOT NULL DEFAULT '',
  qtd INTEGER NOT NULL DEFAULT 1,
  preco_unit NUMERIC(12,2) NOT NULL DEFAULT 0,
  retornavel BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.order_items(order_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items_own" ON public.order_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- RETURNABLES (vasilhames)
-- =========================
CREATE TABLE public.returnable_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  tipo public.returnable_movement_type NOT NULL,
  qtd INTEGER NOT NULL DEFAULT 0,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_returnable_movements_user ON public.returnable_movements(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.returnable_movements TO authenticated;
GRANT ALL ON public.returnable_movements TO service_role;
ALTER TABLE public.returnable_movements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "returnable_movements_own" ON public.returnable_movements FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- COMMISSIONS
-- =========================
CREATE TABLE public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entregador TEXT NOT NULL,
  por_unidade NUMERIC(12,2) NOT NULL DEFAULT 0,
  percentual NUMERIC(6,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, entregador)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_rules_own" ON public.commission_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_commission_rules_updated_at BEFORE UPDATE ON public.commission_rules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.commission_advances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entregador TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  motivo TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commission_advances_user ON public.commission_advances(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_advances TO authenticated;
GRANT ALL ON public.commission_advances TO service_role;
ALTER TABLE public.commission_advances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_advances_own" ON public.commission_advances FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.commission_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  entregador TEXT NOT NULL,
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_commission_payments_user ON public.commission_payments(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_payments TO authenticated;
GRANT ALL ON public.commission_payments TO service_role;
ALTER TABLE public.commission_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "commission_payments_own" ON public.commission_payments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- =========================
-- EXPENSES
-- =========================
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  cor TEXT NOT NULL DEFAULT 'var(--color-primary)',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_categories_own" ON public.expense_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  legacy_id TEXT,
  descricao TEXT NOT NULL DEFAULT '',
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  categoria TEXT NOT NULL DEFAULT 'Outros',
  valor NUMERIC(12,2) NOT NULL DEFAULT 0,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  forma TEXT NOT NULL DEFAULT 'PIX',
  status public.expense_status NOT NULL DEFAULT 'Pendente',
  observacoes TEXT,
  cash_register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_expenses_user ON public.expenses(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses_own" ON public.expenses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- NEW USER BOOTSTRAP
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.expense_categories (user_id, nome, cor)
  VALUES
    (NEW.id, 'Combustível', 'var(--color-primary)'),
    (NEW.id, 'Manutenção/Frota', 'var(--color-warning)'),
    (NEW.id, 'Contas Fixas', 'var(--color-destructive)'),
    (NEW.id, 'Aluguel', 'var(--color-success)'),
    (NEW.id, 'Salários/Comissões', 'var(--color-accent)'),
    (NEW.id, 'Compra de Vasilhames', 'var(--color-muted-foreground)'),
    (NEW.id, 'Outros', 'var(--color-secondary-foreground)')
  ON CONFLICT (user_id, nome) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
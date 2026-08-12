CREATE TABLE public.app_settings (
  user_id uuid NOT NULL PRIMARY KEY,
  meta_vendas_mensal numeric NOT NULL DEFAULT 0,
  nome_fantasia text NOT NULL DEFAULT '',
  razao_social text NOT NULL DEFAULT '',
  cnpj text NOT NULL DEFAULT '',
  endereco text NOT NULL DEFAULT '',
  whatsapp text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_settings_own ON public.app_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Dinheiro',
  taxa numeric NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_methods_own ON public.payment_methods FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.client_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nome text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_categories TO authenticated;
GRANT ALL ON public.client_categories TO service_role;
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_categories_own ON public.client_categories FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_client_categories_updated_at BEFORE UPDATE ON public.client_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.cash_registers
  ADD COLUMN IF NOT EXISTS contado_pix numeric,
  ADD COLUMN IF NOT EXISTS contado_cartao numeric,
  ADD COLUMN IF NOT EXISTS diferenca_pix numeric,
  ADD COLUMN IF NOT EXISTS diferenca_cartao numeric;
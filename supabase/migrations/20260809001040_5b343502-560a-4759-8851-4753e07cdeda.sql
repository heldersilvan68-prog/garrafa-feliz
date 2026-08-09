CREATE TYPE public.deliverer_kind AS ENUM ('entregador', 'auxiliar');

CREATE TABLE public.deliverers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  documento text,
  tipo public.deliverer_kind NOT NULL DEFAULT 'entregador',
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, nome)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliverers TO authenticated;
GRANT ALL ON public.deliverers TO service_role;

ALTER TABLE public.deliverers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deliverers_own" ON public.deliverers FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_deliverers_updated_at BEFORE UPDATE ON public.deliverers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
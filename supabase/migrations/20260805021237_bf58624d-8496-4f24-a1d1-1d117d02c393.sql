ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS clients_user_code_key ON public.clients (user_id, code) WHERE code IS NOT NULL;

WITH numerado AS (
  SELECT id, lpad((row_number() OVER (PARTITION BY user_id ORDER BY cadastrado_em, created_at))::text, 2, '0') AS novo
  FROM public.clients
)
UPDATE public.clients c SET code = n.novo FROM numerado n WHERE c.id = n.id AND c.code IS NULL;
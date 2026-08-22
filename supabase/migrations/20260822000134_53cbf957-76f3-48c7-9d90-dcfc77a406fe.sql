ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS preco_venda_casco numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_completa numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_qtd integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promo_preco numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patrimonio_cascos integer NOT NULL DEFAULT 0;

UPDATE public.products
   SET patrimonio_cascos = GREATEST(0, estoque_cheio + estoque_vazio)
 WHERE retornavel AND patrimonio_cascos = 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS desconto numeric NOT NULL DEFAULT 0;
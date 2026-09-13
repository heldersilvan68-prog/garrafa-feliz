ALTER TABLE public.order_items
  ADD COLUMN embalagem text,
  ADD COLUMN quantidade_embalagens integer,
  ADD COLUMN preco_embalagem numeric;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_embalagem_check
  CHECK (embalagem IS NULL OR embalagem IN ('un', 'fardo')),
  ADD CONSTRAINT order_items_quantidade_embalagens_check
  CHECK (quantidade_embalagens IS NULL OR quantidade_embalagens > 0),
  ADD CONSTRAINT order_items_preco_embalagem_check
  CHECK (preco_embalagem IS NULL OR preco_embalagem >= 0);
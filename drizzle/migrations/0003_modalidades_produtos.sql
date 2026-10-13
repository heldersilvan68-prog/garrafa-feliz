ALTER TABLE public.products ADD COLUMN ocultar_pdv boolean NOT NULL DEFAULT false;
ALTER TABLE public.products ADD COLUMN modalidades jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.order_items ADD COLUMN composicao jsonb;
COMMENT ON COLUMN public.products.ocultar_pdv IS 'Quando true, o produto nao aparece como card no PDV (insumos/vasilhames avulsos).';
COMMENT ON COLUMN public.products.modalidades IS 'Lista de modalidades de venda: [{id, nome, preco, composicao: [{produtoId, qtd}]}].';
COMMENT ON COLUMN public.order_items.composicao IS 'Composicao de estoque da modalidade vendida: [{produtoId, qtd}] por unidade vendida.';
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS endereco_entrega text;

COMMENT ON COLUMN public.orders.endereco_entrega IS 'Endereço de entrega específico do pedido; não altera o cadastro do cliente.';
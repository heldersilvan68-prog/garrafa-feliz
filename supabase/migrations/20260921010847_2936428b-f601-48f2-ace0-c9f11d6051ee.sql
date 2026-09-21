DROP POLICY IF EXISTS "Permitir inserção de order_items para usuários autenticados" ON public.order_items;

GRANT INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
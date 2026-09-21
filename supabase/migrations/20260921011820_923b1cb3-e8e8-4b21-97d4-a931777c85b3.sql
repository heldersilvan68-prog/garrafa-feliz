DROP POLICY IF EXISTS "Permitir inserção de order_items para usuários autenticados" ON public.order_items;

CREATE POLICY "Permitir inserção de order_items para usuários autenticados"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
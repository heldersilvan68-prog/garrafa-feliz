DROP POLICY IF EXISTS "Permitir inserção de order_items para usuários autenticados" ON public.order_items;

CREATE POLICY "Permitir inserção de order_items para usuários autenticados"
  ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.orders AS parent_order
      WHERE parent_order.id = order_items.order_id
        AND parent_order.user_id = auth.uid()
    )
  );

GRANT INSERT ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
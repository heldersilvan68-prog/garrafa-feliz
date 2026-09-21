GRANT INSERT ON TABLE public.order_items TO authenticated;

DROP POLICY IF EXISTS "Permitir inserção de order_items para usuários autenticados" ON public.order_items;

CREATE POLICY "Permitir inserção de order_items para usuários autenticados"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (true);
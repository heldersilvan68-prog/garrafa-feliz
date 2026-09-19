ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_qtd_positive;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_qtd_positive CHECK (qtd > 0);

CREATE OR REPLACE FUNCTION public.create_order_with_items(
  _order jsonb,
  _items jsonb,
  _payments jsonb DEFAULT '[]'::jsonb
)
RETURNS public.orders
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  _user_id uuid := auth.uid();
  _created public.orders;
  _inserted_items integer := 0;
  _expected_items integer := 0;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada';
  END IF;

  IF jsonb_typeof(_items) IS DISTINCT FROM 'array' OR jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'O pedido precisa ter pelo menos um item';
  END IF;
  _expected_items := jsonb_array_length(_items);

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(_items) AS item
    WHERE NULLIF(item->>'qtd', '') IS NULL
       OR (item->>'qtd')::integer <= 0
  ) THEN
    RAISE EXCEPTION 'Todos os itens precisam ter quantidade maior que zero';
  END IF;

  INSERT INTO public.orders (
    user_id, numero, client_id, cliente_nome, telefone, endereco,
    endereco_entrega, bairro, total, pagamento, pago, valor_fiado,
    troco_para, vazios_recolhidos, galoes_troca_refil, desconto,
    vales_credito, vales_resgatados, status, entregador, observacao
  ) VALUES (
    _user_id,
    (_order->>'numero')::integer,
    NULLIF(_order->>'client_id', '')::uuid,
    COALESCE(_order->>'cliente_nome', ''),
    COALESCE(_order->>'telefone', ''),
    COALESCE(_order->>'endereco', ''),
    COALESCE(_order->>'endereco_entrega', ''),
    COALESCE(_order->>'bairro', ''),
    COALESCE((_order->>'total')::numeric, 0),
    COALESCE((_order->>'pagamento')::public.payment_method, 'PIX'::public.payment_method),
    COALESCE((_order->>'pago')::boolean, false),
    COALESCE((_order->>'valor_fiado')::numeric, 0),
    NULLIF(_order->>'troco_para', '')::numeric,
    COALESCE((_order->>'vazios_recolhidos')::integer, 0),
    COALESCE((_order->>'galoes_troca_refil')::integer, 0),
    COALESCE((_order->>'desconto')::numeric, 0),
    COALESCE((_order->>'vales_credito')::integer, 0),
    COALESCE((_order->>'vales_resgatados')::integer, 0),
    COALESCE((_order->>'status')::public.order_status, 'pendente'::public.order_status),
    COALESCE(_order->>'entregador', ''),
    NULLIF(_order->>'observacao', '')
  ) RETURNING * INTO _created;

  INSERT INTO public.order_items (
    user_id, order_id, product_id, nome, qtd, preco_unit, embalagem,
    quantidade_embalagens, preco_embalagem, rotulo_embalagem, retornavel, modo
  )
  SELECT
    _user_id,
    _created.id,
    NULLIF(item->>'product_id', '')::uuid,
    COALESCE(item->>'nome', ''),
    (item->>'qtd')::integer,
    COALESCE((item->>'preco_unit')::numeric, 0),
    NULLIF(item->>'embalagem', ''),
    NULLIF(item->>'quantidade_embalagens', '')::integer,
    NULLIF(item->>'preco_embalagem', '')::numeric,
    NULLIF(item->>'rotulo_embalagem', ''),
    COALESCE((item->>'retornavel')::boolean, false),
    COALESCE(NULLIF(item->>'modo', ''), 'refil')
  FROM jsonb_array_elements(_items) AS item;
  GET DIAGNOSTICS _inserted_items = ROW_COUNT;

  IF _inserted_items <> _expected_items THEN
    RAISE EXCEPTION 'Falha ao gravar todos os itens do pedido';
  END IF;

  IF jsonb_typeof(_payments) = 'array' AND jsonb_array_length(_payments) > 0 THEN
    INSERT INTO public.order_payments (user_id, order_id, forma, valor)
    SELECT
      _user_id,
      _created.id,
      (payment->>'forma')::public.payment_method,
      COALESCE((payment->>'valor')::numeric, 0)
    FROM jsonb_array_elements(_payments) AS payment;
  END IF;

  RETURN _created;
END;
$function$;

REVOKE ALL ON FUNCTION public.create_order_with_items(jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(jsonb, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_order_with_items(jsonb, jsonb, jsonb) TO service_role;
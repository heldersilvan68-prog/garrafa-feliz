CREATE OR REPLACE FUNCTION public.excluir_venda_definitiva(_order_id uuid, _numero integer)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  o public.orders%ROWTYPE;
  c public.clients%ROWTYPE;
  p public.products%ROWTYPE;
  r record;
  vazios numeric;
  refis numeric;
  cota numeric;
  rua numeric := 0;
  fiado numeric := 0;
  recebido numeric := 0;
  excedente numeric := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sessão expirada'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Venda não encontrada'; END IF;
  IF o.numero IS DISTINCT FROM _numero THEN RAISE EXCEPTION 'Número de confirmação incorreto'; END IF;
  IF o.partner_settlement_id IS NOT NULL THEN
    RAISE EXCEPTION 'Desfaça o acerto de parceria antes de excluir esta venda';
  END IF;
  IF o.status <> 'cancelado' AND EXISTS (
    SELECT 1 FROM public.cash_registers cr WHERE cr.user_id = auth.uid() AND cr.fechado_em IS NOT NULL
    AND (cr.id = o.cash_register_id OR cr.dia = (o.created_at AT TIME ZONE 'America/Bahia')::date
      OR (o.pago_em IS NOT NULL AND cr.dia = (o.pago_em AT TIME ZONE 'America/Bahia')::date))
  ) THEN RAISE EXCEPTION 'Esta venda pertence a um caixa fechado. Não é possível excluí-la definitivamente'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.cash_movements m JOIN public.cash_registers cr ON cr.id = m.cash_register_id
    WHERE m.user_id = auth.uid() AND cr.fechado_em IS NOT NULL
    AND (m.motivo LIKE 'Baixa fiado pedido #' || o.numero || ' %'
      OR m.motivo LIKE 'Estorno parceria pedido #' || o.numero || ' %')
  ) THEN RAISE EXCEPTION 'Há recebimentos desta venda em caixa fechado'; END IF;
  IF o.status <> 'cancelado' AND o.entregador <> 'Balcão' AND EXISTS (
    SELECT 1 FROM public.commission_payments cp WHERE cp.user_id = auth.uid()
    AND cp.entregador = o.entregador AND cp.created_at >= o.created_at
  ) THEN RAISE EXCEPTION 'Há comissão paga para este entregador. Desfaça o acerto antes de excluir'; END IF;

  PERFORM 1 FROM public.order_items WHERE order_id = o.id AND user_id = auth.uid() FOR UPDATE;
  PERFORM 1 FROM public.order_payments WHERE order_id = o.id AND user_id = auth.uid() FOR UPDATE;
  SELECT COALESCE(sum(valor),0) INTO recebido FROM public.cash_movements
    WHERE user_id = auth.uid() AND motivo LIKE 'Baixa fiado pedido #' || o.numero || ' %';
  SELECT greatest(0, COALESCE(sum(valor),0) - o.total) INTO excedente FROM public.order_payments
    WHERE order_id = o.id AND user_id = auth.uid();

  -- Expand stored compositions, including the implicit parent consumed by the ERP.
  CREATE TEMP TABLE IF NOT EXISTS exclusao_itens (product_id uuid, qtd numeric, modo text) ON COMMIT DROP;
  DELETE FROM pg_temp.exclusao_itens WHERE product_id IS NOT NULL;
  INSERT INTO pg_temp.exclusao_itens
  SELECT i.product_id, i.qtd, COALESCE(i.modo,'refil') FROM public.order_items i
  WHERE i.order_id = o.id AND i.user_id = auth.uid() AND i.product_id IS NOT NULL
    AND (i.composicao IS NULL OR i.composicao = '[]'::jsonb);
  INSERT INTO pg_temp.exclusao_itens
  SELECT (s->>'produtoId')::uuid, (s->>'qtd')::numeric * i.qtd, 'completa'
  FROM public.order_items i CROSS JOIN LATERAL jsonb_array_elements(i.composicao) s
  WHERE i.order_id = o.id AND i.user_id = auth.uid()
    AND NULLIF(s->>'produtoId','') IS NOT NULL AND (s->>'qtd')::numeric > 0;
  INSERT INTO pg_temp.exclusao_itens
  SELECT i.product_id, i.qtd, 'completa' FROM public.order_items i
  WHERE i.order_id = o.id AND i.user_id = auth.uid() AND i.product_id IS NOT NULL
    AND i.composicao IS NOT NULL AND i.composicao <> '[]'::jsonb
    AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(i.composicao) s
      WHERE s->>'produtoId' = i.product_id::text AND (s->>'qtd')::numeric > 0);

  SELECT COALESCE(sum(i.qtd),0) INTO refis FROM pg_temp.exclusao_itens i
    JOIN public.products pr ON pr.id = i.product_id AND pr.user_id = auth.uid()
    WHERE pr.retornavel AND i.modo = 'refil';
  rua := refis - greatest(0, o.vazios_recolhidos);

  IF o.status <> 'cancelado' THEN
    -- Returnable movements carry the actual applied inventory deltas, including previous reversals.
    FOR r IN SELECT product_id, sum(delta_cheio) cheio, sum(delta_vazio) vazio, sum(delta_patrimonio) patrimonio
      FROM public.returnable_movements WHERE order_id = o.id AND user_id = auth.uid() GROUP BY product_id ORDER BY product_id
    LOOP
      UPDATE public.products SET estoque_cheio = greatest(0, estoque_cheio - COALESCE(r.cheio,0)),
        estoque_vazio = greatest(0, estoque_vazio - COALESCE(r.vazio,0)),
        patrimonio_cascos = greatest(0, patrimonio_cascos - COALESCE(r.patrimonio,0))
      WHERE id = r.product_id AND user_id = auth.uid();
    END LOOP;
    vazios := greatest(0, o.vazios_recolhidos);
    FOR r IN SELECT i.product_id,i.modo,sum(i.qtd) qtd FROM pg_temp.exclusao_itens i
      GROUP BY i.product_id,i.modo ORDER BY i.product_id,i.modo
    LOOP
      SELECT * INTO p FROM public.products WHERE id = r.product_id AND user_id = auth.uid() FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;
      cota := 0;
      IF p.retornavel AND r.modo = 'refil' AND refis > 0 AND vazios > 0 THEN
        cota := least(vazios, round(r.qtd / refis * vazios));
        vazios := vazios - cota;
        refis := refis - r.qtd;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.returnable_movements WHERE order_id = o.id AND product_id = p.id AND user_id = auth.uid()) THEN
        UPDATE public.products SET
          estoque_cheio = estoque_cheio + CASE WHEN p.retornavel AND r.modo = 'casco' THEN 0 ELSE r.qtd END,
          estoque_vazio = greatest(0, estoque_vazio + CASE WHEN p.retornavel AND r.modo = 'casco' THEN r.qtd ELSE -cota END),
          patrimonio_cascos = patrimonio_cascos + CASE WHEN p.retornavel AND r.modo IN ('casco','completa') THEN r.qtd ELSE 0 END
        WHERE id = p.id AND user_id = auth.uid();
      END IF;
    END LOOP;
    IF o.client_id IS NOT NULL THEN
      SELECT * INTO c FROM public.clients WHERE id = o.client_id AND user_id = auth.uid() FOR UPDATE;
      IF FOUND THEN
        IF c.vales_saldo + COALESCE(o.vales_resgatados,0) - COALESCE(o.vales_credito,0) < 0 THEN
          RAISE EXCEPTION 'Os vales vendidos já foram utilizados. Desfaça os resgates antes de excluir';
        END IF;
        IF c.saldo_credito + COALESCE(o.credito_usado,0) < excedente THEN
          RAISE EXCEPTION 'O crédito gerado nesta venda já foi utilizado. Desfaça o uso antes de excluir';
        END IF;
        IF NOT o.pago THEN
          fiado := greatest(0, CASE WHEN o.valor_fiado > 0 THEN o.valor_fiado WHEN o.pagamento = 'Fiado' THEN o.total ELSE 0 END - recebido);
        END IF;
        UPDATE public.clients SET divida = greatest(0, divida - fiado),
          vales_saldo = vales_saldo + COALESCE(o.vales_resgatados,0) - COALESCE(o.vales_credito,0),
          saldo_credito = saldo_credito + COALESCE(o.credito_usado,0) - excedente,
          vasilhames_rua = greatest(0, vasilhames_rua - rua)
        WHERE id = o.client_id AND user_id = auth.uid();
      END IF;
    END IF;
  END IF;
  DELETE FROM public.client_purchases WHERE order_id = o.id AND user_id = auth.uid();
  DELETE FROM public.returnable_movements WHERE order_id = o.id AND user_id = auth.uid();
  DELETE FROM public.expenses WHERE user_id = auth.uid() AND descricao = 'Taxa de cartão — Pedido #' || o.numero;
  DELETE FROM public.cash_movements WHERE user_id = auth.uid()
    AND (motivo LIKE 'Baixa fiado pedido #' || o.numero || ' %' OR motivo LIKE 'Estorno parceria pedido #' || o.numero || ' %');
  DELETE FROM public.order_payments WHERE order_id = o.id AND user_id = auth.uid();
  DELETE FROM public.order_items WHERE order_id = o.id AND user_id = auth.uid();
  DELETE FROM public.orders WHERE id = o.id AND user_id = auth.uid();
  IF o.client_id IS NOT NULL THEN
    UPDATE public.clients SET ultima_compra = (SELECT max(data) FROM public.client_purchases
      WHERE client_id = o.client_id AND user_id = auth.uid())
    WHERE id = o.client_id AND user_id = auth.uid();
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.excluir_venda_definitiva(uuid,integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_venda_definitiva(uuid,integer) TO authenticated;
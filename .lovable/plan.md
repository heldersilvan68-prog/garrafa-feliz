# Acerto de Parcerias no módulo de Comissões

## O que muda para você

1. **Cadastro do cliente**: nova opção "É Empresa Parceira". Quando marcada, aparece na ficha do cliente uma tabela "Regras de comissão" onde você adiciona, edita e remove linhas: Preço de venda praticado (R$) e Comissão por unidade (R$). Cada parceira tem a sua tabela.
2. **Vendas (PDV)**: nada muda no fluxo. Se o cliente for parceiro:
   - Venda em Fiado vai para o saldo devedor da parceira, como já acontece hoje.
   - Venda paga na hora (PIX/Dinheiro/Cartão) fica quitada.
   - A comissão de cada item é calculada automaticamente pela tabela daquele cliente.
3. **Comissões, nova aba "Acerto de Parcerias"**:
   - **Cards gerais (histórico)**: Total de águas entregues via parceria, Total pago em comissões de parcerias, e Lucro líquido com parcerias (faturamento − custo dos produtos − comissões pagas).
   - **Painel de acerto**: você escolhe a parceira e o período. Ele mostra: águas entregues, saldo devedor pendente (fiados em aberto), (−) comissões geradas e (=) **valor líquido a receber**.
   - **Botão "Realizar Acerto de Parceria"**: você escolhe a forma (PIX/Dinheiro/Cartão) e confirma. O sistema quita os fiados da parceira no período e lança o valor líquido no caixa do dia. O total de comissões vira uma despesa na categoria "Comissões de Parceria". Os pedidos ficam marcados como "acertados", para não entrarem duas vezes.
   - Lista dos acertos já feitos, com opção de **estornar** o acerto inteiro.
4. **Cancelamento**:
   - Um pedido cancelado **antes** do acerto não gera comissão e sai do saldo devedor.
   - Um pedido cancelado **depois** do acerto tem a comissão dele estornada: a despesa de comissão diminui. O valor do fiado já recebido é devolvido ao caixa como saída, com o motivo identificado.

## Regras de cálculo

- **Comissão por item**: o sistema procura a linha da tabela com o preço de venda igual ao preço unitário praticado. Se não houver uma igual, usa a linha de maior preço abaixo dele. Se nenhuma servir, a comissão é zero. O valor final é a comissão da linha × a quantidade em unidades.
- Itens vendidos em caixa ou fardo são convertidos para unidades antes do cálculo.
- **Águas entregues**: soma das quantidades dos pedidos concluídos ou em rota.
- **Valor líquido** = saldo devedor pendente − comissões geradas no período. Se esse valor for negativo, o acerto vira um pagamento à parceira: o caixa recebe uma saída.

## Detalhes técnicos

- Migração:
  - `clients.parceiro boolean default false`.
  - Nova tabela `partner_commission_rules` (client_id, preco_venda, comissao_unit).
  - `order_items.comissao_parceria numeric default 0`.
  - `orders.partner_settlement_id uuid null`.
  - Nova tabela `partner_settlements` (client_id, inicio, fim, qtd, fiado_total, comissao_total, liquido, forma, expense_id, cash_movement_id, estornado_em).
  - Todas as tabelas com GRANT e RLS por `user_id`.
- O PDV e a edição de pedido calculam `comissao_parceria` por item com uma função pura nova em `src/lib/parcerias.ts`, e enviam esse valor pelo `create_order_with_items`, que passa a ler o campo opcional.
- Acerto:
  - Marca os pedidos com `pago=true`, `forma_baixa` e `partner_settlement_id`.
  - Cria o movimento identificado em `cash_movements`: suprimento ou sangria para dinheiro, recebimento com sinal para conta digital, seguindo a regra da Tesouraria.
  - Cria a despesa paga "Comissões de Parceria".
  - Atualiza a dívida do cliente.
- O diálogo de cancelamento de pedido ganha um ramo para pedidos com `partner_settlement_id`, que ajusta a despesa e o caixa.
- Componentes novos: `regras-parceria.tsx` (ficha do cliente) e `acerto-parcerias.tsx` (aba em `comissoes.tsx`).

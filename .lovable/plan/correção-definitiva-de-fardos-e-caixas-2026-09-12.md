# Correção definitiva de fardos e caixas

## Objetivo
Garantir que vendas por fardo/caixa usem sempre `quantidade de embalagens × preço da embalagem`, sem ratear pelo preço avulso.

## Alterações
- Guardar em cada item do pedido a embalagem vendida, a quantidade de embalagens e o preço exato por embalagem.
- Centralizar o cálculo e o rótulo do item para que PDV, cards, detalhes, WhatsApp, comprovante e relatórios usem a mesma regra.
- No PDV, manter a baixa de estoque em unidades internas, mas calcular e exibir fardos/caixas diretamente.
- Em Produtos & Reposição, somar o valor exato registrado em cada linha e calcular o custo dos fardos vendidos pelo custo do fardo; manter compatibilidade com vendas antigas.
- Preservar todas as regras atuais de estoque, cancelamento, vales, pagamentos e descontos.

## Dados e compatibilidade
- Acrescentar campos opcionais aos itens de pedido para `embalagem`, `quantidade_embalagens` e `preco_embalagem`.
- Vendas antigas continuam funcionando pelo cálculo atual; novas vendas passam a registrar os dados exatos da embalagem.

## Validação
- Confirmar: 2 × R$ 20,00 = R$ 40,00 e 3 × R$ 15,50 = R$ 46,50 no carrinho, pedido, comprovante e relatório.
- Verificar compilação e telas de PDV, Vendas e Produtos & Reposição.

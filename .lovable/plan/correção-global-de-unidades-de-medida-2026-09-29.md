# Correção global de unidades de medida

## Objetivo
Padronizar a exibição de quantidades de produtos em painéis, relatórios, histórico e pedidos, usando a unidade cadastrada e convertendo unidades internas em caixas/fardos com sobras avulsas.

## Alterações
- Consolidar uma única função de formatação para produzir textos como `2 cx`, `3 fardos` ou `1 cx e 4 un.`.
- Associar os indicadores do painel ao cadastro do produto para que cada linha use sua unidade e fator de embalagem.
- Atualizar relatórios de produtos e entregadores, incluindo detalhamento e exportações, para exibir quantidades convertidas por produto.
- Atualizar cartões, detalhes e comprovantes de pedidos para respeitar a embalagem vendida e a unidade cadastrada, inclusive em pedidos antigos.
- Remover sufixos fixos `un` nas áreas de vendas afetadas, mantendo unidade física apenas onde o dado representa vasilhames avulsos.

## Validação
- Conferir exemplos com múltiplos exatos e sobras, como 12 itens em caixas de 6 (`2 cx`) e 10 itens (`1 cx e 4 un.`).
- Verificar painel, relatórios e pedidos no preview e confirmar que o projeto continua compilando sem erros.

## Detalhes técnicos
- A quantidade armazenada continuará em unidades internas para não alterar estoque nem cálculos financeiros.
- A conversão será somente de apresentação e usará `unidadesPorFardo` mais `unidade` do cadastro do produto.
- Totais que misturam produtos com unidades diferentes serão apresentados como quantidade de itens, sem atribuir uma unidade física incorreta ao agregado.

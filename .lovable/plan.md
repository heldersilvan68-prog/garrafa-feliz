# Integração completa do controle de vasilhames

## Objetivo
Unificar o saldo de cascos do cliente, as devoluções registradas no PDV e o estoque de vazios, preservando os estornos já existentes.

## O que será alterado
- Corrigir a conclusão da venda para aplicar o saldo líquido de cascos do cliente: `retornáveis entregues − vazios recolhidos`, inclusive quando o resultado for negativo.
- Manter todos os vazios recolhidos entrando no estoque, mesmo quando superarem a quantidade entregue naquele pedido.
- Corrigir o cancelamento para desfazer também saldos líquidos negativos, restaurando cliente e estoque ao estado anterior.
- Remover o lançamento genérico duplicado de recolhimento e vincular as movimentações de estoque da venda ao cliente e ao pedido.
- Criar no perfil do cliente o bloco “Controle de Vasilhames / Cascos”, com saldo, histórico de empréstimos/devoluções, origem e botão de devolução manual.
- Reaproveitar e reforçar a devolução manual: limitar ao saldo do cliente, somar os vazios ao depósito e atualizar as listas imediatamente.
- Tornar “Vasilhames na Rua” clicável e abrir uma lista de clientes pendentes com nome, telefone, quantidade, último empréstimo e acesso ao perfil.

## Regras do histórico
- Vendas serão apresentadas pelo saldo líquido do pedido: positivo como empréstimo; negativo como devolução excedente.
- Devoluções manuais virão das movimentações vinculadas ao cliente.
- Pedidos cancelados não aparecerão no histórico nem afetarão saldos.
- Registros antigos continuarão legíveis a partir dos pedidos existentes, sem exigir recriação de dados.

## Detalhes técnicos
- Ampliar as operações de baixa/estorno do estoque para receber `clienteId` e `pedidoId` e persistir esses vínculos no histórico.
- Consultar devoluções manuais por cliente sob demanda, sem carregar todo o histórico global.
- Invalidar clientes, produtos, pedidos e movimentações após cada operação para manter os três módulos sincronizados.
- Validar o fluxo com checagem de compilação e testes de cálculo para `1 entregue / 0 recolhido` e `1 entregue / 2 recolhidos`.

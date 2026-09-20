# Performance
- [x] Endurecer cleanup e reduzir rajadas do Realtime
- [x] Paginar histórico de vasilhames no banco
- [x] Limitar renderização inicial de vendas e clientes com carregamento sob demanda
- [x] Eliminar junções quadráticas nos mapeamentos
- [x] Memorizar cálculos críticos e listas
- [x] Estabilizar cache e validar comportamento

# Precificação de fardos e caixas
- [x] Registrar quantidade e preço exatos da embalagem no item
- [x] Usar multiplicação direta no PDV, pedidos e comprovantes
- [x] Corrigir faturamento e lucro em Produtos & Reposição
- [x] Preservar compatibilidade com vendas antigas

# Endereço de entrega por pedido
- [x] Criar campo específico no banco sem alterar o cadastro do cliente
- [x] Preencher e permitir editar o endereço no PDV
- [x] Usar o endereço específico no pedido e no comprovante

# Controle integrado de vasilhames
- [x] Corrigir saldo líquido e estorno entre PDV, cliente e estoque
- [x] Adicionar saldo, histórico e devolução manual ao perfil do cliente
- [x] Adicionar detalhamento clicável de clientes com cascos na rua

# Período e busca em Vendas
- [x] Restaurar o seletor de período com Hoje como padrão
- [x] Incluir a opção Ontem
- [x] Limitar busca, abas, pagamentos e totais ao período selecionado

# Integridade da finalização de vendas
- [x] Gravar pedido, itens e pagamentos em uma única operação segura
- [x] Calcular e salvar galões de troca diretamente do carrinho
- [x] Recarregar os itens do banco ao abrir o detalhe da venda

# Contagem de volumes e vasilhames
- [x] Impedir itens sem quantidade positiva na gravação
- [x] Somar somente pedidos concluídos no Volume Vendido Hoje
- [x] Padronizar a soma de retornáveis no acerto do entregador

# Impressão e reparo retroativo de itens
- [x] Recarregar e validar os itens antes de imprimir qualquer comprovante
- [x] Impedir impressão de pedidos sem discriminação de produtos
- [x] Reparar quantidades inválidas nos pedidos de ontem e hoje
- [x] Confirmar recálculo de volumes, vasilhames e itens do entregador

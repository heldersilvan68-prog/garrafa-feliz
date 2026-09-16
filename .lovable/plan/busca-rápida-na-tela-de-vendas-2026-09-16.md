# Busca rápida na tela de Vendas

## O que será alterado
- Adicionar, abaixo do botão de nova venda e ao lado do filtro de período, um campo com ícone de lupa e o texto solicitado.
- Filtrar os cards instantaneamente por número do pedido, cliente, entregador ou endereço de entrega.
- Combinar a busca com o período, a aba de status e os subfiltros de forma de pagamento já selecionados.
- Ao limpar o campo, restaurar a listagem normal do filtro atual.

## Detalhes técnicos
- Manter o termo de busca no estado local da tela.
- Normalizar letras maiúsculas/minúsculas e acentos para tornar a pesquisa mais tolerante.
- Aplicar a pesquisa sobre a lista já filtrada e reiniciar o limite visível quando o termo mudar.
- Ajustar contagem, estado vazio e carregamento progressivo para refletirem o resultado pesquisado.

## Validação
- Conferir busca por `#número`, nome, entregador e endereço.
- Conferir combinação com abas, forma de pagamento e período.
- Conferir o layout no cabeçalho e a ausência de erros na tela.

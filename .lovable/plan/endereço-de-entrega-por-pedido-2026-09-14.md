# Endereço de entrega por pedido

## Objetivo
Permitir que cada venda tenha um endereço de entrega próprio, inicialmente preenchido pelo cadastro do cliente, sem alterar a ficha do cliente.

## Implementação
- Adicionar `endereco_entrega` aos pedidos no banco, mantendo compatibilidade com pedidos antigos.
- Gravar o texto editado no PDV nessa coluna ao criar a venda.
- Ler e atualizar esse endereço nas telas de pedidos, inclusive na edição.
- Fazer o comprovante usar primeiro e obrigatoriamente o endereço salvo no pedido; o cadastro do cliente será apenas fallback para registros antigos.
- Manter bairro/endereço principal do cliente inalterados.

## Validação
- Criar um pedido com endereço temporário e confirmar que a ficha do cliente não mudou.
- Conferir o endereço no resumo, detalhes, edição e comprovante.
- Validar compilação e ausência de erros na prévia.

## Detalhes técnicos
- A coluna nova será opcional para preservar pedidos existentes.
- O modelo da aplicação terá `enderecoEntrega`, com fallback para o campo legado `endereco` somente em registros anteriores à mudança.

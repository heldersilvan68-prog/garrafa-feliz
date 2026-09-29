# Entrada de estoque pela unidade cadastrada

## Objetivo
Fazer os campos de estoque do cadastro e da edição do produto aceitarem a unidade principal escolhida, mantendo o banco em unidades internas.

## Alterações
- Detectar quando a unidade selecionada representa caixa, fardo ou pacote e usar o fator “unidades por fardo/caixa”.
- Exibir nos campos de quantidade os valores em caixas/fardos durante criação e edição, sem alterar incorretamente produtos já cadastrados.
- Converter quantidade atual e mínima para unidades internas somente ao salvar; exemplo: 10 caixas × 6 = 60 unidades.
- Atualizar dinamicamente os rótulos para “em caixas”, “em fardos” ou “em unidades”.
- Mostrar o resumo no formato “Total no estoque: 60 unidades (10 caixas)”.
- Validar valores inteiros, não negativos e exigir mais de uma unidade por embalagem quando a medida for caixa/fardo.

## Verificação
- Testar cadastro e edição com CX, FD e UN.
- Confirmar que cards, relatórios e pedidos continuam usando a formatação global já implantada.
- Conferir a tela no navegador e o resultado da compilação.

## Detalhes técnicos
O estado do formulário separará quantidades digitadas das quantidades internas do produto. A conversão será centralizada nos utilitários de medida existentes, evitando multiplicações repetidas ao abrir e salvar uma edição.

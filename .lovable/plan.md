# Otimização de performance, memória e velocidade

## Objetivo
Reduzir o volume inicial transferido e processado, impedir conexões/listeners órfãos e evitar recálculos/re-renderizações desnecessárias, sem alterar os resultados financeiros, de estoque, fiado ou vales.

## Diagnóstico atual
- O Realtime já está centralizado em uma única assinatura global e possui remoção no desmontar; será endurecido contra callbacks após desmontagem e reconexões duplicadas.
- Vendas carrega todas as linhas de `orders`, `order_items` e `order_payments`; Clientes carrega todos os clientes e históricos; Vasilhames limita em 300, mas ainda não pagina.
- A base atual já tem aproximadamente 745 vendas, 653 clientes e 1.524 movimentos de vasilhames, portanto a limitação inicial terá efeito imediato.
- Dashboard, Caixa e Relatórios dependem hoje dessas listas globais. Apenas cortar dados em 20/50 linhas deixaria totais incorretos; a otimização separará listas paginadas dos dados necessários aos cálculos.

## Implementação

### 1. Realtime e ciclo de vida
- Manter uma única conexão global por usuário, com nome estável, cleanup explícito e proteção para não invalidar consultas após desmontagem.
- Revisar os demais `useEffect` de autenticação, impressão, formulários e alertas; preservar listeners/timers apenas enquanto o componente estiver montado.
- Consolidar invalidações repetidas e evitar rajadas de recarga quando uma mesma operação altera várias tabelas relacionadas.

### 2. Paginação real no banco
- Vendas: buscar 50 pedidos por página, em ordem decrescente, trazendo itens e pagamentos apenas dos pedidos daquela página; adicionar “Carregar mais”.
- Clientes: buscar 50 clientes por página, com busca no banco por código exato, nome ou telefone; carregar históricos apenas para os clientes exibidos; adicionar “Carregar mais”.
- Vasilhames: trocar o limite fixo de 300 por páginas de 50 movimentos e botão “Carregar mais”.
- Reiniciar a paginação quando usuário, período, aba ou termo de busca mudar.
- Manter contagens e totais corretos com consultas agregadas/por período independentes das páginas visíveis; nenhum card financeiro será calculado apenas sobre a primeira página.

### 3. Cálculos e renderização
- Memorizar os agrupamentos do Dashboard, Conferência Geral, filtros/contagens de Vendas, indicadores de Clientes e resumo de Vasilhames.
- Estabilizar callbacks e valores dos provedores para que digitar em uma busca ou abrir um modal não redesenhe toda a aplicação.
- Pré-indexar produtos, itens, pagamentos e compras por ID, eliminando buscas e filtros repetidos dentro de loops.
- Memorizar cards repetidos de pedidos/clientes quando isso reduzir renderizações sem dificultar atualizações em tempo real.

### 4. Cache e rede
- Definir tempos de atualização coerentes para dados operacionais, mantendo Realtime como gatilho de atualização e evitando refetch em foco/montagem quando desnecessário.
- Selecionar apenas colunas usadas nas consultas paginadas e manter chaves de cache separadas por usuário, página, período e busca.
- Garantir que mutações atualizem/invalidate somente os conjuntos afetados.

### 5. Validação
- Conferir Vendas, Clientes e Vasilhames com primeira página e carregamento adicional.
- Confirmar que uma alteração em tempo real atualiza a tela uma única vez e que sair/trocar de tela remove a conexão anterior.
- Comparar os totais do Dashboard, Caixa e Relatórios antes/depois com os dados reais.
- Validar filtros, busca exata por código, cancelamento, baixa de fiado e abertura/fechamento de caixa.
- Verificar desktop e mobile, erros do navegador e compilação final.

## Detalhes técnicos
- Paginação por cursor/data e ID, evitando `offset` instável quando novas vendas entram em tempo real.
- Consultas agregadas continuam protegidas pelas regras de acesso do usuário.
- Nenhuma regra contábil será alterada; esta entrega muda carregamento, cache e renderização.

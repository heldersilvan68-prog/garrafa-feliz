# Separar DRE e Saldos em Caixa

## Objetivo
Reorganizar o Financeiro em duas abas claras: uma para o resultado do negócio e outra para a tesouraria operacional em tempo real.

## Alterações
- Adicionar as abas **DRE / Resultado** e **Saldos em Caixa** dentro do Financeiro.
- Manter na aba DRE os indicadores de faturamento, CMV, despesas operacionais, lucro líquido, vendas por pagamento e histórico de fechamentos.
- Remover da aba DRE os três saldos operacionais atuais.
- Levar os cards de espécie, conta digital e saldo total para **Saldos em Caixa**.
- Criar um extrato unificado com filtro entre **Todos**, **Espécie** e **Digital**, mostrando entradas e saídas de vendas, recebimentos, despesas, taxas, suprimentos e sangrias.
- Adicionar conferência rápida dos valores de espécie e digital, exibindo imediatamente a diferença entre o valor informado e o saldo calculado.
- Disponibilizar ajustes rápidos: suprimento/sangria para espécie e ajuste de entrada/saída identificado para digital, sempre exigindo valor e motivo e registrando no histórico existente.

## Detalhes técnicos
- Reutilizar os contextos e cálculos financeiros já existentes, sem criar uma segunda fonte de saldos.
- Ampliar a classificação dos movimentos manuais para que ajustes digitais afetem somente a conta digital e não a gaveta.
- Manter atualização automática após cada lançamento e preservar as regras atuais de caixa aberto.
- Atualizar os metadados da página para refletir DRE e Tesouraria.

## Validação
- Conferir as duas abas em desktop e celular.
- Validar filtros do extrato, diferenças da conferência e lançamentos rápidos.
- Confirmar que a aba DRE não exibe mais os cards de saldo em tempo real e continua mostrando os fechamentos.

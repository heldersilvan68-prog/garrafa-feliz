import { analisarDesempenho, type LinhaRanking } from "@/lib/desempenho";
import type { Despesa } from "@/lib/despesas";
import { rotuloQuantidadeProduto, type Produto } from "@/lib/erp";
import { isoLocal, type Faixa } from "@/lib/periodo";
import type { Pedido } from "@/lib/pedidos";

const r2 = (n: number) => Math.round(n * 100) / 100;

const linha = (l: LinhaRanking) => ({
  nome: l.nome,
  faturamento: r2(l.vendas),
  custo_mercadoria: r2(l.custo),
  lucro_bruto: r2(l.vendas - l.custo),
  pedidos: l.pedidos,
});

/**
 * Resumo compacto do período para a IA, usando exatamente o mesmo calculador
 * do módulo Desempenho para que as respostas batam com as telas do sistema.
 */
export function resumoParaAssistente(
  faixa: Faixa,
  pedidos: Pedido[],
  despesas: Despesa[],
  produtos: Produto[],
  equipe: string[],
  hoje = new Date(),
) {
  const d = analisarDesempenho(faixa, pedidos, despesas, produtos, hoje, new Set(equipe.map((n) => n.trim())));
  const porNome = new Map(produtos.map((p) => [p.nome, p]));
  const porId = new Map(produtos.map((p) => [p.id, p]));
  return {
    periodo: faixa,
    hoje: isoLocal(hoje),
    observacao:
      "Valores em R$. Faturamento considera pedidos concluídos e em rota. Lucro líquido = faturamento − CMV − taxas de cartão − despesas operacionais pagas (compra de mercadoria não entra, já está no CMV). Custos usam o preço de custo atual cadastrado.",
    totais: {
      faturamento: r2(d.resumo.vendas),
      pedidos: d.selecionados.length,
      ticket_medio: r2(d.ticket),
      cmv: r2(d.resumo.custoProduto),
      lucro_bruto: r2(d.resumo.lucroBruto),
      taxas_cartao: r2(d.resumo.taxasCartao),
      despesas_operacionais: r2(d.opReais),
      despesas_pendentes_previstas: r2(d.resumo.despesasPrevistas),
      lucro_liquido: r2(d.resumo.lucroLiquido),
      margem_liquida_pct: r2(d.margemLiquida),
      fiado_em_aberto: r2(d.resumo.fiado),
      pedidos_cancelados: d.cancelados,
      pedidos_pendentes: d.pendentes,
      clientes_novos: d.novosClientes,
      recorrencia_clientes_pct: r2(d.recorrencia),
      ponto_equilibrio_estimado: d.equilibrio,
    },
    periodo_anterior_mesmo_tamanho: {
      faturamento: r2(d.anterior.vendas),
      lucro_liquido: r2(d.anterior.lucroLiquido),
    },
    formas_pagamento: d.resumo.pagamentos.map((p) => ({ forma: p.metodo, valor: r2(p.valor) })),
    produtos: d.produtos.map((l) => {
      const p = porId.get(l.id) ?? porNome.get(l.nome);
      return {
        ...linha(l),
        quantidade_unidades: l.qtd,
        quantidade_formatada: rotuloQuantidadeProduto(l.qtd, p),
      };
    }),
    entregadores: d.equipe.map(linha),
    top_clientes: d.clientes.slice(0, 15).map(linha),
    melhores_dias: d.dias.slice(0, 7).map(linha),
    meses: d.meses.map(linha),
    dias_da_semana: d.semana.map((s) => ({ dia: s.nome, faturamento: r2(s.vendas), pedidos: s.pedidos })),
    despesas_por_categoria: d.categorias.map((c) => ({ categoria: c.nome, valor: r2(c.valor) })),
    estoque: d.estoque.slice(0, 30).map((e) => ({
      produto: e.produto.nome,
      estoque_cheio: rotuloQuantidadeProduto(e.produto.estoqueCheio, e.produto),
      estoque_minimo: e.produto.estoqueMinimo,
      vendido_no_periodo: rotuloQuantidadeProduto(e.vendido, e.produto),
      dias_de_cobertura: e.cobertura === null ? null : r2(e.cobertura),
    })),
  };
}

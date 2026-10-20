import { calcularResumo } from "@/lib/dashboard";
import { CATEGORIA_COMPRA_MERCADORIA, CATEGORIA_TAXA_CARTAO, corCategoriaDespesa, type Despesa } from "@/lib/despesas";
import { expandirComposicao, type Produto } from "@/lib/erp";
import { dentroFaixa, faixaAnterior, isoLocal, isoParaDataLocal, somarDiasIso, type Faixa } from "@/lib/periodo";
import { totalItemPedido, valorFaturado, type Pedido } from "@/lib/pedidos";

export const pedidoRealizado = (p: Pedido) => p.status === "concluido" || p.status === "em-rota";
const somar = <T,>(lista: T[], valor: (item: T) => number) => lista.reduce((s, i) => s + valor(i), 0);
const percentual = (a: number, b: number) => b > 0 ? a / b * 100 : 0;
const compraMercadoria = (categoria: string) => categoria === CATEGORIA_COMPRA_MERCADORIA || categoria.trim().toLocaleLowerCase("pt-BR") === "compra de mercadoria";
export type LinhaRanking = { id: string; nome: string; vendas: number; custo: number; pedidos: number; qtd: number };
export function estimarEquilibrio(vendas: number, cmv: number, taxas: number, despesasBase: number) {
  const contribuicao = vendas - cmv - taxas;
  const margem = vendas > 0 ? contribuicao / vendas : 0;
  const equilibrio = margem > 0 ? Math.max(0, despesasBase) / margem : null;
  return { contribuicao, margem, equilibrio, folga: equilibrio === null ? null : vendas - equilibrio };
}

export function simularResultado(vendas: number, cmv: number, taxas: number, despesas: number, volume: number, preco: number, gastos: number) {
  const receita = vendas * (1 + volume / 100) * (1 + preco / 100);
  const custo = cmv * (1 + volume / 100);
  const taxa = vendas > 0 ? receita * taxas / vendas : 0;
  const operacional = despesas * (1 + gastos / 100);
  return { receita, custo, taxa, operacional, lucro: receita - custo - taxa - operacional };
}

export function analisarDesempenho(faixa: Faixa, pedidos: Pedido[], despesas: Despesa[], produtos: Produto[], hoje = new Date()) {
  const realizados = pedidos.filter(pedidoRealizado);
  const selecionados = realizados.filter(p => dentroFaixa(p.criadoEm, faixa));
  const despesasNormalizadas = despesas.map(d => compraMercadoria(d.categoria) ? { ...d, categoria: CATEGORIA_COMPRA_MERCADORIA } : d);
  const resumo = calcularResumo(faixa, realizados, despesasNormalizadas, produtos, { hoje });
  const anterior = calcularResumo(faixaAnterior(faixa), realizados, despesasNormalizadas, produtos, { hoje });
  const porProduto = new Map(produtos.map(p => [p.id, p]));
  const custoPedido = (p: Pedido) => somar(expandirComposicao(p.itens, produtos), i => (porProduto.get(i.produtoId)?.precoCusto ?? 0) * i.qtd);
  const clientes = new Map<string, LinhaRanking>();
  const equipe = new Map<string, LinhaRanking>();
  const itens = new Map<string, LinhaRanking>();
  const dias = new Map<string, LinhaRanking>();
  const meses = new Map<string, LinhaRanking>();
  const semana = Array.from({ length: 7 }, (_, i) => ({ id: String(i), nome: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][i], vendas: 0, custo: 0, pedidos: 0, qtd: 0 }));
  const acumular = (mapa: Map<string, LinhaRanking>, id: string, nome: string, vendas: number, custo: number, qtd = 0) => {
    const l = mapa.get(id) ?? { id, nome, vendas: 0, custo: 0, pedidos: 0, qtd: 0 };
    l.vendas += vendas; l.custo += custo; l.pedidos++; l.qtd += qtd; mapa.set(id, l);
  };
  const consumo = new Map<string, number>();
  for (const p of selecionados) {
    const venda = valorFaturado(p);
    const custo = custoPedido(p);
    const dia = isoLocal(p.criadoEm);
    acumular(clientes, p.clienteId || p.clienteNome || "sem-cliente", p.clienteNome || "Sem cliente", venda, custo);
    acumular(equipe, p.entregador || "sem-equipe", p.entregador || "Sem entregador", venda, custo);
    acumular(dias, dia, dia, venda, custo);
    acumular(meses, dia.slice(0, 7), dia.slice(0, 7), venda, custo);
    const s = semana[isoParaDataLocal(dia).getUTCDay()];
    if (s) { s.vendas += venda; s.custo += custo; s.pedidos++; }
    const brutoItens = somar(p.itens, totalItemPedido);
    for (const item of p.itens) {
      const custoItem = somar(expandirComposicao([item], produtos), i => (porProduto.get(i.produtoId)?.precoCusto ?? 0) * i.qtd);
      const rateio = brutoItens > 0 ? totalItemPedido(item) / brutoItens : 1 / Math.max(1, p.itens.length);
      acumular(itens, item.produtoId || item.nome, porProduto.get(item.produtoId)?.nome ?? item.nome, venda * rateio, custoItem, item.qtd);
    }
    for (const i of expandirComposicao(p.itens, produtos)) consumo.set(i.produtoId, (consumo.get(i.produtoId) ?? 0) + i.qtd);
  }
  // Inclui dias sem vendas na evolução, sem construir intervalos ilimitados.
  const datas = [...selecionados.map(p => isoLocal(p.criadoEm)), ...despesas.filter(d => dentroFaixa(d.data, faixa)).map(d => d.data)].sort();
  const inicio = faixa.inicio === "0000-01-01" ? datas[0] ?? isoLocal(hoje) : faixa.inicio;
  const fim = faixa.fim > isoLocal(hoje) ? isoLocal(hoje) : faixa.fim;
  const numeroDias = Math.max(1, Math.round((isoParaDataLocal(fim).getTime() - isoParaDataLocal(inicio).getTime()) / 86400000) + 1);
  const mensal = numeroDias > 90;
  const serieMap = new Map<string, { data: string; vendas: number; despesas: number; custo: number; lucro: number }>();
  const obter = (dia: string) => {
    const data = mensal ? dia.slice(0, 7) : dia;
    const l = serieMap.get(data) ?? { data, vendas: 0, despesas: 0, custo: 0, lucro: 0 };
    serieMap.set(data, l); return l;
  };
  if (!mensal && inicio <= fim) {
    for (let i = 0; i < numeroDias; i++) obter(somarDiasIso(inicio, i));
  }
  for (const p of selecionados) { const l = obter(isoLocal(p.criadoEm)); l.vendas += valorFaturado(p); l.custo += custoPedido(p); }
  const categorias = new Map<string, number>();
  for (const d of despesas.filter(d => d.status === "Pago" && dentroFaixa(d.data, faixa) && !compraMercadoria(d.categoria))) {
    obter(d.data).despesas += d.valor;
    categorias.set(d.categoria, (categorias.get(d.categoria) ?? 0) + d.valor);
  }
  const serie = [...serieMap.values()].sort((a, b) => a.data.localeCompare(b.data)).map(l => ({ ...l, lucro: l.vendas - l.custo - l.despesas }));
  const ranking = (mapa: Map<string, LinhaRanking>) => [...mapa.values()].sort((a, b) => b.vendas - a.vendas);
  const categoriasLista = [...categorias].map(([nome, valor]) => ({ nome, valor, cor: corCategoriaDespesa(nome, despesas.map(d => d.categoria)) })).sort((a, b) => b.valor - a.valor);
  const faltandoCusto = [...consumo.keys()].filter(id => !porProduto.get(id) || (porProduto.get(id)?.precoCusto ?? 0) <= 0).length;
  const primeiraCompra = new Map<string, string>();
  for (const p of realizados) {
    if (!p.clienteId) continue;
    const dia = isoLocal(p.criadoEm);
    if (!primeiraCompra.has(p.clienteId) || dia < (primeiraCompra.get(p.clienteId) ?? "")) primeiraCompra.set(p.clienteId, dia);
  }
  const novosClientes = [...clientes.keys()].filter(id => dentroFaixa(primeiraCompra.get(id) ?? "", faixa)).length;
  const opReais = resumo.despesas - resumo.taxasCartao;
  return {
    resumo, anterior, selecionados, numeroDias, serie, mensal,
    clientes: ranking(clientes), equipe: ranking(equipe), produtos: ranking(itens), dias: ranking(dias), meses: ranking(meses), semana,
    categorias: categoriasLista, opReais, faltandoCusto, novosClientes,
    ticket: selecionados.length > 0 ? resumo.vendas / selecionados.length : 0,
    margemLiquida: percentual(resumo.lucroLiquido, resumo.vendas),
    recorrencia: percentual([...clientes.values()].filter(c => c.pedidos > 1).length, clientes.size),
    concentracao: percentual(somar(ranking(clientes).slice(0, 5), c => c.vendas), resumo.vendas),
    cancelados: pedidos.filter(p => p.status === "cancelado" && dentroFaixa(p.criadoEm, faixa)).length,
    pendentes: pedidos.filter(p => p.status === "pendente" && dentroFaixa(p.criadoEm, faixa)).length,
    estoque: produtos.map(p => ({ produto: p, vendido: consumo.get(p.id) ?? 0, cobertura: (consumo.get(p.id) ?? 0) > 0 ? p.estoqueCheio / ((consumo.get(p.id) ?? 0) / numeroDias) : null })).sort((a, b) => (a.cobertura ?? Infinity) - (b.cobertura ?? Infinity)),
    equilibrio: estimarEquilibrio(resumo.vendas, resumo.custoProduto, resumo.taxasCartao, opReais),
    taxaCategoria: CATEGORIA_TAXA_CARTAO,
  };
}
export type Desempenho = ReturnType<typeof analisarDesempenho>;
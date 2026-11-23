import { expandirComposicao, type Produto } from "@/lib/erp";
import { dentroFaixa, type Faixa } from "@/lib/periodo";
import { pedidoRealizado } from "@/lib/desempenho";
import { totalItemPedido, type ItemPedido, type Pedido } from "@/lib/pedidos";

export type DespesaSubLoja = {
  id: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  criadoEm: string;
};

export type FechamentoSubLoja = {
  id: string;
  dia: string;
  faturamento: number;
  pix: number;
  dinheiro: number;
  debito: number;
  credito: number;
  fiado: number;
  vale: number;
  cmv: number;
  despesas: number;
  lucroBruto: number;
  lucroLiquido: number;
  pedidos: number;
  quantidadeItens: number;
  fechadoEm: string;
};

export type LinhaPedidoSubLoja = {
  pedidoId: string;
  numero: number;
  data: string;
  cliente: string;
  produtos: string;
  quantidade: number;
  valor: number;
};

export type ResumoSubLoja = {
  faturamento: number;
  pix: number;
  dinheiro: number;
  debito: number;
  credito: number;
  cartao: number;
  fiado: number;
  vale: number;
  cmv: number;
  despesas: number;
  lucroBruto: number;
  lucroLiquido: number;
  pedidos: number;
  quantidadeItens: number;
  linhas: LinhaPedidoSubLoja[];
};

const centavos = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

/** Custo total preservado no item; vendas antigas sem snapshot usam o cadastro atual. */
export function calcularCmvItem(item: ItemPedido, produtos: Produto[]) {
  if (item.cmv !== undefined) return item.cmv;
  const porId = new Map(produtos.map((produto) => [produto.id, produto]));
  return centavos(
    expandirComposicao([item], produtos).reduce(
      (total, componente) =>
        total + (porId.get(componente.produtoId)?.precoCusto ?? 0) * componente.qtd,
      0,
    ),
  );
}

/** O vínculo salvo no item é histórico; o cadastro atual só serve como compatibilidade. */
export function itemPertenceSubLoja(item: ItemPedido, produtos: Produto[]) {
  return item.subLoja ?? produtos.find((produto) => produto.id === item.produtoId)?.subLoja ?? false;
}

/**
 * Consolida somente os itens marcados. Em pedidos mistos, receita e pagamentos
 * são rateados pela participação bruta desses itens, mantendo o total reconciliado.
 */
export function analisarSubLoja(
  faixa: Faixa,
  pedidos: Pedido[],
  produtos: Produto[],
  despesas: Pick<DespesaSubLoja, "data" | "valor">[],
): ResumoSubLoja {
  const acumulado = {
    faturamento: 0,
    pix: 0,
    dinheiro: 0,
    debito: 0,
    credito: 0,
    fiado: 0,
    vale: 0,
    cmv: 0,
    pedidos: 0,
    quantidadeItens: 0,
  };
  const linhas: LinhaPedidoSubLoja[] = [];

  for (const pedido of pedidos) {
    if (!pedidoRealizado(pedido) || !dentroFaixa(pedido.criadoEm, faixa)) continue;
    const brutoPedido = pedido.itens.reduce((total, item) => total + totalItemPedido(item), 0);
    if (brutoPedido <= 0) continue;
    const itens = pedido.itens.filter((item) => itemPertenceSubLoja(item, produtos));
    if (itens.length === 0) continue;
    const brutoSubLoja = itens.reduce((total, item) => total + totalItemPedido(item), 0);
    const proporcao = Math.min(1, Math.max(0, brutoSubLoja / brutoPedido));
    const valor = centavos(pedido.total * proporcao);
    acumulado.faturamento += valor;
    acumulado.cmv += itens.reduce((total, item) => total + calcularCmvItem(item, produtos), 0);
    acumulado.pedidos += 1;
    acumulado.quantidadeItens += itens.reduce((total, item) => total + item.qtd, 0);

    const pagamentos = pedido.pagamentos.length > 0
      ? pedido.pagamentos
      : [{ forma: pedido.pagamento, valor: pedido.total }];
    for (const pagamento of pagamentos) {
      const parcela = pagamento.valor * proporcao;
      if (pagamento.forma === "PIX") acumulado.pix += parcela;
      else if (pagamento.forma === "Dinheiro") acumulado.dinheiro += parcela;
      else if (pagamento.forma === "Débito") acumulado.debito += parcela;
      else if (pagamento.forma === "Crédito") acumulado.credito += parcela;
      else if (pagamento.forma === "Fiado") acumulado.fiado += parcela;
      else if (pagamento.forma === "Vale") acumulado.vale += parcela;
    }

    linhas.push({
      pedidoId: pedido.id,
      numero: pedido.numero,
      data: pedido.criadoEm,
      cliente: pedido.clienteNome || "Consumidor final",
      produtos: itens.map((item) => `${item.qtd}× ${item.nome}`).join(", "),
      quantidade: itens.reduce((total, item) => total + item.qtd, 0),
      valor,
    });
  }

  const totalDespesas = despesas
    .filter((despesa) => dentroFaixa(despesa.data, faixa))
    .reduce((total, despesa) => total + despesa.valor, 0);
  const faturamento = centavos(acumulado.faturamento);
  const cmv = centavos(acumulado.cmv);
  const totalDespesasCentavos = centavos(totalDespesas);
  const lucroBruto = centavos(faturamento - cmv);

  return {
    faturamento,
    pix: centavos(acumulado.pix),
    dinheiro: centavos(acumulado.dinheiro),
    debito: centavos(acumulado.debito),
    credito: centavos(acumulado.credito),
    cartao: centavos(acumulado.debito + acumulado.credito),
    fiado: centavos(acumulado.fiado),
    vale: centavos(acumulado.vale),
    cmv,
    despesas: totalDespesasCentavos,
    lucroBruto,
    lucroLiquido: centavos(lucroBruto - totalDespesasCentavos),
    pedidos: acumulado.pedidos,
    quantidadeItens: centavos(acumulado.quantidadeItens),
    linhas: linhas.sort((a, b) => b.data.localeCompare(a.data) || b.numero - a.numero),
  };
}

import { totalItemPedido, type Pedido } from "@/lib/pedidos";

export type RegraParceria = {
  id: string;
  clienteId: string;
  precoVenda: number;
  comissaoUnit: number;
};

export type AcertoParceria = {
  id: string;
  clienteId: string;
  inicio: string;
  fim: string;
  qtd: number;
  fiadoTotal: number;
  comissaoTotal: number;
  liquido: number;
  forma: string;
  despesaId?: string;
  estornadoEm?: string;
  em: string;
};

export const CATEGORIA_COMISSAO_PARCERIA = "Comissões de Parceria";

const arred = (v: number) => Math.round(v * 100) / 100;

/**
 * Comissão por unidade para um preço praticado: linha de preço igual ou,
 * na falta, a de maior preço abaixo dele. Sem linha aplicável → zero.
 */
export const comissaoPorUnidade = (regras: RegraParceria[], precoUnit: number) => {
  const p = arred(precoUnit);
  const aplicaveis = regras.filter((r) => arred(r.precoVenda) <= p + 0.001);
  if (aplicaveis.length === 0) return 0;
  return aplicaveis.reduce((m, r) => (r.precoVenda > m.precoVenda ? r : m)).comissaoUnit;
};

/** Comissão total do pedido, item a item (quantidade sempre em unidades). */
export const comissaoPedido = (pedido: Pedido, regras: RegraParceria[]) =>
  arred(
    pedido.itens.reduce((s, i) => {
      if (i.qtd <= 0) return s;
      const precoUnit = totalItemPedido(i) / i.qtd;
      return s + comissaoPorUnidade(regras, precoUnit) * i.qtd;
    }, 0),
  );

export const unidadesPedido = (p: Pedido) => p.itens.reduce((s, i) => s + i.qtd, 0);

/** Pedido válido para parceria: entregue/em rota e não cancelado. */
export const pedidoParceriaValido = (p: Pedido) =>
  p.status === "concluido" || p.status === "em-rota";

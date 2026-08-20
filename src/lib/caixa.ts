import { isoLocal } from "@/lib/periodo";
import { parcelasDe, type FormaPagamento, type Pedido } from "@/lib/pedidos";

export type TipoMovimento = "sangria" | "suprimento" | "recebimento";

export type MovimentoCaixa = {
  id: string;
  tipo: TipoMovimento;
  valor: number;
  motivo: string;
  em: string; // ISO datetime
};

export type Caixa = {
  id: string;
  dia: string; // ISO yyyy-mm-dd
  trocoInicial: number;
  abertoEm: string;
  fechadoEm?: string;
  contado?: number;
  diferenca?: number;
  contadoPix?: number;
  contadoCartao?: number;
  diferencaPix?: number;
  diferencaCartao?: number;
  movimentos: MovimentoCaixa[];
};

export type RegraComissao = {
  entregador: string;
  /** R$ por unidade retornável entregue (galão/vasilhame). */
  porUnidade: number;
  /** % do valor total das entregas concluídas. */
  percentual: number;
};

export type Vale = {
  id: string;
  entregador: string;
  valor: number;
  motivo: string;
  em: string;
};

export type PagamentoComissao = {
  id: string;
  entregador: string;
  valor: number;
  em: string;
};

export const hojeISO = () => isoLocal(new Date());

export const mesmoDia = (iso: string, dia: string) => isoLocal(iso) === dia;

export const FORMAS_DINHEIRO: FormaPagamento[] = ["Dinheiro"];

/** Pedidos válidos (não cancelados) criados no dia. */
export const pedidosDoDia = (pedidos: Pedido[], dia: string) =>
  pedidos.filter((p) => p.status !== "cancelado" && mesmoDia(p.criadoEm, dia));

/** Totais por forma de pagamento no dia. */
export const totaisPorPagamento = (pedidos: Pedido[]) => {
  const base: Record<FormaPagamento, number> = {
    PIX: 0,
    Dinheiro: 0,
    Débito: 0,
    Crédito: 0,
    Fiado: 0,
    Vale: 0,
  };
  for (const p of pedidos) for (const x of parcelasDe(p)) base[x.forma] += x.valor;
  return base;
};


export const somaMovimentos = (movs: MovimentoCaixa[], tipo: TipoMovimento) =>
  movs.filter((m) => m.tipo === tipo).reduce((s, m) => s + m.valor, 0);

/** Total esperado em PIX no dia. */
export const pixEsperado = (pedidos: Pedido[]) => totaisPorPagamento(pedidos).PIX;

/** Total esperado em cartão (débito + crédito) no dia. */
export const cartaoEsperado = (pedidos: Pedido[]) => {
  const t = totaisPorPagamento(pedidos);
  return t.Débito + t.Crédito;
};

/** Dinheiro físico esperado na gaveta. */
export const dinheiroEsperado = (caixa: Caixa, pedidos: Pedido[]) =>
  caixa.trocoInicial +
  totaisPorPagamento(pedidos).Dinheiro +
  somaMovimentos(caixa.movimentos, "suprimento") -
  somaMovimentos(caixa.movimentos, "sangria");

/** Entregas concluídas de um entregador no dia. */
export const entregasDoEntregador = (pedidos: Pedido[], entregador: string, dia: string) =>
  pedidos.filter(
    (p) => p.entregador === entregador && p.status === "concluido" && mesmoDia(p.criadoEm, dia),
  );

export const unidadesRetornaveis = (pedidos: Pedido[]) =>
  pedidos.reduce(
    (s, p) => s + p.itens.filter((i) => i.retornavel).reduce((a, i) => a + i.qtd, 0),
    0,
  );

export const vaziosRecolhidos = (pedidos: Pedido[]) =>
  pedidos.reduce((s, p) => s + p.vaziosRecolhidos, 0);

export const dinheiroRecebido = (pedidos: Pedido[]) => totaisPorPagamento(pedidos).Dinheiro;

export const comissaoCalculada = (regra: RegraComissao, pedidos: Pedido[]) =>
  unidadesRetornaveis(pedidos) * regra.porUnidade +
  (pedidos.reduce((s, p) => s + p.total, 0) * regra.percentual) / 100;

export const horaCurta = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

import type { ModoVenda } from "@/lib/vasilhames";

export type StatusPedido = "pendente" | "em-rota" | "concluido" | "cancelado";

export const STATUS_PEDIDO_LABEL: Record<StatusPedido, string> = {
  pendente: "Pendente",
  "em-rota": "Em rota",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export type FormaPagamento = "PIX" | "Dinheiro" | "Débito" | "Crédito" | "Fiado" | "Vale";

export const FORMAS_PAGAMENTO: FormaPagamento[] = [
  "PIX",
  "Dinheiro",
  "Débito",
  "Crédito",
  "Fiado",
  "Vale",
];

/** Formas efetivamente recebidas na baixa de um fiado. */
export const FORMAS_RECEBIMENTO: FormaPagamento[] = ["PIX", "Dinheiro", "Débito", "Crédito"];



export type ItemPedido = {
  produtoId: string;
  nome: string;
  qtd: number;
  precoUnit: number;
  retornavel: boolean;
  /** Regra de vasilhame aplicada na venda (retornáveis). */
  modo: ModoVenda;
};

/** Uma parcela do recebimento da venda (pagamento fracionado). */
export type PagamentoPedido = { forma: FormaPagamento; valor: number };

export type Pedido = {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  telefone: string;
  endereco: string;
  bairro: string;
  itens: ItemPedido[];
  pagamentos: PagamentoPedido[];
  total: number;
  pagamento: FormaPagamento;
  pago: boolean;
  /** Valor exatamente lançado como fiado nesta venda. */
  valorFiado: number;
  trocoPara?: number;
  /** Vales (galões) vendidos como pacote de crédito nesta venda. */
  valesCredito: number;
  /** Vales (galões) resgatados do saldo do cliente nesta venda. */
  valesResgatados: number;
  vaziosRecolhidos: number;

  entregador: string;
  status: StatusPedido;
  criadoEm: string; // ISO datetime
  observacao?: string;
  motivoCancelamento?: string;
  /** Forma efetivamente recebida ao dar baixa em um fiado. */
  formaBaixa?: FormaPagamento;
  pagoEm?: string;
  obsCancelamento?: string;
};

/** Pedido em fiado ainda não quitado. */
export const fiadoEmAberto = (p: Pedido) =>
  (p.pagamento === "Fiado" || p.valorFiado > 0) && !p.pago && p.status !== "cancelado";

/** Parcelas efetivas do pedido (fallback para pedidos antigos sem detalhamento). */
export const parcelasDe = (p: Pedido): PagamentoPedido[] =>
  p.pagamentos.length > 0 ? p.pagamentos : [{ forma: p.pagamento, valor: p.total }];

/** Total recebido por forma no pedido. */
export const valorPorForma = (p: Pedido, forma: FormaPagamento) =>
  parcelasDe(p)
    .filter((x) => x.forma === forma)
    .reduce((s, x) => s + x.valor, 0);

/**
 * Faturamento novo do pedido: exclui a parte paga em Vale, cujo dinheiro
 * já entrou no caixa quando o cliente comprou o pacote de vales.
 */
export const valorFaturado = (p: Pedido) => Math.max(0, p.total - valorPorForma(p, "Vale"));


export const rotuloPagamento = (p: Pedido) => {
  const parcelas = parcelasDe(p);
  if (parcelas.length <= 1) return p.pagamento;
  return parcelas.map((x) => x.forma).join(" + ");
};

export const MOTIVOS_CANCELAMENTO = [
  "Cliente desistiu",
  "Endereço incorreto",
  "Sem estoque",
  "Outro",
];

export const resumoItens = (itens: ItemPedido[]) =>
  itens.map((i) => `${i.qtd}x ${i.nome}`).join(", ");

export const tempoDecorrido = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ${min % 60}min`;
  return `${Math.floor(h / 24)} d`;
};

export const proximoStatus = (s: StatusPedido): StatusPedido | null =>
  s === "pendente" ? "em-rota" : s === "em-rota" ? "concluido" : null;

export const acaoStatusLabel = (s: StatusPedido) =>
  s === "pendente" ? "Mandar p/ rota" : s === "em-rota" ? "Marcar como entregue" : "";

export const brlSimples = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const reciboWhatsApp = (p: Pedido) => {
  const linhas = p.itens.map((i) => `• ${i.qtd}x ${i.nome} — ${brlSimples(i.qtd * i.precoUnit)}`);
  const texto = [
    `Olá ${p.clienteNome}! Segue o comprovante do seu pedido #${p.numero}:`,
    ...linhas,
    `Total: ${brlSimples(p.total)}`,
    `Pagamento: ${p.pagamento}${p.pagamento === "Fiado" ? " (caderneta)" : ""}`,
    p.vaziosRecolhidos > 0 ? `Vasilhames vazios recolhidos: ${p.vaziosRecolhidos}` : "",
    `Entregador: ${p.entregador}`,
    "Obrigado pela preferência! 💧",
  ]
    .filter(Boolean)
    .join("\n");
  return `https://wa.me/${p.telefone}?text=${encodeURIComponent(texto)}`;
};

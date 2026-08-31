import type { Produto } from "@/lib/erp";

export type TipoMovVasilhame =
  | "recolhido"
  | "envasado"
  | "entrada"
  | "compra"
  | "avaria_cheio"
  | "avaria_vazio"
  | "retorno_sem_envase"
  | "venda_casco"
  | "venda_completa"
  | "devolucao_cliente"
  | "estorno";

export const LABEL_MOV: Record<TipoMovVasilhame, string> = {
  recolhido: "Vazios recolhidos na entrega",
  envasado: "Envase na fonte",
  entrada: "Chegada de carga cheia",
  compra: "Compra de novos vasilhames",
  avaria_cheio: "Avaria/Quebra (garrafão cheio)",
  avaria_vazio: "Avaria/Quebra (garrafão vazio)",
  retorno_sem_envase: "Retorno da fonte sem envasar",
  venda_casco: "Venda de casco avulso",
  venda_completa: "Venda completa (casco + refil)",
  devolucao_cliente: "Devolução de casco pelo cliente",
  estorno: "Estorno de venda cancelada",
};

export type MovimentoVasilhame = {
  id: string;
  produtoId?: string;
  clienteId?: string;
  tipo: TipoMovVasilhame;
  qtd: number;
  motivo?: string;
  usuario?: string;
  deltaCheio: number;
  deltaVazio: number;
  deltaPatrimonio: number;
  /** Dados financeiros da compra (quando a entrada veio de uma nota/fornecedor). */
  custoUnitario?: number;
  valorTotal?: number;
  fornecedor?: string;
  formaPagamento?: string;
  /** Despesa/título gerado no financeiro. */
  despesaId?: string;
  em: string;
};

/** Formas de pagamento de uma compra de mercadoria. */
export const FORMAS_COMPRA = [
  "PIX",
  "Dinheiro",
  "Cartão",
  "Transferência Bancária",
  "Boleto / A Prazo",
] as const;

export type FormaCompra = (typeof FORMAS_COMPRA)[number];

export const aPrazo = (forma: string) => forma === "Boleto / A Prazo";

export const MOTIVOS_AVARIA = [
  "Quebra no Transporte/Carga",
  "Defeito/Descarte na Fonte",
  "Quebra Interna no Depósito",
] as const;

export type MotivoAvaria = (typeof MOTIVOS_AVARIA)[number];

/** Modo de venda de um item retornável. */
export type ModoVenda = "refil" | "casco" | "completa";

export const LABEL_MODO: Record<ModoVenda, string> = {
  refil: "Troca de refil (devolve casco)",
  casco: "Venda de casco avulso",
  completa: "Venda completa (casco + água)",
};

export const retornaveis = (produtos: Produto[]) => produtos.filter((p) => p.retornavel);

/** Métricas consolidadas dos vasilhames retornáveis. */
export function resumoVasilhames(produtos: Produto[], vasilhamesNaRua: number, emTransito: number = 0) {
  const lista = retornaveis(produtos);
  const cheios = lista.reduce((s, p) => s + p.estoqueCheio, 0);
  const vazios = lista.reduce((s, p) => s + p.estoqueVazio, 0);
  const custoEnvase = lista.reduce((s, p) => s + p.estoqueVazio * (p.custoEnvase || p.precoCusto || 0), 0);
  const valorVenda = lista.reduce((s, p) => s + p.estoqueCheio * p.precoVenda, 0);
  const valorCusto = lista.reduce((s, p) => s + p.estoqueCheio * p.precoCusto, 0);

  // Patrimônio é ativo imobilizado: vem do saldo fixo de cascos de cada produto,
  // nunca da soma dinâmica de cheios + vazios (que é só movimentação de estado).
  const patrimonioCascos = lista.reduce((s, p) => s + (p.patrimonioCascos || 0), 0);
  const patrimonioValor = lista.reduce(
    (s, p) => s + (p.patrimonioCascos || 0) * p.custoCasco,
    0,
  );

  return {
    cheios,
    vazios,
    naRua: vasilhamesNaRua,
    emTransito,
    // Patrimônio Total Fixo (ativo imobilizado), alterado só por compra,
    // avaria/perda e venda definitiva de casco.
    patrimonio: patrimonioCascos,
    patrimonioValor,
    custoEnvasePrevisto: custoEnvase,
    valorVenda,
    lucroProjetado: valorVenda - valorCusto,
  };
}

/** Métricas globais do estoque (todos os produtos). */
export function resumoEstoqueGeral(produtos: Produto[]) {
  const custo = produtos.reduce((s, p) => s + p.estoqueCheio * p.precoCusto, 0);
  const venda = produtos.reduce((s, p) => s + p.estoqueCheio * p.precoVenda, 0);
  const baixos = produtos.filter((p) => p.estoqueCheio <= p.estoqueMinimo);
  return { custo, venda, lucro: venda - custo, baixos };
}
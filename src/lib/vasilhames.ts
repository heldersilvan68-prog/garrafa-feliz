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
  entrada: "Entrada de estoque cheio",
  compra: "Compra de vasilhames",
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
  em: string;
};

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
export function resumoVasilhames(produtos: Produto[], vasilhamesNaRua: number) {
  const lista = retornaveis(produtos);
  const cheios = lista.reduce((s, p) => s + p.estoqueCheio, 0);
  const vazios = lista.reduce((s, p) => s + p.estoqueVazio, 0);
  const custoEnvase = lista.reduce((s, p) => s + p.estoqueVazio * (p.custoEnvase || p.precoCusto || 0), 0);
  const valorVenda = lista.reduce((s, p) => s + p.estoqueCheio * p.precoVenda, 0);
  const valorCusto = lista.reduce((s, p) => s + p.estoqueCheio * p.precoCusto, 0);
  const patrimonioValor = lista.reduce(
    (s, p) => s + (p.estoqueCheio + p.estoqueVazio) * p.custoCasco,
    0,
  );
  return {
    cheios,
    vazios,
    naRua: vasilhamesNaRua,
    patrimonio: cheios + vazios + vasilhamesNaRua,
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

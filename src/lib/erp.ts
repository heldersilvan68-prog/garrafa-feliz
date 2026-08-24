/** Categorias são cadastros dinâmicos no banco (product_categories). */
export type Categoria = string;

/** Sugestões usadas apenas quando o usuário ainda não cadastrou nenhuma categoria. */
export const CATEGORIAS_SUGERIDAS: string[] = [
  "Galão 20L",
  "Galão 10L",
  "Água Mineral 500ml",
  "Água Mineral 1,5L",
  "Refrigerante",
  "Cerveja",
  "Energético",
];

export type Produto = {
  id: string;
  nome: string;
  categoria: Categoria;
  marca?: string;
  unidade?: string;
  /** URL da foto do produto (opcional). */
  imagemUrl?: string;
  precoCusto: number;
  precoVenda: number;
  estoqueMinimo: number;
  retornavel: boolean;
  estoqueCheio: number;
  estoqueVazio: number;
  /** Custo do vasilhame/casco vazio (usado em avarias e patrimônio). */
  custoCasco: number;
  /** Custo do envase na fonte (usado na previsão de custo e avarias). */
  custoEnvase: number;
  /** Quantidade de unidades por fardo/caixa (1 = vendido só avulso). */
  unidadesPorFardo: number;
  /** Preço de custo do fardo/caixa fechado (R$). */
  precoCustoFardo: number;
  /** Preço de venda do fardo/caixa fechado (R$). */
  precoFardo: number;
  /** Margem de lucro desejada (%) usada para sugerir o preço de venda. */
  margemDesejada: number;
  /** Preço de venda do casco/vasilhame vazio (R$). */
  precoVendaCasco: number;
  /** Desconto automático aplicado na venda completa (casco + água), em R$. */
  descontoCompleta: number;
  /** Promoção de atacado: quantidade do combo (0 = sem promoção). */
  promoQtd: number;
  /** Promoção de atacado: preço do combo fechado (R$). */
  promoPreco: number;
  /**
   * Patrimônio fixo de cascos (ativo imobilizado). Só muda em compra de
   * vasilhames, avarias/perdas e venda definitiva de casco.
   */
  patrimonioCascos: number;
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/* ---------- Fardos / caixas e precificação ---------- */

/** Unidades por fardo (mínimo 1 — produtos vendidos apenas avulsos). */
export const unidPorFardo = (p: Pick<Produto, "unidadesPorFardo">) =>
  Math.max(1, Math.floor(p.unidadesPorFardo || 1));

/** Converte um total de unidades em fardos + unidades soltas. */
export const emFardos = (unidades: number, porFardo: number) => {
  const upf = Math.max(1, Math.floor(porFardo || 1));
  const total = Math.max(0, Math.floor(unidades || 0));
  return { fardos: Math.floor(total / upf), soltas: total % upf, porFardo: upf };
};

/** Texto amigável do estoque: "10 fardos e 6 un." */
export const rotuloEstoque = (unidades: number, porFardo: number) => {
  const { fardos, soltas, porFardo: upf } = emFardos(unidades, porFardo);
  if (upf <= 1) return `${Math.max(0, Math.floor(unidades || 0))} un.`;
  const partes: string[] = [];
  if (fardos > 0) partes.push(`${fardos} ${fardos === 1 ? "fardo" : "fardos"}`);
  if (soltas > 0 || fardos === 0) partes.push(`${soltas} un.`);
  return partes.join(" e ");
};

/** Preço de venda sugerido: custo + (custo × margem / 100). */
export const precoSugerido = (custo: number, margem: number) =>
  Math.round((custo + (custo * (margem || 0)) / 100) * 100) / 100;

/** Margem real praticada sobre o custo (%). */
export const margemReal = (custo: number, venda: number) =>
  custo > 0 ? ((venda - custo) / custo) * 100 : 0;

/* ---------- Promoções progressivas (atacado) ---------- */

/** Produto com tabela de atacado configurada ("a cada X unidades por R$ Y"). */
export const temPromocao = (p: Pick<Produto, "promoQtd" | "promoPreco">) =>
  (p.promoQtd || 0) > 1 && (p.promoPreco || 0) > 0;

/**
 * Total do item aplicando a promoção progressiva:
 * combos fechados no preço do lote + unidades restantes no preço avulso.
 */
export const totalComPromocao = (
  qtd: number,
  precoUnit: number,
  promoQtd: number,
  promoPreco: number,
) => {
  const q = Math.max(0, Math.floor(qtd || 0));
  if (!(promoQtd > 1 && promoPreco > 0)) return q * precoUnit;
  const combos = Math.floor(q / promoQtd);
  const restante = q % promoQtd;
  return Math.round((combos * promoPreco + restante * precoUnit) * 100) / 100;
};

/** Preço de venda praticado conforme o modo de venda de um retornável. */
export const precoPorModo = (
  p: Pick<Produto, "precoVenda" | "precoVendaCasco" | "descontoCompleta" | "custoCasco">,
  modo: "refil" | "casco" | "completa",
) => {
  // Sem preço de venda do casco cadastrado, usa o custo do casco como base
  // para nunca exibir R$ 0,00 no PDV.
  const casco = p.precoVendaCasco || p.custoCasco || 0;
  if (modo === "casco") return Math.round(casco * 100) / 100;
  if (modo === "completa")
    return Math.max(
      0,
      Math.round(((p.precoVenda || 0) + casco - (p.descontoCompleta || 0)) * 100) / 100,
    );
  return p.precoVenda || 0;
};

/** Valor do estoque considerando fardos fechados + unidades avulsas. */
export const valorEstoque = (p: Produto) => {
  const upf = unidPorFardo(p);
  if (upf <= 1 || !(p.precoFardo > 0)) return (p.estoqueCheio || 0) * (p.precoVenda || 0);
  const { fardos, soltas } = emFardos(p.estoqueCheio || 0, upf);
  return fardos * p.precoFardo + soltas * (p.precoVenda || 0);
};

/** Lucro previsto por unidade/fardo. */
export const lucroPrevisto = (custo: number, venda: number) => venda - custo;

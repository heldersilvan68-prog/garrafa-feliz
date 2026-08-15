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

/** Lucro previsto por unidade/fardo. */
export const lucroPrevisto = (custo: number, venda: number) => venda - custo;

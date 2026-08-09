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
};

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

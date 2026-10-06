import { isoLocal, somarDiasIso } from "@/lib/periodo";

export const CATEGORIAS_DESPESA = [
  "Combustível",
  "Manutenção/Frota",
  "Contas Fixas",
  "Aluguel",
  "Salários/Comissões",
  "Compra de Vasilhames",
  "Outros",
] as const;

export type CategoriaDespesa = string;

/** Categoria automática das taxas de maquininha lançadas pelas vendas em cartão. */
export const CATEGORIA_TAXA_CARTAO = "Taxas de Cartão / Maquininha";

/** Categoria automática das compras de mercadoria (entradas de estoque). */
export const CATEGORIA_COMPRA_MERCADORIA = "Compra de Mercadoria / Fornecedores";

/** Categoria automática do custo de envase/recarga na fonte. */
export const CATEGORIA_ENVASE = "Custo de Envase / Recarga";

export const FORMAS_DESPESA = [
  "PIX",
  "Dinheiro do Caixa",
  "Transferência Bancária",
  "Cartão",
  "Boleto",
] as const;

export type FormaDespesa = (typeof FORMAS_DESPESA)[number];

export type StatusDespesa = "Pago" | "Pendente";

export type Despesa = {
  id: string;
  descricao: string;
  categoria: CategoriaDespesa;
  valor: number;
  data: string; // ISO yyyy-mm-dd (vencimento/pagamento)
  forma: FormaDespesa;
  status: StatusDespesa;
  observacoes?: string;
  criadoEm: string;
  /** Série de despesa recorrente mensal (mesmo ID em todas as parcelas). */
  recorrenciaId?: string;
  recorrenciaDia?: number;
  /** Quantidade total de meses; vazio = indefinido. */
  recorrenciaMeses?: number;
  recorrenciaParcela?: number;
};

/** Data da k-ésima ocorrência mensal (k=0 é o mês inicial), ajustando o dia ao fim do mês. */
export const dataRecorrente = (inicioIso: string, k: number, dia: number) => {
  const [a, m] = inicioIso.split("-").map(Number);
  const total = a * 12 + (m - 1) + k;
  const ano = Math.floor(total / 12);
  const mes = (total % 12) + 1;
  const ultimo = new Date(ano, mes, 0).getDate();
  const d = Math.min(Math.max(1, dia), ultimo);
  return `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
};

/** Meses gerados antecipadamente para recorrências indefinidas. */
export const HORIZONTE_RECORRENCIA = 12;

export const CORES_CATEGORIA: Record<string, string> = {
  Combustível: "var(--color-expense-orange)",
  "Manutenção/Frota": "var(--color-expense-red)",
  "Contas Fixas": "var(--color-expense-blue)",
  Aluguel: "var(--color-expense-green)",
  "Salários/Comissões": "var(--color-expense-purple)",
  "Compra de Vasilhames": "var(--color-expense-yellow)",
  Outros: "var(--color-expense-slate)",
  [CATEGORIA_TAXA_CARTAO]: "var(--color-expense-pink)",
  [CATEGORIA_COMPRA_MERCADORIA]: "var(--color-expense-turquoise)",
  [CATEGORIA_ENVASE]: "var(--color-expense-lime)",
};

const PALETA_DESPESAS = Object.values(CORES_CATEGORIA);

/** Mantém cores estáveis para categorias manuais ao trocar o período. */
export function corCategoriaDespesa(categoria: string, categorias: string[]) {
  const registrada = Object.hasOwn(CORES_CATEGORIA, categoria) ? CORES_CATEGORIA[categoria] : undefined;
  if (registrada) return registrada;
  const manuais = [...new Set(categorias)].filter((c) => !Object.hasOwn(CORES_CATEGORIA, c)).sort();
  const usadas = new Set(categorias.map((c) => CORES_CATEGORIA[c]).filter(Boolean));
  const livres = PALETA_DESPESAS.filter((cor) => !usadas.has(cor));
  const paleta = livres.length ? livres : PALETA_DESPESAS;
  return paleta[Math.max(0, manuais.indexOf(categoria)) % paleta.length];
}

export const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

/** Despesas dentro de um período (em dias) contando a partir de hoje. */
export const despesasNoPeriodo = (despesas: Despesa[], periodo: string) => {
  const hojeIso = isoLocal(new Date());
  if (periodo === "hoje") return despesas.filter((d) => isoLocal(d.data) === hojeIso);
  if (periodo === "7d" || periodo === "30d") {
    const dias = periodo === "7d" ? 7 : 30;
    const limite = somarDiasIso(hojeIso, -dias);
    return despesas.filter((d) => d.data >= limite && d.data <= hojeIso);
  }
  if (periodo === "mes") {
    const prefixo = hojeIso.slice(0, 7);
    return despesas.filter((d) => d.data.startsWith(prefixo));
  }
  return despesas;
};

export const somaDespesas = (despesas: Despesa[]) => despesas.reduce((s, d) => s + d.valor, 0);

export const despesasDoMes = (despesas: Despesa[]) => despesasNoPeriodo(despesas, "mes");

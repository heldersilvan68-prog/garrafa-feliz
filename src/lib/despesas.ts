import { isoLocal } from "@/lib/periodo";

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

export const FORMAS_DESPESA = [
  "PIX",
  "Dinheiro do Caixa",
  "Transferência Bancária",
  "Cartão",
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
};

export const CORES_CATEGORIA: Record<string, string> = {
  Combustível: "var(--color-primary)",
  "Manutenção/Frota": "var(--color-warning)",
  "Contas Fixas": "var(--color-destructive)",
  Aluguel: "var(--color-success)",
  "Salários/Comissões": "var(--color-accent)",
  "Compra de Vasilhames": "var(--color-muted-foreground)",
  Outros: "var(--color-secondary-foreground)",
};

export const dataBR = (iso: string) => {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

/** Despesas dentro de um período (em dias) contando a partir de hoje. */
export const despesasNoPeriodo = (despesas: Despesa[], periodo: string) => {
  const hoje = new Date();
  const iso = (d: Date) => isoLocal(d);
  if (periodo === "hoje") return despesas.filter((d) => d.data === iso(hoje));
  if (periodo === "7d" || periodo === "30d") {
    const dias = periodo === "7d" ? 7 : 30;
    const limite = new Date(hoje);
    limite.setDate(limite.getDate() - dias);
    return despesas.filter((d) => d.data >= iso(limite) && d.data <= iso(hoje));
  }
  if (periodo === "mes") {
    const prefixo = iso(hoje).slice(0, 7);
    return despesas.filter((d) => d.data.startsWith(prefixo));
  }
  return despesas;
};

export const somaDespesas = (despesas: Despesa[]) => despesas.reduce((s, d) => s + d.valor, 0);

export const despesasDoMes = (despesas: Despesa[]) => despesasNoPeriodo(despesas, "mes");

/**
 * Fonte única de verdade dos filtros de período do sistema.
 * Todas as telas (Dashboard, Vendas, Financeiro, Relatórios, Caixa) usam
 * exatamente esta lógica de intervalo para que os números batam entre módulos.
 */

export type PeriodoId = "hoje" | "mes" | "7d" | "30d" | "tudo" | "custom";

export type Faixa = { inicio: string; fim: string };

export const PERIODOS: { id: PeriodoId; label: string }[] = [
  { id: "hoje", label: "Hoje" },
  { id: "mes", label: "Mês atual" },
  { id: "7d", label: "Últimos 7 dias" },
  { id: "30d", label: "Últimos 30 dias" },
  { id: "tudo", label: "Todo o período" },
  { id: "custom", label: "Personalizado" },
];

export const INICIO_TUDO = "0000-01-01";
export const FIM_TUDO = "9999-12-31";

/** ISO yyyy-mm-dd no fuso local (evita o deslocamento de toISOString). */
export const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function faixaPeriodo(
  periodo: PeriodoId,
  custom: Faixa = { inicio: "", fim: "" },
  hoje = new Date()
): Faixa {
  const fim = isoLocal(hoje);
  const menos = (dias: number) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - dias);
    return isoLocal(d);
  };

  switch (periodo) {
    case "hoje": {
      const hojeStr = isoLocal(hoje);
      return { inicio: hojeStr, fim: hojeStr };
    }
    case "7d":
      return { inicio: menos(6), fim };
    case "30d":
      return { inicio: menos(29), fim };
    case "mes":
      return { inicio: `${fim.slice(0, 7)}-01`, fim };
    case "custom":
      return { inicio: custom.inicio || INICIO_TUDO, fim: custom.fim || FIM_TUDO };
    default:
      return { inicio: INICIO_TUDO, fim: FIM_TUDO };
  }
}

/** Intervalo imediatamente anterior, do mesmo tamanho (para variação %). */
export function faixaAnterior(f: Faixa): Faixa {
  if (f.inicio === INICIO_TUDO) return { inicio: INICIO_TUDO, fim: INICIO_TUDO };
  const ini = new Date(`${f.inicio}T00:00:00`);
  const fim = new Date(`${f.fim}T00:00:00`);
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1;
  const novoFim = new Date(ini);
  novoFim.setDate(novoFim.getDate() - 1);
  const novoIni = new Date(novoFim);
  novoIni.setDate(novoIni.getDate() - (dias - 1));
  return { inicio: isoLocal(novoIni), fim: isoLocal(novoFim) };
}

/** Aceita data (yyyy-mm-dd) ou datetime ISO. */
export const dentroFaixa = (iso: string, f: Faixa) => {
  if (!iso) return false;
  const d = new Date(iso);
  const dia = isoLocal(d);
  return dia >= f.inicio && dia <= f.fim;
};

export const rotuloFaixa = (f: Faixa) =>
  f.inicio === INICIO_TUDO
    ? "Todo o período"
    : f.inicio === f.fim
      ? f.inicio.split("-").reverse().join("/")
      : `${f.inicio.split("-").reverse().join("/")} até ${f.fim.split("-").reverse().join("/")}`;

/** Um único dia selecionado (usado para séries por hora). */
export const faixaDeUmDia = (f: Faixa) => f.inicio === f.fim;

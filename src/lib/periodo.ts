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

/** Fuso operacional do sistema (America/Bahia, UTC-3, sem horário de verão). */
export const TIMEZONE = "America/Bahia";
const OFFSET = "-03:00";

const fmtDia = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * ISO yyyy-mm-dd sempre no fuso America/Bahia, independente do fuso do
 * navegador/servidor. Aceita Date ou string (data ou datetime ISO).
 */
export const isoLocal = (d: Date | string) => {
  if (typeof d === "string") {
    if (!d) return "";
    if (!d.includes("T")) return d.slice(0, 10);
    return fmtDia.format(new Date(d));
  }
  return fmtDia.format(d);
};

/** Converte yyyy-mm-dd em Date ancorado ao meio-dia de Bahia (round-trip seguro). */
export const isoParaDataLocal = (iso: string) =>
  new Date(`${iso.slice(0, 10)}T12:00:00${OFFSET}`);

/** "Agora" com os componentes de data/hora de Bahia. */
export const agoraLocal = () => new Date();

/** Hora do dia (0-23) em Bahia. */
export const horaLocal = (iso: string | Date) =>
  Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIMEZONE,
      hour: "2-digit",
      hour12: false,
    }).format(typeof iso === "string" ? new Date(iso) : iso),
  ) % 24;

/** Soma dias a um yyyy-mm-dd sem sofrer deslocamento de fuso. */
export const somarDiasIso = (iso: string, n: number) => {
  const d = isoParaDataLocal(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return isoLocal(d);
};

export function faixaPeriodo(
  periodo: PeriodoId,
  custom: Faixa = { inicio: "", fim: "" },
  hoje = new Date()
): Faixa {
  const fim = isoLocal(hoje);
  const menos = (dias: number) => somarDiasIso(fim, -dias);

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
  const ini = isoParaDataLocal(f.inicio);
  const fim = isoParaDataLocal(f.fim);
  const dias = Math.round((fim.getTime() - ini.getTime()) / 86_400_000) + 1;
  const novoFim = somarDiasIso(f.inicio, -1);
  const novoIni = somarDiasIso(novoFim, -(dias - 1));
  return { inicio: novoIni, fim: novoFim };
}

/** Aceita data (yyyy-mm-dd) ou datetime ISO. */
export const dentroFaixa = (iso: string, f: Faixa) => {
  if (!iso) return false;
  const dia = isoLocal(iso);
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

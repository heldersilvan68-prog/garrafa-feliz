import { useMemo, useState } from "react";
import { faixaPeriodo, type Faixa, type PeriodoId } from "@/lib/periodo";

/** Estado padronizado do filtro global de datas usado por todas as listagens. */
export function usePeriodo(inicial: PeriodoId = "mes") {
  const [periodo, setPeriodo] = useState<PeriodoId>(inicial);
  const [custom, setCustom] = useState<Faixa>({ inicio: "", fim: "" });
  const faixa = useMemo(() => faixaPeriodo(periodo, custom), [periodo, custom]);
  return { periodo, setPeriodo, custom, setCustom, faixa };
}

export type FiltroPeriodoState = ReturnType<typeof usePeriodo>;

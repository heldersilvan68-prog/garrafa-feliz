import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { useCaixa } from "@/context/caixa";
import { useConfiguracoes } from "@/context/configuracoes";

/** Minutos desde a meia-noite no fuso da operação (America/Bahia). */
const minutosAgora = () => {
  const agora = new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Bahia",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const [h, m] = agora.split(":").map(Number);
  return h * 60 + m;
};

const paraMinutos = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

/**
 * Banner de lembrete: aparece quando o caixa continua aberto depois do
 * "Horário limite de fechamento" definido nas Configurações.
 */
export function AlertaFechamentoCaixa() {
  const { caixaAberto } = useCaixa();
  const { config } = useConfiguracoes();
  const [agora, setAgora] = useState(() => minutosAgora());

  useEffect(() => {
    const t = setInterval(() => setAgora(minutosAgora()), 60_000);
    return () => clearInterval(t);
  }, []);

  const limite = config.horarioLimiteCaixa ? paraMinutos(config.horarioLimiteCaixa) : null;
  if (!caixaAberto || limite === null || agora < limite) return null;

  return (
    <Link
      to="/caixa"
      className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-500/20 dark:text-amber-200"
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">
        <strong>Atenção:</strong> o caixa do dia continua aberto após {config.horarioLimiteCaixa}.
        Confira os valores e realize o fechamento da sessão.
      </span>
      <ChevronRight className="size-4 shrink-0" />
    </Link>
  );
}

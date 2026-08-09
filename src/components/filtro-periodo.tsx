import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PERIODOS, type PeriodoId } from "@/lib/periodo";
import type { FiltroPeriodoState } from "@/hooks/use-periodo";
import { cn } from "@/lib/utils";

/** Seletor de período padrão do sistema (Hoje, Mês atual, 7/30 dias, Personalizado). */
export function FiltroPeriodo({
  estado,
  className,
  comRotulos = false,
}: {
  estado: FiltroPeriodoState;
  className?: string;
  comRotulos?: boolean;
}) {
  const { periodo, setPeriodo, custom, setCustom } = estado;

  return (
    <div className={cn("flex flex-wrap items-end gap-2", className)}>
      <div className="grid gap-2">
        {comRotulos ? <Label>Período</Label> : null}
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoId)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {periodo === "custom" ? (
        <>
          <div className="grid gap-2">
            {comRotulos ? <Label htmlFor="periodo-de">De</Label> : null}
            <Input
              id="periodo-de"
              type="date"
              aria-label="Data inicial"
              value={custom.inicio}
              onChange={(e) => setCustom((c) => ({ ...c, inicio: e.target.value }))}
            />
          </div>
          <div className="grid gap-2">
            {comRotulos ? <Label htmlFor="periodo-ate">Até</Label> : null}
            <Input
              id="periodo-ate"
              type="date"
              aria-label="Data final"
              value={custom.fim}
              onChange={(e) => setCustom((c) => ({ ...c, fim: e.target.value }))}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

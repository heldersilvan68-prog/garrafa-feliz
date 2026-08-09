import { Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/** Placeholder de carregamento para listas e tabelas do painel. */
export function ListaCarregando({ linhas = 5 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Carregando dados da nuvem...
      </div>
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
  );
}

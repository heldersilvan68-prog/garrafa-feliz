import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

/** Thumbnail quadrada padrão da foto do produto (fallback com ícone). */
export function ProdutoFoto({
  url,
  nome,
  className,
}: {
  url?: string;
  nome: string;
  className?: string;
}) {
  const base = cn("size-10 shrink-0 rounded-md border border-border", className);
  if (!url) {
    return (
      <div className={cn(base, "grid place-items-center bg-muted text-muted-foreground")}>
        <Package className="size-4" />
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={`Foto de ${nome}`}
      loading="lazy"
      className={cn(base, "object-cover")}
    />
  );
}

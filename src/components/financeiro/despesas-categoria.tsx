import { useMemo, useState } from "react";
import { Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brl } from "@/lib/erp";
import type { Despesa } from "@/lib/despesas";

/** Soma das despesas agrupadas por categoria. */
export function agruparPorCategoria(despesas: Despesa[]) {
  const mapa = new Map<string, number>();
  for (const d of despesas) mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor);
  return [...mapa.entries()]
    .map(([categoria, valor]) => ({ categoria, valor }))
    .sort((a, b) => b.valor - a.valor);
}

/** Soma das despesas agrupadas por descrição (evita listas repetitivas). */
export function agruparPorDescricao(despesas: Despesa[]) {
  const mapa = new Map<string, { descricao: string; valor: number; qtd: number }>();
  for (const d of despesas) {
    const chave = (d.descricao || d.categoria).trim().toLowerCase();
    const atual = mapa.get(chave) ?? { descricao: d.descricao || d.categoria, valor: 0, qtd: 0 };
    atual.valor += d.valor;
    atual.qtd += 1;
    mapa.set(chave, atual);
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

/**
 * Tabela "Despesas por categoria" com linhas clicáveis: ao clicar, abre o
 * detalhamento dos lançamentos agrupados por descrição no período filtrado.
 */
export function TabelaDespesasCategoria({ despesas }: { despesas: Despesa[] }) {
  const categorias = useMemo(() => agruparPorCategoria(despesas), [despesas]);
  const [aberta, setAberta] = useState<string | null>(null);

  const detalhe = useMemo(
    () => (aberta ? agruparPorDescricao(despesas.filter((d) => d.categoria === aberta)) : []),
    [aberta, despesas],
  );
  const totalDetalhe = detalhe.reduce((s, d) => s + d.valor, 0);

  if (categorias.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Nenhuma despesa lançada no período.
      </p>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Categoria</TableHead>
            <TableHead className="text-right">Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorias.map((c) => (
            <TableRow
              key={c.categoria}
              tabIndex={0}
              role="button"
              aria-label={`Ver lançamentos de ${c.categoria}`}
              className="cursor-pointer"
              onClick={() => setAberta(c.categoria)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") setAberta(c.categoria);
              }}
            >
              <TableCell className="font-medium">
                <span className="flex items-center gap-2">
                  <Layers className="size-3.5 text-muted-foreground" />
                  {c.categoria}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">{brl(c.valor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={aberta !== null} onOpenChange={(o) => !o && setAberta(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{aberta}</DialogTitle>
            <DialogDescription>
              Lançamentos agrupados por descrição no período · total {brl(totalDetalhe)}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Lançamentos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhe.map((d) => (
                  <TableRow key={d.descricao}>
                    <TableCell className="font-medium">{d.descricao}</TableCell>
                    <TableCell className="text-right tabular-nums">{d.qtd}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(d.valor)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Modal com a tabela de despesas por categoria (usado na Gestão de Despesas). */
export function DespesasCategoriaDialog({
  open,
  onOpenChange,
  despesas,
  rotuloPeriodo,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  despesas: Despesa[];
  rotuloPeriodo: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Despesas por categoria</DialogTitle>
          <DialogDescription>
            Período: {rotuloPeriodo} · clique em uma categoria para ver o detalhamento.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto">
          <TabelaDespesasCategoria despesas={despesas} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

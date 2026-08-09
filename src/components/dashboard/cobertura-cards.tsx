import { Droplets, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { coberturaProdutos } from "@/lib/dashboard";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";

export function CoberturaCards() {
  const { produtos } = useEstoque();
  const { pedidos } = usePedidos();
  const lista = coberturaProdutos(produtos, pedidos).filter((p) => p.vendidosMes > 0 || p.emEstoque > 0);

  if (lista.length === 0) {
    return (
      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Cobertura de estoque</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Cadastre produtos e registre vendas para acompanhar a cobertura de estoque.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {lista.map((p) => {
        const Icon = /g[áa]s/i.test(p.nome) ? Flame : Droplets;
        const critico = p.cobertura < 5;
        return (
          <Card key={p.id} className="shadow-[var(--shadow-card)]">
            <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0">
              <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                <span className="truncate">{p.nome}</span>
              </CardTitle>
              <Badge variant={critico ? "destructive" : "secondary"} className="shrink-0">
                {critico ? "Cobertura baixa" : "Cobertura ok"}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { r: "Vendidos no mês", v: p.vendidosMes.toLocaleString("pt-BR") },
                { r: "Média por dia", v: p.mediaDia.toLocaleString("pt-BR") },
                { r: "Em estoque", v: p.emEstoque.toLocaleString("pt-BR") },
                {
                  r: "Cobertura",
                  v: Number.isFinite(p.cobertura) ? `${p.cobertura.toFixed(1)} dias` : "—",
                },
              ].map((m) => (
                <div key={m.r} className="rounded-lg bg-muted/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground">{m.r}</p>
                  <p className="mt-0.5 text-base font-semibold tabular-nums">{m.v}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

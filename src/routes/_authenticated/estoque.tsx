import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, PackagePlus, Recycle, Wallet, Warehouse } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EntradaEstoqueDialog, MoverVaziosDialog } from "@/components/estoque-dialogs";
import { CoberturaCards } from "@/components/dashboard/cobertura-cards";
import { useEstoque } from "@/context/estoque";
import { brl } from "@/lib/erp";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({
    meta: [
      { title: "Estoque Geral— AquaERP" },
      {
        name: "description",
        content:
          "Níveis de estoque de galões, gás e cervejas, cobertura em dias, movimentação de vasilhames vazios e entrada de mercadoria.",
      },
      { property: "og:title", content: "Estoque Geral — AquaERP" },
      {
        property: "og:description",
        content:
          "Níveis de estoque, cobertura em dias, movimentação de vazios e entrada de mercadoria da distribuidora.",
      },
    ],
  }),
  component: EstoqueGeral,
});

function EstoqueGeral() {
  const { produtos } = useEstoque();

  const valorTotal = produtos.reduce((s, p) => s + p.estoqueCheio * p.precoCusto, 0);
  const baixos = produtos.filter((p) => p.estoqueCheio <= p.estoqueMinimo);
  const totalVazios = produtos.reduce((s, p) => s + p.estoqueVazio, 0);
  const totalCheios = produtos.reduce((s, p) => s + p.estoqueCheio, 0);

  const cards = [
    {
      titulo: "Valor Total do Estoque Cheio",
      valor: brl(valorTotal),
      nota: `${produtos.length} produtos cadastrados`,
      icon: Wallet,
      tom: "bg-primary/10 text-primary",
    },
    {
      titulo: "Unidades Cheias em Depósito",
      valor: totalCheios.toLocaleString("pt-BR"),
      nota: "Disponíveis para venda",
      icon: Warehouse,
      tom: "bg-primary/10 text-primary",
    },
    {
      titulo: "Alertas de Estoque Baixo",
      valor: String(baixos.length),
      nota: baixos.length ? "Reposição necessária" : "Todos os níveis estão OK",
      icon: AlertTriangle,
      tom: "bg-warning/20 text-warning-foreground",
    },
    {
      titulo: "Vasilhames Vazios no Depósito",
      valor: totalVazios.toLocaleString("pt-BR"),
      nota: "Prontos para envase",
      icon: Recycle,
      tom: "bg-success/15 text-success",
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
          Estoque Geral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Níveis por produto, cobertura em dias e movimentação de vasilhames.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EntradaEstoqueDialog>
            <Button variant="outline">
              <PackagePlus /> Entrada de Estoque
            </Button>
          </EntradaEstoqueDialog>
          <MoverVaziosDialog>
            <Button className="shadow-[var(--shadow-card)]">
              <Recycle /> Mover Vazios
            </Button>
          </MoverVaziosDialog>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.titulo} className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="min-w-0 text-sm font-medium text-muted-foreground">
                {c.titulo}
              </CardTitle>
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.tom}`}>
                <c.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.nota}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <CoberturaCards />

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Warehouse className="size-4 text-primary" /> Níveis de Estoque
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/produtos">
              Ver produtos <ArrowRight />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {produtos.map((p) => {
            const meta = Math.max(p.estoqueMinimo * 2, 1);
            const pct = Math.min(100, (p.estoqueCheio / meta) * 100);
            const baixo = p.estoqueCheio <= p.estoqueMinimo;
            return (
              <div key={p.id} className="flex flex-col gap-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium">{p.nome}</span>
                    {p.retornavel && (
                      <Badge variant="secondary" className="shrink-0">
                        Retornável
                      </Badge>
                    )}
                    {baixo && (
                      <Badge variant="destructive" className="shrink-0">
                        Estoque baixo
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {p.estoqueCheio} / mín. {p.estoqueMinimo} · {p.estoqueVazio} vazios
                  </span>
                </div>
                <Progress value={pct} className="h-2" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

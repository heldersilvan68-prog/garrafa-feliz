import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  QrCode,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { DespesasChart } from "@/components/dashboard/charts";
import { ClientesCobrar, ContasPagar } from "@/components/dashboard/financeiro";
import { useCaixa } from "@/context/caixa";
import { brl } from "@/lib/erp";
import { dataCurta, horaCurta, somaMovimentos } from "@/lib/caixa";
import { usePeriodo } from "@/hooks/use-periodo";
import { useResumo } from "@/hooks/use-resumo";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — DRE, Lucro e Despesas | AquaERP" },
      {
        name: "description",
        content:
          "Histórico de fechamento de caixa, DRE simplificado, controle de despesas e relatório de vendas por forma de pagamento.",
      },
      { property: "og:title", content: "Financeiro — DRE, Lucro e Despesas | AquaERP" },
      {
        property: "og:description",
        content:
          "Fechamentos de caixa, DRE simplificado, despesas e vendas por forma de pagamento da distribuidora.",
      },
    ],
  }),
  component: Financeiro,
});

const ICONES_PAGAMENTO: Record<string, typeof QrCode> = {
  PIX: QrCode,
  Dinheiro: Banknote,
  Débito: Landmark,
  Crédito: CreditCard,
  Fiado: HandCoins,
};

function Financeiro() {
  const { caixas } = useCaixa();
  const periodo = usePeriodo("hoje");
  const { resumo } = useResumo(periodo.faixa);

  const fechados = caixas.filter((c) => c.fechadoEm);

  const linhasDre = [
    { rotulo: "Receita bruta de vendas", valor: resumo.vendas, tom: "" },
    { rotulo: "(-) Taxas de Cartão / Maquininha", valor: -resumo.taxasCartao, tom: "" },
    { rotulo: "(=) Receita líquida a receber", valor: resumo.receitaLiquida, tom: "font-semibold" },
    { rotulo: "(-) Custo do produto vendido", valor: -resumo.custoProduto, tom: "" },
    { rotulo: "(=) Lucro bruto", valor: resumo.lucroBruto, tom: "font-semibold" },
    {
      rotulo: "(-) Despesas operacionais (inclui taxas)",
      valor: -resumo.despesas,
      tom: "",
    },
    { rotulo: "(=) Lucro líquido", valor: resumo.lucroLiquido, tom: "font-semibold" },
  ];

  const pagamentos = [...resumo.pagamentos, { metodo: "Fiado", valor: resumo.fiado }];
  const totalPagamentos = pagamentos.reduce((s, p) => s + p.valor, 0) || 1;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Financeiro</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            DRE simplificado, lucro, despesas e histórico de fechamento de caixa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link to="/despesas">
              <Receipt className="size-4" /> Gestão de Despesas
            </Link>
          </Button>
          <FiltroPeriodo estado={periodo} />
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            titulo: "Receita bruta",
            valor: brl(resumo.vendas),
            icon: Wallet,
            tom: "bg-primary/10 text-primary",
          },
          {
            titulo: "Despesas pagas",
            valor: brl(resumo.despesas),
            icon: Receipt,
            tom: "bg-destructive/10 text-destructive",
            nota: `+ ${brl(resumo.despesasPrevistas)} a vencer no período`,
          },

          {
            titulo: "Lucro líquido",
            valor: brl(resumo.lucroLiquido),
            icon: TrendingUp,
            tom: "bg-success/15 text-success",
          },
          {
            titulo: "Margem bruta",
            valor: `${resumo.margemBruta.toFixed(1)}%`,
            icon: HandCoins,
            tom: "bg-warning/20 text-warning-foreground",
          },
        ].map((c) => (
          <Card key={c.titulo} className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                {c.titulo}
              </CardTitle>
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.tom}`}>
                <c.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.valor}</p>
              {"nota" in c && c.nota ? (
                <p className="mt-1 text-xs text-muted-foreground">{c.nota}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">DRE Simplificado</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {linhasDre.map((l) => (
              <div
                key={l.rotulo}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className={`truncate text-sm ${l.tom}`}>{l.rotulo}</span>
                <span
                  className={`shrink-0 text-sm tabular-nums ${l.tom} ${
                    l.valor < 0 ? "text-destructive" : ""
                  }`}
                >
                  {brl(l.valor)}
                </span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Margem líquida: {((resumo.lucroLiquido / (resumo.vendas || 1)) * 100).toFixed(1)}% da
              receita
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-base">Vendas por forma de pagamento</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {pagamentos.map((p) => {
              const Icon = ICONES_PAGAMENTO[p.metodo] ?? Banknote;
              return (
                <div key={p.metodo} className="flex flex-col gap-1.5">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      <Icon className="size-4 shrink-0 text-primary" />
                      <span className="truncate">{p.metodo}</span>
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {brl(p.valor)} · {((p.valor / totalPagamentos) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${(p.valor / totalPagamentos) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Histórico de fechamento de caixa</CardTitle>
        </CardHeader>
        <CardContent>
          {fechados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum caixa fechado ainda. Os fechamentos feitos em “Caixa &amp; Acerto” aparecem
              aqui.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {fechados.map((c) => (
                <div
                  key={c.id}
                  className="grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {dataCurta(c.abertoEm)} · {horaCurta(c.abertoEm)} às{" "}
                      {c.fechadoEm ? horaCurta(c.fechadoEm) : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Troco inicial {brl(c.trocoInicial)} · Sangrias{" "}
                      {brl(somaMovimentos(c.movimentos, "sangria"))} · Suprimentos{" "}
                      {brl(somaMovimentos(c.movimentos, "suprimento"))} · Recebimentos{" "}
                      {brl(somaMovimentos(c.movimentos, "recebimento"))}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums">Contado {brl(c.contado ?? 0)}</span>
                    <Badge
                      variant={Math.abs(c.diferenca ?? 0) < 0.01 ? "secondary" : "destructive"}
                    >
                      {(c.diferenca ?? 0) >= 0 ? "+" : "-"}
                      {brl(Math.abs(c.diferenca ?? 0))}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DespesasChart faixa={periodo.faixa} />
        <ContasPagar />
      </div>

      <ClientesCobrar />
    </div>
  );
}

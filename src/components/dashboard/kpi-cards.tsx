import { ArrowDownRight, ArrowUpRight, Receipt, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl, type Produto } from "@/lib/erp";
import type { ResumoPeriodo } from "@/lib/dashboard";

function Variacao({ valor }: { valor: number }) {
  const positivo = valor >= 0;
  const Icon = positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        positivo ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
      }`}
    >
      <Icon className="size-3" />
      {Math.abs(valor).toFixed(1)}%
    </span>
  );
}

function Shell({
  titulo,
  icon: Icon,
  tom,
  children,
  destaque,
}: {
  titulo: string;
  icon: typeof Wallet;
  tom: string;
  children: React.ReactNode;
  destaque?: boolean;
}) {
  return (
    <Card
      className={`shadow-[var(--shadow-card)] ${destaque ? "border-primary/40 bg-primary/[0.04]" : ""}`}
    >
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tom}`}>
          <Icon className="size-4" />
        </span>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function KpiCards({ resumo }: { resumo: ResumoPeriodo; produtos?: Produto[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Shell titulo="Vendas" icon={Wallet} tom="bg-primary/10 text-primary">
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{brl(resumo.vendas)}</p>
        <div className="mt-1 flex items-center gap-2">
          <Variacao valor={resumo.vendasVariacao} />
          <span className="text-xs text-muted-foreground">vs. período anterior</span>
        </div>
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={resumo.tendencia} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="kpiTrend" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="v"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#kpiTrend)"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Shell>

      <Shell titulo="Despesas" icon={Receipt} tom="bg-destructive/10 text-destructive">
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{brl(resumo.despesas)}</p>
        <div className="mt-1 flex items-center gap-2">
          <Variacao valor={resumo.despesasVariacao} />
          <span className="text-xs text-muted-foreground">no período</span>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          {resumo.vendas > 0 ? ((resumo.despesas / resumo.vendas) * 100).toFixed(1) : "0.0"}% da
          receita
        </p>
      </Shell>

      <Shell titulo="Lucro Líquido" icon={TrendingUp} tom="bg-success/15 text-success" destaque>
        <p className="text-2xl font-semibold tracking-tight text-primary sm:text-3xl">
          {brl(resumo.lucroLiquido)}
        </p>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          Margem bruta: {resumo.margemBruta.toFixed(1)}%
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          Lucro bruto de {brl(resumo.lucroBruto)}
        </p>
      </Shell>

      <Shell titulo="Pedidos" icon={ShoppingCart} tom="bg-accent text-accent-foreground">
        <p className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {resumo.pedidos.toLocaleString("pt-BR")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-muted/60 px-2 py-1.5">
            <p className="text-xs text-muted-foreground">Entregas hoje</p>
            <p className="text-sm font-semibold tabular-nums">{resumo.entregasHoje}</p>
          </div>
          <div className="rounded-lg bg-muted/60 px-2 py-1.5">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-sm font-semibold tabular-nums">{resumo.pendentes}</p>
          </div>
        </div>
      </Shell>
    </div>
  );
}

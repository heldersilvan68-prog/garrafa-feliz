import { useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/lib/erp";
import { despesasPorCategoria, type ResumoPeriodo } from "@/lib/dashboard";
import { faixaPeriodo, type Faixa } from "@/lib/periodo";
import { useDespesas } from "@/context/despesas";

export function VendasChart({ resumo }: { resumo: ResumoPeriodo }) {
  const [visao, setVisao] = useState<"dia" | "mes">("dia");
  const data = visao === "dia" ? resumo.vendasDia : resumo.vendasMes;

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0">
        <CardTitle className="truncate text-base">Vendas por período</CardTitle>
        <Select value={visao} onValueChange={(v) => setVisao(v as "dia" | "mes")}>
          <SelectTrigger className="w-[110px] shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dia">Dia</SelectItem>
            <SelectItem value="mes">Mês</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <XAxis
              dataKey="rotulo"
              tickLine={false}
              axisLine={false}
              className="text-xs"
              stroke="var(--color-muted-foreground)"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={56}
              className="text-xs"
              stroke="var(--color-muted-foreground)"
              tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)", opacity: 0.5 }}
              formatter={(v: number) => [brl(v), "Vendas"]}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-card-foreground)",
              }}
            />
            <Bar dataKey="valor" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

export function DespesasChart({ faixa }: { faixa?: Faixa }) {
  const { despesas } = useDespesas();
  const dados = despesasPorCategoria(despesas, faixa ?? faixaPeriodo("mes"));
  const total = dados.reduce((s, d) => s + d.valor, 0);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="text-base">Despesas por categoria</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)] sm:items-center">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Nenhuma despesa registrada no período.
          </p>
        ) : (
          <>
            <div className="mx-auto h-[200px] w-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dados}
                    dataKey="valor"
                    nameKey="categoria"
                    innerRadius={52}
                    outerRadius={82}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {dados.map((d) => (
                      <Cell key={d.categoria} fill={d.cor} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, n: string) => [brl(v), n]}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-card)",
                      color: "var(--color-card-foreground)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-2">
              {dados.map((d) => (
                <li
                  key={d.categoria}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: d.cor }}
                    />
                    <span className="truncate">{d.categoria}</span>
                  </span>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                    {brl(d.valor)} · {((d.valor / total) * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

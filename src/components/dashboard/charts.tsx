import { useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";

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
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const faixaEfetiva = faixa ?? faixaPeriodo("mes");
  const dados = useMemo(
    () => despesasPorCategoria(despesas, faixaEfetiva),
    [despesas, faixaEfetiva.inicio, faixaEfetiva.fim],
  );
  const total = useMemo(() => dados.reduce((s, d) => s + d.valor, 0), [dados]);
  const ativa = dados.some((d) => d.categoria === categoriaAtiva) ? categoriaAtiva : null;

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
                     onMouseEnter={(_, index) => setCategoriaAtiva(dados[index]?.categoria ?? null)}
                     onMouseLeave={() => setCategoriaAtiva(null)}
                  >
                    {dados.map((d) => (
                      <Cell
                        key={d.categoria}
                        fill={d.cor}
                        fillOpacity={ativa && ativa !== d.categoria ? 0.3 : 1}
                        stroke={ativa === d.categoria ? "var(--color-foreground)" : "var(--color-card)"}
                        strokeWidth={ativa === d.categoria ? 3 : 1}
                      />
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
                >
                  <Button
                    variant="ghost"
                    className={`grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] gap-2 whitespace-normal px-2 py-1.5 text-left ${ativa === d.categoria ? "bg-accent text-accent-foreground ring-1 ring-ring" : ""}`}
                    aria-label={`${d.categoria}: ${brl(d.valor)}, ${((d.valor / total) * 100).toFixed(0)}%`}
                    aria-pressed={ativa === d.categoria}
                    onMouseEnter={() => setCategoriaAtiva(d.categoria)}
                    onMouseLeave={() => setCategoriaAtiva(null)}
                    onFocus={() => setCategoriaAtiva(d.categoria)}
                    onBlur={() => setCategoriaAtiva(null)}
                    onClick={() => setCategoriaAtiva(ativa === d.categoria ? null : d.categoria)}
                  >
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: d.cor }}
                    />
                    <span className="break-words">{d.categoria}</span>
                  </span>
                  </Button>
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

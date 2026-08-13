import { Link } from "@tanstack/react-router";
import { Banknote, CreditCard, Landmark, PiggyBank, QrCode, Recycle, Truck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl } from "@/lib/erp";
import type { ResumoPeriodo } from "@/lib/dashboard";

const ICONES: Record<string, typeof QrCode> = {
  PIX: QrCode,
  Dinheiro: Banknote,
  Débito: Landmark,
  Crédito: CreditCard,
};

function Gauge({ pct }: { pct: number }) {
  const r = 70;
  const circ = Math.PI * r;
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <svg viewBox="0 0 180 100" className="w-full max-w-[220px]">
      <path
        d="M 20 90 A 70 70 0 0 1 160 90"
        fill="none"
        stroke="var(--color-muted)"
        strokeWidth={14}
        strokeLinecap="round"
      />
      <path
        d="M 20 90 A 70 70 0 0 1 160 90"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth={14}
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * circ} ${circ}`}
      />
      <text
        x="90"
        y="80"
        textAnchor="middle"
        className="fill-foreground text-[26px] font-semibold"
      >
        {clamped.toFixed(0)}%
      </text>
    </svg>
  );
}

export function BreakdownSection({ resumo }: { resumo: ResumoPeriodo }) {
  const comp = [
    { rotulo: "Lucro Bruto", valor: resumo.lucroBruto, cor: "bg-success" },
    { rotulo: "Custo do Produto", valor: resumo.custoProduto, cor: "bg-primary" },
    { rotulo: "Fiado", valor: resumo.fiado, cor: "bg-warning" },
  ];
  const totalComp = comp.reduce((s, c) => s + c.valor, 0) || 1;
  const totalPag = resumo.pagamentos.reduce((s, p) => s + p.valor, 0) || 1;
  const pctMeta = resumo.metaVendas > 0 ? (resumo.vendas / resumo.metaVendas) * 100 : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="shadow-[var(--shadow-card)] lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Composição das vendas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {comp.map((c) => (
              <div
                key={c.rotulo}
                className={c.cor}
                style={{ width: `${(c.valor / totalComp) * 100}%` }}
              />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {comp.map((c) => (
              <div key={c.rotulo} className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`size-2.5 shrink-0 rounded-full ${c.cor}`} />
                  <span className="truncate text-xs text-muted-foreground">{c.rotulo}</span>
                </div>
                <p className="mt-1 text-lg font-semibold tabular-nums">{brl(c.valor)}</p>
                <p className="text-xs text-muted-foreground">
                  {((c.valor / totalComp) * 100).toFixed(1)}% do total
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Formas de pagamento</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {resumo.pagamentos.map((p) => {
            const Icon = ICONES[p.metodo] ?? Banknote;
            return (
              <div key={p.metodo} className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                  <span className="flex min-w-0 items-center gap-2 text-sm">
                    <Icon className="size-4 shrink-0 text-primary" />
                    <span className="truncate">{p.metodo}</span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">{brl(p.valor)}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(p.valor / totalPag) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            Vasilhames na Rua
          </CardTitle>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning-foreground">
            <Recycle className="size-4" />
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">
            {resumo.vasilhamesNaRua.toLocaleString("pt-BR")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Galões 20L retornáveis em poder dos clientes
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            Total de Compras
          </CardTitle>
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Truck className="size-4" />
          </span>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tracking-tight">{brl(resumo.compras)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Notas de compra e reposições de estoque no período
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            Meta de Vendas
          </CardTitle>
          <Link
            to="/configuracoes"
            aria-label="Definir meta de vendas nas Configurações"
            className="grid size-9 shrink-0 place-items-center rounded-xl bg-success/15 text-success transition-colors hover:bg-success/25"
          >
            <PiggyBank className="size-4" />
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          <Gauge pct={pctMeta} />
          <p className="text-xs text-muted-foreground">
            {resumo.metaVendas > 0
              ? `${brl(resumo.vendas)} de ${brl(resumo.metaVendas)}`
              : `${brl(resumo.vendas)} vendidos · defina uma meta`}
          </p>
          <Link
            to="/configuracoes"
            className="mt-2 text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            {resumo.metaVendas > 0 ? "Ajustar meta nas Configurações" : "Definir meta de vendas"}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

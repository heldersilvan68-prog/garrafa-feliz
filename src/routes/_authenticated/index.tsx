import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { BreakdownSection } from "@/components/dashboard/breakdown-section";
import { VendasChart } from "@/components/dashboard/charts";
import { CoberturaCards } from "@/components/dashboard/cobertura-cards";
import { PdvDrawer } from "@/components/pdv/pdv-drawer";
import { usePeriodo } from "@/hooks/use-periodo";
import { useResumo } from "@/hooks/use-resumo";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Dashboard Geral — AquaERP" },
      {
        name: "description",
        content:
          "Vendas totais, pedidos, meta de vendas e evolução do faturamento da distribuidora em um só painel.",
      },
      { property: "og:title", content: "Dashboard Geral — AquaERP" },
      {
        property: "og:description",
        content:
          "Vendas totais, pedidos, meta de vendas e evolução do faturamento da distribuidora em um só painel.",
      },
    ],
  }),
  component: Painel,
});

function Painel() {
  const periodo = usePeriodo("hoje");
  const { resumo } = useResumo(periodo.faixa);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard Geral
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicadores gerais do negócio: vendas, pedidos e meta do período.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodo estado={periodo} />
          <PdvDrawer>
            <Button className="shadow-[var(--shadow-card)]">
              <Plus /> Registrar venda
            </Button>
          </PdvDrawer>
        </div>
      </header>

      <KpiCards resumo={resumo} />

      <BreakdownSection resumo={resumo} />

      <VendasChart resumo={resumo} />
    </div>
  );
}

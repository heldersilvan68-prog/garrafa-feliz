import { useMemo } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { usePeriodo } from "@/hooks/use-periodo";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { brl, rotuloEstoque, unidPorFardo } from "@/lib/erp";
import { dentroFaixa, rotuloFaixa } from "@/lib/periodo";
import { baixarCSV } from "@/lib/relatorios";

/** Relatório operacional: giro por produto, lucro bruto e necessidade de reposição. */
export function AnaliseProdutos() {
  const { produtos } = useEstoque();
  const { pedidos } = usePedidos();
  const periodoEstado = usePeriodo("hoje");
  const faixa = periodoEstado.faixa;

  const linhas = useMemo(() => {
    const validos = pedidos.filter((p) => p.status !== "cancelado" && dentroFaixa(p.criadoEm, faixa));
    return produtos
      .map((p) => {
        const upf = unidPorFardo(p);
        let qtd = 0;
        let faturamento = 0;
        for (const ped of validos) {
          for (const i of ped.itens) {
            if (i.produtoId !== p.id) continue;
            qtd += i.qtd;
            faturamento += i.qtd * i.precoUnit;
          }
        }
        const custoUnit = p.precoCusto || (upf > 1 ? (p.precoCustoFardo || 0) / upf : 0);
        const lucro = faturamento - qtd * custoUnit;
        const repor = Math.max(0, (p.estoqueMinimo || 0) - (p.estoqueCheio || 0));
        return {
          id: p.id,
          nome: p.nome,
          upf,
          qtd,
          faturamento,
          lucro,
          margem: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
          estoque: p.estoqueCheio || 0,
          minimo: p.estoqueMinimo || 0,
          repor,
          custoReposicao: repor * custoUnit,
          // Reposição por giro: repor exatamente o que foi vendido no período.
          reporGiro: qtd,
          custoReposicaoGiro: qtd * custoUnit,
        };
      })
      .sort((a, b) => b.qtd - a.qtd);
  }, [produtos, pedidos, faixa]);

  const totalUnidades = linhas.reduce((s, l) => s + l.qtd, 0);
  const totalLucro = linhas.reduce((s, l) => s + l.lucro, 0);
  const totalRepor = linhas.reduce((s, l) => s + l.repor, 0);
  const custoRepor = linhas.reduce((s, l) => s + l.custoReposicao, 0);
  const totalReporGiro = linhas.reduce((s, l) => s + l.reporGiro, 0);
  const custoReporGiro = linhas.reduce((s, l) => s + l.custoReposicaoGiro, 0);

  const exportar = () =>
    baixarCSV(
      "analise-produtos",
      [
        "Produto",
        "Un/Fardo",
        "Vendido (un)",
        "Vendido (fardos+un)",
        "Faturamento",
        "Lucro bruto",
        "Margem %",
        "Estoque atual",
        "Estoque mínimo",
        "Repor (un)",
        "Custo reposição",
      ],
      linhas.map((l) => [
        l.nome,
        l.upf,
        l.qtd,
        rotuloEstoque(l.qtd, l.upf),
        l.faturamento.toFixed(2),
        l.lucro.toFixed(2),
        l.margem.toFixed(2),
        l.estoque,
        l.minimo,
        l.repor,
        l.custoReposicao.toFixed(2),
      ]),
    );

  return (
    <div className="flex flex-col gap-4">
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Análise de produtos e reposição</CardTitle>
          <CardDescription>
            Giro, lucro bruto e necessidade de compra — período: {rotuloFaixa(faixa)}.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <FiltroPeriodo estado={periodoEstado} comRotulos className="flex-1 min-w-[240px]" />
          <Button variant="outline" onClick={exportar}>
            <FileSpreadsheet className="size-4" /> Exportar CSV
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total vendido no período</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{totalUnidades} un.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lucro bruto total</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{brl(totalLucro)}</p>
          </CardContent>
        </Card>
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reposição por estoque mínimo</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{totalRepor} un.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Custo estimado: {brl(custoRepor)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/40 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Reposição por giro de vendas</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{totalReporGiro} un.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Custo estimado: {brl(custoReporGiro)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center">Vendido</TableHead>
                  <TableHead className="text-right">Faturamento</TableHead>
                  <TableHead className="text-right">Lucro bruto</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-center">Estoque / mínimo</TableHead>
                  <TableHead className="text-center">Repor</TableHead>
                  <TableHead className="text-right">Custo reposição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {rotuloEstoque(l.qtd, l.upf)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(l.faturamento)}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(l.lucro)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {l.margem.toFixed(1)}%
                    </TableCell>
                    <TableCell className="text-center tabular-nums text-muted-foreground">
                      {l.estoque} / {l.minimo}
                    </TableCell>
                    <TableCell
                      className={`text-center tabular-nums ${l.repor > 0 ? "font-semibold text-warning" : ""}`}
                    >
                      {l.repor}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {brl(l.custoReposicao)}
                    </TableCell>
                  </TableRow>
                ))}
                {linhas.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                      Nenhum produto cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

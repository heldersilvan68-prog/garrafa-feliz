import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet } from "lucide-react";
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
import { brl } from "@/lib/erp";
import { baixarCSV } from "@/lib/relatorios";
import { totalItemPedido, valorFaturado, type Pedido } from "@/lib/pedidos";
import type { Produto } from "@/lib/erp";

type LinhaEntregador = {
  nome: string;
  entregas: number;
  faturamento: number;
  custo: number;
  lucro: number;
  produtos: { nome: string; qtd: number; valor: number }[];
};

/** Custo unitário do item conforme a modalidade de vasilhame (mesma regra do CMV dos relatórios). */
function custoUnitarioItem(item: Pedido["itens"][number], produto: Produto | undefined) {
  if (!produto) return 0;
  if (!item.retornavel) return produto.precoCusto || 0;
  const envase = produto.custoEnvase || produto.precoCusto || 0;
  const casco = produto.custoCasco ?? 0;
  const modo = item.modo ?? "refil";
  return modo === "refil" ? envase : modo === "casco" ? casco : envase + casco;
}

/** Desempenho por entregador no período: apenas pedidos concluídos (entregues). */
export function DesempenhoEntregadores({
  pedidos,
  produtos,
}: {
  /** Pedidos válidos do período (já filtrados por data e não cancelados). */
  pedidos: Pedido[];
  produtos: Produto[];
}) {
  const [aberto, setAberto] = useState<string | null>(null);

  const linhas = useMemo<LinhaEntregador[]>(() => {
    const produtosPorId = new Map(produtos.map((p) => [p.id, p]));
    const mapa = new Map<string, LinhaEntregador>();

    for (const p of pedidos) {
      if (p.status !== "concluido") continue;
      const nome = p.entregador?.trim() || "Sem entregador";
      const linha =
        mapa.get(nome) ??
        ({ nome, entregas: 0, faturamento: 0, custo: 0, lucro: 0, produtos: [] } as LinhaEntregador);
      const prodMapa = new Map(linha.produtos.map((x) => [x.nome, x]));

      linha.entregas += 1;
      // Faturamento novo do pedido (exclui parte paga em Vale, cujo dinheiro
      // já entrou no caixa na compra do pacote de vales).
      linha.faturamento += valorFaturado(p);

      for (const i of p.itens) {
        linha.custo += i.qtd * custoUnitarioItem(i, produtosPorId.get(i.produtoId));
        const atual = prodMapa.get(i.nome) ?? { nome: i.nome, qtd: 0, valor: 0 };
        atual.qtd += i.qtd;
        atual.valor += totalItemPedido(i);
        prodMapa.set(i.nome, atual);
      }

      linha.produtos = [...prodMapa.values()].sort((a, b) => b.qtd - a.qtd);
      mapa.set(nome, linha);
    }

    return [...mapa.values()]
      .map((l) => ({ ...l, lucro: l.faturamento - l.custo }))
      .sort((a, b) => b.faturamento - a.faturamento);
  }, [pedidos, produtos]);

  const totais = useMemo(
    () => ({
      entregas: linhas.reduce((s, l) => s + l.entregas, 0),
      faturamento: linhas.reduce((s, l) => s + l.faturamento, 0),
      lucro: linhas.reduce((s, l) => s + l.lucro, 0),
    }),
    [linhas],
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Desempenho por entregador</CardTitle>
          <CardDescription>
            Somente pedidos concluídos (entregues) no período · clique na linha para ver os
            produtos entregues.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="print:hidden"
          onClick={() =>
            baixarCSV(
              "desempenho-entregadores",
              ["Entregador", "Entregas", "Faturamento", "Custo (CMV)", "Lucro"],
              linhas.map((l) => [
                l.nome,
                l.entregas,
                l.faturamento.toFixed(2),
                l.custo.toFixed(2),
                l.lucro.toFixed(2),
              ]),
            )
          }
        >
          <FileSpreadsheet className="size-4" /> CSV
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {linhas.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhuma entrega concluída no período selecionado.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entregador</TableHead>
                <TableHead>Entregas</TableHead>
                <TableHead className="text-right">Faturamento</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((l) => {
                const expandido = aberto === l.nome;
                return [
                  <TableRow
                    key={l.nome}
                    className="cursor-pointer"
                    onClick={() => setAberto(expandido ? null : l.nome)}
                  >
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        {expandido ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                        {l.nome}
                      </span>
                    </TableCell>
                    <TableCell>{l.entregas}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(l.faturamento)}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {brl(l.lucro)}
                    </TableCell>
                  </TableRow>,
                  expandido ? (
                    <TableRow key={`${l.nome}-detalhe`} className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={4} className="p-0">
                        <div className="px-6 py-3">
                          <p className="mb-2 text-xs font-medium text-muted-foreground">
                            Produtos entregues por {l.nome} no período
                          </p>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Produto</TableHead>
                                <TableHead>Qtd</TableHead>
                                <TableHead className="text-right">Valor</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {l.produtos.map((pr) => (
                                <TableRow key={pr.nome}>
                                  <TableCell>{pr.nome}</TableCell>
                                  <TableCell>{pr.qtd} un</TableCell>
                                  <TableCell className="text-right tabular-nums">
                                    {brl(pr.valor)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : null,
                ];
              })}
              <TableRow className="border-t-2 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell>{totais.entregas}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(totais.faturamento)}</TableCell>
                <TableCell className="text-right tabular-nums">{brl(totais.lucro)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brl, rotuloQuantidadeProduto } from "@/lib/erp";
import { baixarCSV } from "@/lib/relatorios";
import { totalItemPedido, valorFaturado, type Pedido } from "@/lib/pedidos";
import type { Produto } from "@/lib/erp";
import { dentroFaixa, faixaAnterior, isoLocal, rotuloFaixa, type Faixa } from "@/lib/periodo";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { usePeriodo } from "@/hooks/use-periodo";
import { analisarEntregador } from "@/lib/analise-entregador.functions";
import { cn } from "@/lib/utils";

type LinhaEntregador = {
  nome: string;
  entregas: number;
  faturamento: number;
  custo: number;
  lucro: number;
  produtos: { produtoId: string; nome: string; qtd: number; valor: number }[];
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

const nomeEntregador = (p: Pedido) => p.entregador?.trim() || "Sem entregador";

function agrupar(pedidos: Pedido[], produtos: Produto[], faixa: Faixa): LinhaEntregador[] {
  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));
  const mapa = new Map<string, LinhaEntregador & { _p: Map<string, { produtoId: string; nome: string; qtd: number; valor: number }> }>();
  for (const p of pedidos) {
    if (p.status !== "concluido" || !dentroFaixa(p.criadoEm, faixa)) continue;
    const nome = nomeEntregador(p);
    const l =
      mapa.get(nome) ??
      { nome, entregas: 0, faturamento: 0, custo: 0, lucro: 0, produtos: [], _p: new Map() };
    l.entregas += 1;
    l.faturamento += valorFaturado(p);
    for (const i of p.itens) {
      l.custo += i.qtd * custoUnitarioItem(i, produtosPorId.get(i.produtoId));
      const chave = i.produtoId || i.nome;
      const a = l._p.get(chave) ?? { produtoId: i.produtoId, nome: i.nome, qtd: 0, valor: 0 };
      a.qtd += i.qtd;
      a.valor += totalItemPedido(i);
      l._p.set(chave, a);
    }
    mapa.set(nome, l);
  }
  return [...mapa.values()]
    .map(({ _p, ...l }) => ({
      ...l,
      lucro: l.faturamento - l.custo,
      produtos: [..._p.values()].sort((a, b) => b.qtd - a.qtd),
    }))
    .sort((a, b) => b.faturamento - a.faturamento);
}

const somar = (ls: LinhaEntregador[]) => ({
  entregas: ls.reduce((s, l) => s + l.entregas, 0),
  faturamento: ls.reduce((s, l) => s + l.faturamento, 0),
  lucro: ls.reduce((s, l) => s + l.lucro, 0),
});

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (anterior === 0 && atual === 0) return <span className="text-xs text-muted-foreground">—</span>;
  if (anterior === 0) return <span className="text-xs text-muted-foreground">novo</span>;
  const pct = ((atual - anterior) / Math.abs(anterior)) * 100;
  return (
    <span
      className={cn(
        "text-xs font-medium tabular-nums",
        pct > 0.05 ? "text-primary" : pct < -0.05 ? "text-destructive" : "text-muted-foreground",
      )}
    >
      {pct > 0 ? "▲" : pct < 0 ? "▼" : ""} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiComp({
  label,
  atual,
  anterior,
  fmt,
}: {
  label: string;
  atual: number;
  anterior: number;
  fmt: (n: number) => string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">{fmt(atual)}</p>
        <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <Variacao atual={atual} anterior={anterior} /> vs {fmt(anterior)} no período anterior
        </p>
      </CardContent>
    </Card>
  );
}

/** Aba Entregadores: comparação com período anterior, filtro de entregadores e análise por IA. */
export function DesempenhoEntregadores({
  pedidos,
  produtos,
  faixa,
}: {
  /** Todos os pedidos carregados (filtragem de período feita aqui). */
  pedidos: Pedido[];
  produtos: Produto[];
  faixa: Faixa;
}) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const anterior = useMemo(() => faixaAnterior(faixa), [faixa]);
  const produtosPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const linhasTodas = useMemo(() => agrupar(pedidos, produtos, faixa), [pedidos, produtos, faixa]);
  const linhasAntTodas = useMemo(
    () => agrupar(pedidos, produtos, anterior),
    [pedidos, produtos, anterior],
  );

  const nomesDisponiveis = useMemo(
    () => [...new Set([...linhasTodas, ...linhasAntTodas].map((l) => l.nome))].sort(),
    [linhasTodas, linhasAntTodas],
  );
  const filtra = (ls: LinhaEntregador[]) =>
    selecionados.length ? ls.filter((l) => selecionados.includes(l.nome)) : ls;
  const linhas = filtra(linhasTodas);
  const antPorNome = new Map(filtra(linhasAntTodas).map((l) => [l.nome, l]));
  const totais = somar(linhas);
  const totaisAnt = somar(filtra(linhasAntTodas));
  const semAnterior = anterior.inicio === anterior.fim && anterior.inicio.startsWith("0000");

  const alternar = (n: string) =>
    setSelecionados((s) => (s.includes(n) ? s.filter((x) => x !== n) : [...s, n]));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 p-4">
          <span className="mr-1 text-sm font-medium">Entregadores:</span>
          <Button
            size="sm"
            variant={selecionados.length === 0 ? "default" : "outline"}
            onClick={() => setSelecionados([])}
          >
            Todos
          </Button>
          {nomesDisponiveis.map((n) => (
            <Button
              key={n}
              size="sm"
              variant={selecionados.includes(n) ? "default" : "outline"}
              onClick={() => alternar(n)}
            >
              {n}
            </Button>
          ))}
          {nomesDisponiveis.length === 0 ? (
            <span className="text-sm text-muted-foreground">Nenhum entregador com vendas.</span>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiComp label="Entregas concluídas" atual={totais.entregas} anterior={totaisAnt.entregas} fmt={String} />
        <KpiComp label="Faturamento" atual={totais.faturamento} anterior={totaisAnt.faturamento} fmt={brl} />
        <KpiComp label="Lucro" atual={totais.lucro} anterior={totaisAnt.lucro} fmt={brl} />
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        Comparação: {rotuloFaixa(faixa)} vs{" "}
        {semAnterior ? "sem período anterior (todo o período)" : rotuloFaixa(anterior)}
      </p>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base">Desempenho por entregador</CardTitle>
            <CardDescription>
              Somente pedidos concluídos · variação vs período anterior · clique na linha para ver
              os produtos.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() =>
              baixarCSV(
                "desempenho-entregadores",
                ["Entregador", "Entregas", "Entregas ant.", "Faturamento", "Faturamento ant.", "Custo (CMV)", "Lucro", "Lucro ant."],
                linhas.map((l) => {
                  const a = antPorNome.get(l.nome);
                  return [
                    l.nome,
                    l.entregas,
                    a?.entregas ?? 0,
                    l.faturamento.toFixed(2),
                    (a?.faturamento ?? 0).toFixed(2),
                    l.custo.toFixed(2),
                    l.lucro.toFixed(2),
                    (a?.lucro ?? 0).toFixed(2),
                  ];
                }),
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
                  const a = antPorNome.get(l.nome);
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
                      <TableCell>
                        <div className="flex flex-col">
                          {l.entregas}
                          <Variacao atual={l.entregas} anterior={a?.entregas ?? 0} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <div className="flex flex-col items-end">
                          {brl(l.faturamento)}
                          <Variacao atual={l.faturamento} anterior={a?.faturamento ?? 0} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        <div className="flex flex-col items-end">
                          {brl(l.lucro)}
                          <Variacao atual={l.lucro} anterior={a?.lucro ?? 0} />
                        </div>
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
                                    <TableCell>{rotuloQuantidadeProduto(pr.qtd, produtosPorId.get(pr.produtoId))}</TableCell>
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

      <AnaliseIA pedidos={pedidos} produtos={produtos} nomes={nomesDisponiveis} />
    </div>
  );
}

function metricasDe(pedidos: Pedido[], produtos: Produto[], faixa: Faixa, nome: string) {
  const l = agrupar(pedidos, produtos, faixa).find((x) => x.nome === nome);
  const dias = new Map<string, { dia: string; entregas: number; faturamento: number }>();
  for (const p of pedidos) {
    if (p.status !== "concluido" || nomeEntregador(p) !== nome || !dentroFaixa(p.criadoEm, faixa)) continue;
    const dia = isoLocal(p.criadoEm);
    const d = dias.get(dia) ?? { dia, entregas: 0, faturamento: 0 };
    d.entregas += 1;
    d.faturamento += valorFaturado(p);
    dias.set(dia, d);
  }
  const r2 = (n: number) => Math.round(n * 100) / 100;
  return {
    entregas: l?.entregas ?? 0,
    faturamento: r2(l?.faturamento ?? 0),
    lucro: r2(l?.lucro ?? 0),
    produtos: (l?.produtos ?? []).slice(0, 25).map((p) => ({
      nome: p.nome,
      qtd: p.qtd,
      quantidadeFormatada: rotuloQuantidadeProduto(
        p.qtd,
        produtos.find((produto) => produto.id === p.produtoId),
      ),
      valor: r2(p.valor),
    })),
    porDia: [...dias.values()]
      .sort((a, b) => a.dia.localeCompare(b.dia))
      .slice(-62)
      .map((d) => ({ ...d, faturamento: r2(d.faturamento) })),
  };
}

function AnaliseIA({ pedidos, produtos, nomes }: { pedidos: Pedido[]; produtos: Produto[]; nomes: string[] }) {
  const periodo = usePeriodo("mes");
  const [nome, setNome] = useState("");
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(false);
  const analisar = useServerFn(analisarEntregador);

  const executar = async () => {
    if (!nome) return toast.error("Selecione um entregador.");
    setCarregando(true);
    setTexto("");
    try {
      const f = periodo.faixa;
      const ant = faixaAnterior(f);
      const equipe = agrupar(pedidos, produtos, f);
      const media = somar(equipe);
      const n = Math.max(equipe.length, 1);
      const r = await analisar({
        data: {
          entregador: nome,
          periodo: rotuloFaixa(f),
          periodoAnterior: rotuloFaixa(ant),
          atual: metricasDe(pedidos, produtos, f, nome),
          anterior: metricasDe(pedidos, produtos, ant, nome),
          mediaEquipe: {
            entregas: Math.round((media.entregas / n) * 10) / 10,
            faturamento: Math.round((media.faturamento / n) * 100) / 100,
            lucro: Math.round((media.lucro / n) * 100) / 100,
          },
        },
      });
      setTexto(r.texto);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" /> Análise inteligente do entregador
          <Badge variant="secondary">IA</Badge>
        </CardTitle>
        <CardDescription>
          Escolha um entregador e um período: a IA compara com o período anterior e a média da
          equipe, destacando tendências e oportunidades de melhoria.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="grid gap-2">
            <Label>Entregador</Label>
            <Select value={nome} onValueChange={setNome}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {nomes.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FiltroPeriodo estado={periodo} comRotulos />
          <Button onClick={executar} disabled={carregando || !nome}>
            {carregando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {carregando ? "Analisando..." : "Analisar desempenho"}
          </Button>
        </div>
        {texto ? (
          <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm leading-relaxed">
            {texto.replace(/^#{1,6}\s*/gm, "").replace(/\*\*(.+?)\*\*/g, "$1")}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

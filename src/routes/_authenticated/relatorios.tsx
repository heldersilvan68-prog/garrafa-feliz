import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { useDespesas } from "@/context/despesas";
import { useCaixa } from "@/context/caixa";
import { useClientes } from "@/context/clientes";
import { LABEL_MODO, type ModoVenda } from "@/lib/vasilhames";

import { brl } from "@/lib/erp";
import { dataBR } from "@/lib/despesas";
import {
  STATUS_PEDIDO_LABEL,
  type FormaPagamento,
  type StatusPedido,
} from "@/lib/pedidos";
import { useConfiguracoes } from "@/context/configuracoes";
import { baixarCSV, imprimir, maisVendidos } from "@/lib/relatorios";
import { dentroFaixa, rotuloFaixa } from "@/lib/periodo";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { usePeriodo } from "@/hooks/use-periodo";
import { useResumo } from "@/hooks/use-resumo";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios Gerenciais — AquaERP" },
      {
        name: "description",
        content:
          "Relatórios de vendas, estoque e financeiro da distribuidora com filtros de período, exportação em CSV e impressão em PDF.",
      },
      { property: "og:title", content: "Relatórios Gerenciais — AquaERP" },
      {
        property: "og:description",
        content: "Faturamento, ticket médio, formas de pagamento, estoque e receitas x despesas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RelatoriosPage,
});

function Kpi({ label, valor, hint }: { label: string; valor: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tracking-tight">{valor}</p>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function RelatoriosPage() {
  const { pedidos } = usePedidos();
  const { despesas } = useDespesas();
  const { produtos } = useEstoque();
  const { caixaAberto } = useCaixa();
  const { clientes } = useClientes();
  const { metodosAtivos, taxaDe } = useConfiguracoes();
  const formasFiltro = metodosAtivos as FormaPagamento[];




  const periodoEstado = usePeriodo("hoje");
  const faixa = periodoEstado.faixa;
  const [status, setStatus] = useState<"todos" | StatusPedido>("todos");
  const [forma, setForma] = useState<string>("todas");

  // Mesmos KPIs do Dashboard/Financeiro: nenhum cálculo paralelo aqui.
  const { resumo } = useResumo(faixa);

  const filtrados = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          dentroFaixa(p.criadoEm, faixa) &&
          (status === "todos" ? true : p.status === status) &&
          (forma === "todas" ? true : p.pagamento === forma),
      ),
    [pedidos, faixa, status, forma],
  );

  const validos = filtrados.filter((p) => p.status !== "cancelado");
  const faturado = validos.reduce((s, p) => s + p.total, 0);
  const ticket = validos.length > 0 ? faturado / validos.length : 0;
  const cancelados = filtrados.filter((p) => p.status === "cancelado");

  // Formas e taxas vêm das Configurações (contexto global).
  const porForma = formasFiltro.map((f) => {
    const valor = validos.filter((p) => p.pagamento === f).reduce((s, p) => s + p.total, 0);
    const taxa = taxaDe(f);
    return {
      forma: f,
      qtd: validos.filter((p) => p.pagamento === f).length,
      valor,
      taxa,
      taxaValor: (valor * taxa) / 100,
      liquido: valor - (valor * taxa) / 100,
    };
  });
  const totalTaxas = porForma.reduce((s, f) => s + f.taxaValor, 0);

  const ranking = maisVendidos(validos);

  const despesasFaixa = despesas.filter((d) => dentroFaixa(d.data, faixa));
  const despesasPendentes = despesasFaixa
    .filter((d) => d.status === "Pendente")
    .reduce((s, d) => s + d.valor, 0);

  const porCategoria = [
    ...despesasFaixa.reduce((mapa, d) => {
      mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor);
      return mapa;
    }, new Map<string, number>()),
  ].sort((a, b) => b[1] - a[1]);

  const saldoCaixa = caixaAberto
    ? caixaAberto.trocoInicial +
      caixaAberto.movimentos.reduce((s, m) => s + (m.tipo === "sangria" ? -m.valor : m.valor), 0)
    : 0;

  const cheios = produtos.reduce((s, p) => s + p.estoqueCheio, 0);
  const vazios = produtos.reduce((s, p) => s + p.estoqueVazio, 0);
  const abaixoMinimo = produtos.filter((p) => p.estoqueCheio <= p.estoqueMinimo);
  const vaziosRecolhidos = validos.reduce((s, p) => s + p.vaziosRecolhidos, 0);

  // Novos clientes cadastrados dentro do período filtrado.
  const novosClientes = clientes.filter((c) => c.cadastradoEm && dentroFaixa(c.cadastradoEm, faixa));

  // Faturamento e lucro por modalidade de vasilhame retornável.
  const porModalidade = useMemo(() => {
    const modos: { id: ModoVenda; label: string }[] = [
      { id: "refil", label: LABEL_MODO.refil },
      { id: "completa", label: LABEL_MODO.completa },
      { id: "casco", label: LABEL_MODO.casco },
    ];
    return modos.map(({ id, label }) => {
      let qtd = 0;
      let faturamento = 0;
      let custo = 0;
      for (const p of validos) {
        for (const i of p.itens) {
          if (!i.retornavel || (i.modo ?? "refil") !== id) continue;
          const prod = produtos.find((x) => x.id === i.produtoId);
          const envase = prod?.custoEnvase || prod?.precoCusto || 0;
          const casco = prod?.custoCasco ?? 0;
          const unitario = id === "refil" ? envase : id === "casco" ? casco : envase + casco;
          qtd += i.qtd;
          faturamento += i.qtd * i.precoUnit;
          custo += i.qtd * unitario;
        }
      }
      const lucro = faturamento - custo;
      return {
        id,
        label,
        qtd,
        faturamento,
        custo,
        lucro,
        margem: faturamento > 0 ? (lucro / faturamento) * 100 : 0,
      };
    });
  }, [validos, produtos]);


  return (
    <div className="flex flex-col gap-6 print:gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Relatórios gerenciais</h1>
          <p className="text-sm text-muted-foreground">
            Período: {rotuloFaixa(faixa)} · dados em tempo real do banco
          </p>
        </div>
        <Button variant="outline" onClick={imprimir} className="print:hidden">
          <Printer className="size-4" /> Imprimir / PDF
        </Button>
      </header>

      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros globais</CardTitle>
          <CardDescription>Período, status do pedido e forma de pagamento.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <FiltroPeriodo estado={periodoEstado} comRotulos className="md:col-span-2" />
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(Object.keys(STATUS_PEDIDO_LABEL) as StatusPedido[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_PEDIDO_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {formasFiltro.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="vendas">
        <TabsList className="print:hidden">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        </TabsList>

        <TabsContent value="vendas" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi
              label="Total faturado"
              valor={brl(faturado)}
              hint={`${validos.length} pedido(s)`}
            />
            <Kpi label="Ticket médio" valor={brl(ticket)} />
            <Kpi
              label="Cancelados"
              valor={String(cancelados.length)}
              hint={brl(cancelados.reduce((s, p) => s + p.total, 0))}
            />
            <Kpi
              label="Fiado em aberto"
              valor={brl(
                validos
                  .filter((p) => p.pagamento === "Fiado" && !p.pago)
                  .reduce((s, p) => s + p.total, 0),
              )}
            />
            <Kpi
              label="Novos clientes cadastrados"
              valor={String(novosClientes.length)}
              hint={`No período: ${rotuloFaixa(faixa)}`}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Vasilhames por modalidade</CardTitle>
                <CardDescription>
                  Refil (custo de envase), venda completa (envase + casco) e casco avulso.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  baixarCSV(
                    "vasilhames-modalidade",
                    ["Modalidade", "Qtd", "Faturamento", "CMV", "Lucro", "Margem %"],
                    porModalidade.map((m) => [
                      m.label,
                      m.qtd,
                      m.faturamento.toFixed(2),
                      m.custo.toFixed(2),
                      m.lucro.toFixed(2),
                      m.margem.toFixed(1),
                    ]),
                  )
                }
              >
                <FileSpreadsheet className="size-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modalidade</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">CMV</TableHead>
                    <TableHead className="text-right">Lucro bruto</TableHead>
                    <TableHead className="text-right">Margem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porModalidade.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell>{m.qtd}</TableCell>
                      <TableCell className="text-right">{brl(m.faturamento)}</TableCell>
                      <TableCell className="text-right">{brl(m.custo)}</TableCell>
                      <TableCell className="text-right">{brl(m.lucro)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.margem.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>


          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Por forma de pagamento</CardTitle>
                <CardDescription>
                  Somente pedidos não cancelados · taxas conforme Configurações (
                  {brl(totalTaxas)} em taxas)
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  baixarCSV(
                    "formas-pagamento",
                    ["Forma", "Pedidos", "Valor", "Taxa %", "Taxa R$", "Líquido"],
                    porForma.map((f) => [
                      f.forma,
                      f.qtd,
                      f.valor.toFixed(2),
                      f.taxa.toFixed(2),
                      f.taxaValor.toFixed(2),
                      f.liquido.toFixed(2),
                    ]),
                  )
                }
              >
                <FileSpreadsheet className="size-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Forma</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {porForma.map((f) => (
                    <TableRow key={f.forma}>
                      <TableCell className="font-medium">{f.forma}</TableCell>
                      <TableCell>{f.qtd}</TableCell>
                      <TableCell className="text-right">{brl(f.valor)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {f.taxa > 0 ? `${f.taxa.toFixed(2)}% · ${brl(f.taxaValor)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {brl(f.liquido)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Produtos mais vendidos</CardTitle>
                <CardDescription>Quantidade e faturamento por item.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  baixarCSV(
                    "produtos-mais-vendidos",
                    ["Produto", "Quantidade", "Valor"],
                    ranking.map((r) => [r.nome, r.qtd, r.valor.toFixed(2)]),
                  )
                }
              >
                <FileSpreadsheet className="size-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {ranking.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma venda no período selecionado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Qtd</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ranking.map((r) => (
                      <TableRow key={r.nome}>
                        <TableCell className="font-medium">{r.nome}</TableCell>
                        <TableCell>{r.qtd}</TableCell>
                        <TableCell className="text-right">{brl(r.valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Pedidos do período</CardTitle>
                <CardDescription>{filtrados.length} registro(s)</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  baixarCSV(
                    "vendas",
                    ["Pedido", "Data", "Cliente", "Entregador", "Pagamento", "Status", "Total"],
                    filtrados.map((p) => [
                      p.numero,
                      new Date(p.criadoEm).toLocaleString("pt-BR"),
                      p.clienteNome,
                      p.entregador,
                      p.pagamento,
                      STATUS_PEDIDO_LABEL[p.status],
                      p.total.toFixed(2),
                    ]),
                  )
                }
              >
                <Download className="size-4" /> Exportar
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {filtrados.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum pedido encontrado com os filtros atuais.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Pagamento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{p.numero}</TableCell>
                        <TableCell>{new Date(p.criadoEm).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="font-medium">{p.clienteNome}</TableCell>
                        <TableCell>{p.pagamento}</TableCell>
                        <TableCell>
                          <Badge variant={p.status === "cancelado" ? "destructive" : "secondary"}>
                            {STATUS_PEDIDO_LABEL[p.status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{brl(p.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="estoque" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Produtos cadastrados" valor={String(produtos.length)} />
            <Kpi label="Unidades cheias" valor={String(cheios)} />
            <Kpi label="Vasilhames vazios" valor={String(vazios)} />
            <Kpi
              label="Vazios recolhidos no período"
              valor={String(vaziosRecolhidos)}
              hint={`${abaixoMinimo.length} item(ns) abaixo do mínimo`}
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Posição de estoque</CardTitle>
                <CardDescription>Cheios, vazios e alerta de estoque mínimo.</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  baixarCSV(
                    "estoque",
                    ["Produto", "Categoria", "Cheio", "Vazio", "Mínimo", "Alerta"],
                    produtos.map((p) => [
                      p.nome,
                      p.categoria,
                      p.estoqueCheio,
                      p.estoqueVazio,
                      p.estoqueMinimo,
                      p.estoqueCheio <= p.estoqueMinimo ? "Repor" : "OK",
                    ]),
                  )
                }
              >
                <FileSpreadsheet className="size-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {produtos.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum produto cadastrado.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Cheio</TableHead>
                      <TableHead>Vazio</TableHead>
                      <TableHead>Mínimo</TableHead>
                      <TableHead className="text-right">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {produtos.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome}</TableCell>
                        <TableCell>{p.categoria}</TableCell>
                        <TableCell>{p.estoqueCheio}</TableCell>
                        <TableCell>{p.retornavel ? p.estoqueVazio : "—"}</TableCell>
                        <TableCell>{p.estoqueMinimo}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              p.estoqueCheio <= p.estoqueMinimo ? "destructive" : "secondary"
                            }
                          >
                            {p.estoqueCheio <= p.estoqueMinimo ? "Repor" : "OK"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4 flex flex-col gap-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Receitas (vendas)" valor={brl(resumo.vendas)} />
            <Kpi
              label="Despesas pagas"
              valor={brl(resumo.despesas)}
              hint={`A vencer: ${brl(resumo.despesasPrevistas)}`}
            />
            <Kpi
              label="Lucro líquido"
              valor={brl(resumo.lucroLiquido)}
              hint={`CMV ${brl(resumo.custoProduto)}`}
            />
            <Kpi
              label="Saldo do caixa"
              valor={brl(saldoCaixa)}
              hint={
                caixaAberto
                  ? "Caixa aberto · suprimentos não entram no faturamento"
                  : "Nenhum caixa aberto"
              }
            />
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base">Despesas por categoria</CardTitle>
                <CardDescription>A vencer no período: {brl(despesasPendentes)}</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="print:hidden"
                onClick={() =>
                  baixarCSV(
                    "despesas",
                    ["Descrição", "Categoria", "Data", "Forma", "Status", "Valor"],
                    despesasFaixa.map((d) => [
                      d.descricao,
                      d.categoria,
                      dataBR(d.data),
                      d.forma,
                      d.status,
                      d.valor.toFixed(2),
                    ]),
                  )
                }
              >
                <FileSpreadsheet className="size-4" /> CSV
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {porCategoria.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nenhuma despesa lançada no período.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {porCategoria.map(([cat, valor]) => (
                      <TableRow key={cat}>
                        <TableCell className="font-medium">{cat}</TableCell>
                        <TableCell className="text-right">{brl(valor)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

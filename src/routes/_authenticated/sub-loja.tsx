import { useMemo, useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Banknote,
  CalendarCheck,
  CircleDollarSign,
  CreditCard,
  History,
  PackageOpen,
  Plus,
  Receipt,
  ShoppingBag,
  Store,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { usePeriodo } from "@/hooks/use-periodo";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { useSubLoja } from "@/context/sub-loja";
import { brl } from "@/lib/erp";
import { dataBR } from "@/lib/despesas";
import { isoLocal, rotuloFaixa } from "@/lib/periodo";
import { analisarSubLoja, type ResumoSubLoja } from "@/lib/sub-loja";

export const Route = createFileRoute("/_authenticated/sub-loja")({
  head: () => ({
    meta: [
      { title: "Sub-Loja — Caixa, despesas e DRE | AquaERP" },
      {
        name: "description",
        content:
          "Gestão independente da Sub-Loja com vendas por forma de pagamento, despesas exclusivas, fechamentos diários, lucro e pedidos.",
      },
      { property: "og:title", content: "Sub-Loja / Módulo Interno | AquaERP" },
      {
        property: "og:description",
        content: "Acompanhe o resultado e os fechamentos da operação secundária sem alterar o caixa principal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubLojaPage,
});

function Metrica({
  titulo,
  valor,
  nota,
  icone: Icone,
  tom = "text-foreground",
}: {
  titulo: string;
  valor: string;
  nota?: string;
  icone: typeof TrendingUp;
  tom?: string;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{titulo}</CardTitle>
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          <Icone className="size-4" />
        </span>
      </CardHeader>
      <CardContent>
        <p className={`text-2xl font-semibold tracking-tight tabular-nums ${tom}`}>{valor}</p>
        {nota ? <p className="mt-1 text-xs text-muted-foreground">{nota}</p> : null}
      </CardContent>
    </Card>
  );
}

function TabelaPedidos({ resumo }: { resumo: ResumoSubLoja }) {
  if (resumo.linhas.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center">
        <PackageOpen className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma venda da Sub-Loja neste período</p>
        <p className="text-xs text-muted-foreground">Pedidos concluídos ou em rota aparecem aqui automaticamente.</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Pedido</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="min-w-[280px]">Produtos da Sub-Loja</TableHead>
            <TableHead className="text-right">Qtd.</TableHead>
            <TableHead className="text-right">Valor total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {resumo.linhas.map((linha) => (
            <TableRow key={linha.pedidoId}>
              <TableCell className="font-medium">#{linha.numero}</TableCell>
              <TableCell className="whitespace-nowrap">{dataBR(isoLocal(linha.data))}</TableCell>
              <TableCell>{linha.cliente}</TableCell>
              <TableCell className="max-w-[420px] text-sm">{linha.produtos}</TableCell>
              <TableCell className="text-right tabular-nums">{linha.quantidade}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{brl(linha.valor)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function SubLojaPage() {
  const { produtos, carregando: carregandoProdutos } = useEstoque();
  const { pedidos, carregando: carregandoPedidos } = usePedidos();
  const {
    despesas,
    fechamentos,
    carregando: carregandoSubLoja,
    adicionarDespesa,
    removerDespesa,
    fecharDia,
  } = useSubLoja();
  const periodo = usePeriodo("mes");
  const [diaCaixa, setDiaCaixa] = useState(isoLocal(new Date()));
  const [confirmarFechamento, setConfirmarFechamento] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [salvandoDespesa, setSalvandoDespesa] = useState(false);
  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [categoria, setCategoria] = useState("Operação");
  const [dataDespesa, setDataDespesa] = useState(isoLocal(new Date()));

  const faixaDia = useMemo(() => ({ inicio: diaCaixa, fim: diaCaixa }), [diaCaixa]);
  const resumoDia = useMemo(
    () => analisarSubLoja(faixaDia, pedidos, produtos, despesas),
    [faixaDia, pedidos, produtos, despesas],
  );
  const resumoPeriodo = useMemo(
    () => analisarSubLoja(periodo.faixa, pedidos, produtos, despesas),
    [periodo.faixa, pedidos, produtos, despesas],
  );
  const produtosSubLoja = produtos.filter((produto) => produto.subLoja);
  const diaJaFechado = fechamentos.some((fechamento) => fechamento.dia === diaCaixa);
  const carregando = carregandoProdutos || carregandoPedidos || carregandoSubLoja;

  const salvarDespesa = async (event: FormEvent) => {
    event.preventDefault();
    const numero = Number(valor.replace(",", "."));
    if (!descricao.trim() || !categoria.trim() || !Number.isFinite(numero) || numero <= 0 || !dataDespesa) {
      toast.error("Preencha descrição, categoria, data e um valor maior que zero.");
      return;
    }
    setSalvandoDespesa(true);
    try {
      await adicionarDespesa({
        descricao: descricao.trim(),
        valor: Math.round(numero * 100) / 100,
        categoria: categoria.trim(),
        data: dataDespesa,
      });
      setDescricao("");
      setValor("");
    } finally {
      setSalvandoDespesa(false);
    }
  };

  const confirmar = async () => {
    setFechando(true);
    try {
      await fecharDia(resumoDia, diaCaixa);
      setConfirmarFechamento(false);
    } finally {
      setFechando(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
            <Store className="size-4" /> Operação secundária
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Sub-Loja / Módulo Interno</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendas, despesas e resultado separados, usando o mesmo PDV da loja principal.
          </p>
        </div>
        <Badge variant="outline" className="w-fit px-3 py-1.5">
          {produtosSubLoja.length} {produtosSubLoja.length === 1 ? "produto vinculado" : "produtos vinculados"}
        </Badge>
      </header>

      {produtosSubLoja.length === 0 && !carregandoProdutos ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Comece identificando os produtos da Sub-Loja</p>
              <p className="text-xs text-muted-foreground">Ative “Pertence à Sub-Loja” no cadastro de cada produto.</p>
            </div>
            <Button asChild variant="outline"><Link to="/produtos">Abrir produtos</Link></Button>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="caixa" className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="caixa" className="gap-2 py-2.5"><WalletCards className="size-4" />Caixa do dia</TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 py-2.5"><History className="size-4" />Fechamentos</TabsTrigger>
          <TabsTrigger value="despesas" className="gap-2 py-2.5"><Receipt className="size-4" />Despesas</TabsTrigger>
          <TabsTrigger value="dre" className="gap-2 py-2.5"><TrendingUp className="size-4" />DRE e pedidos</TabsTrigger>
        </TabsList>

        <TabsContent value="caixa" className="mt-5 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="grid gap-2">
              <Label htmlFor="dia-caixa">Dia da conferência</Label>
              <Input id="dia-caixa" type="date" value={diaCaixa} max={isoLocal(new Date())} onChange={(e) => setDiaCaixa(e.target.value)} className="w-[180px]" />
            </div>
            <Button onClick={() => setConfirmarFechamento(true)} disabled={!diaCaixa || diaJaFechado || carregando}>
              <CalendarCheck className="size-4" />{diaJaFechado ? "Dia já fechado" : "Fechar caixa da Sub-Loja"}
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica titulo="Faturamento do dia" valor={brl(resumoDia.faturamento)} nota={`${resumoDia.pedidos} pedidos · ${resumoDia.quantidadeItens} itens`} icone={CircleDollarSign} />
            <Metrica titulo="PIX" valor={brl(resumoDia.pix)} nota="Parcela proporcional dos itens da Sub-Loja" icone={WalletCards} />
            <Metrica titulo="Dinheiro em espécie" valor={brl(resumoDia.dinheiro)} nota="Sem alterar o caixa principal" icone={Banknote} />
            <Metrica titulo="Cartão" valor={brl(resumoDia.cartao)} nota={`Débito ${brl(resumoDia.debito)} · Crédito ${brl(resumoDia.credito)}`} icone={CreditCard} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Fiado</p><p className="mt-1 text-lg font-semibold tabular-nums">{brl(resumoDia.fiado)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Vale</p><p className="mt-1 text-lg font-semibold tabular-nums">{brl(resumoDia.vale)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">CMV dos produtos</p><p className="mt-1 text-lg font-semibold tabular-nums">{brl(resumoDia.cmv)}</p></CardContent></Card>
            <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Lucro líquido do dia</p><p className={`mt-1 text-lg font-semibold tabular-nums ${resumoDia.lucroLiquido < 0 ? "text-destructive" : "text-success"}`}>{brl(resumoDia.lucroLiquido)}</p></CardContent></Card>
          </div>
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-base">Vendas de {dataBR(diaCaixa)}</CardTitle><CardDescription>Somente itens identificados como Sub-Loja; vendas canceladas não entram.</CardDescription></CardHeader>
            <CardContent><TabelaPedidos resumo={resumoDia} /></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-5">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="text-base">Histórico de fechamentos diários</CardTitle>
              <CardDescription>Cada linha é um retrato salvo do dia e não abre, fecha nem altera a sessão do caixa principal.</CardDescription>
            </CardHeader>
            <CardContent>
              {fechamentos.length === 0 ? (
                <div className="py-10 text-center"><History className="mx-auto mb-3 size-8 text-muted-foreground" /><p className="text-sm text-muted-foreground">Nenhum dia fechado ainda. Use a aba “Caixa do dia”.</p></div>
              ) : (
                <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Dia</TableHead><TableHead>Fechado em</TableHead><TableHead className="text-right">Pedidos</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">PIX</TableHead><TableHead className="text-right">Dinheiro</TableHead><TableHead className="text-right">Cartão</TableHead><TableHead className="text-right">Despesas</TableHead><TableHead className="text-right">Lucro líquido</TableHead></TableRow></TableHeader><TableBody>
                  {fechamentos.map((fechamento) => <TableRow key={fechamento.id}><TableCell className="font-medium">{dataBR(fechamento.dia)}</TableCell><TableCell className="whitespace-nowrap text-muted-foreground">{new Date(fechamento.fechadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</TableCell><TableCell className="text-right">{fechamento.pedidos}</TableCell><TableCell className="text-right font-medium">{brl(fechamento.faturamento)}</TableCell><TableCell className="text-right">{brl(fechamento.pix)}</TableCell><TableCell className="text-right">{brl(fechamento.dinheiro)}</TableCell><TableCell className="text-right">{brl(fechamento.debito + fechamento.credito)}</TableCell><TableCell className="text-right">{brl(fechamento.despesas)}</TableCell><TableCell className={`text-right font-medium ${fechamento.lucroLiquido < 0 ? "text-destructive" : "text-success"}`}>{brl(fechamento.lucroLiquido)}</TableCell></TableRow>)}
                </TableBody></Table></div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="despesas" className="mt-5 grid gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="h-fit shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-base">Nova despesa da Sub-Loja</CardTitle><CardDescription>Este lançamento não entra nas despesas nem no caixa da loja principal.</CardDescription></CardHeader>
            <CardContent>
              <form onSubmit={salvarDespesa} className="grid gap-4">
                <div className="grid gap-2"><Label htmlFor="sub-despesa-descricao">Descrição</Label><Input id="sub-despesa-descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Embalagens da operação" /></div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div className="grid gap-2"><Label htmlFor="sub-despesa-valor">Valor (R$)</Label><Input id="sub-despesa-valor" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" /></div>
                  <div className="grid gap-2"><Label htmlFor="sub-despesa-data">Data</Label><Input id="sub-despesa-data" type="date" value={dataDespesa} onChange={(e) => setDataDespesa(e.target.value)} /></div>
                </div>
                <div className="grid gap-2"><Label>Categoria</Label><Select value={categoria} onValueChange={setCategoria}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["Operação", "Insumos", "Pessoal", "Combustível", "Manutenção", "Outros"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                <Button type="submit" disabled={salvandoDespesa}><Plus className="size-4" />{salvandoDespesa ? "Salvando…" : "Registrar despesa"}</Button>
              </form>
            </CardContent>
          </Card>
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader><CardTitle className="text-base">Despesas exclusivas</CardTitle><CardDescription>{despesas.length} lançamentos · total histórico {brl(despesas.reduce((total, despesa) => total + despesa.valor, 0))}</CardDescription></CardHeader>
            <CardContent>{despesas.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma despesa exclusiva registrada.</p> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Descrição</TableHead><TableHead>Categoria</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="w-12"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader><TableBody>{despesas.map((despesa) => <TableRow key={despesa.id}><TableCell className="whitespace-nowrap">{dataBR(despesa.data)}</TableCell><TableCell className="font-medium">{despesa.descricao}</TableCell><TableCell><Badge variant="secondary">{despesa.categoria}</Badge></TableCell><TableCell className="text-right tabular-nums">{brl(despesa.valor)}</TableCell><TableCell><ConfirmarExclusao titulo="Excluir despesa da Sub-Loja?" descricao={`${despesa.descricao} será removida do resultado da Sub-Loja.`} onConfirmar={() => removerDespesa(despesa.id)}><Button variant="ghost" size="icon" aria-label={`Excluir ${despesa.descricao}`}><Trash2 className="size-4 text-destructive" /></Button></ConfirmarExclusao></TableCell></TableRow>)}</TableBody></Table></div>}</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dre" className="mt-5 space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-lg font-semibold">Resultado da Sub-Loja</h2><p className="text-sm text-muted-foreground">{rotuloFaixa(periodo.faixa)}</p></div><FiltroPeriodo estado={periodo} /></div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metrica titulo="Faturamento no período" valor={brl(resumoPeriodo.faturamento)} nota={`${resumoPeriodo.pedidos} pedidos com itens da Sub-Loja`} icone={ShoppingBag} />
            <Metrica titulo="CMV" valor={brl(resumoPeriodo.cmv)} nota="Custo preservado no momento da venda" icone={PackageOpen} />
            <Metrica titulo="Lucro bruto" valor={brl(resumoPeriodo.lucroBruto)} nota="Faturamento − CMV" icone={TrendingUp} tom={resumoPeriodo.lucroBruto < 0 ? "text-destructive" : "text-success"} />
            <Metrica titulo="Lucro líquido" valor={brl(resumoPeriodo.lucroLiquido)} nota={`Lucro bruto − ${brl(resumoPeriodo.despesas)} de despesas`} icone={CircleDollarSign} tom={resumoPeriodo.lucroLiquido < 0 ? "text-destructive" : "text-success"} />
          </div>
          <Card className="shadow-[var(--shadow-card)]"><CardHeader><CardTitle className="text-base">Pedidos e itens vendidos</CardTitle><CardDescription>O valor de pedidos mistos considera apenas a participação dos produtos da Sub-Loja.</CardDescription></CardHeader><CardContent><TabelaPedidos resumo={resumoPeriodo} /></CardContent></Card>
        </TabsContent>
      </Tabs>

      <Dialog open={confirmarFechamento} onOpenChange={setConfirmarFechamento}>
        <DialogContent>
          <DialogHeader><DialogTitle>Fechar o dia {dataBR(diaCaixa)}?</DialogTitle><DialogDescription>Será salvo um retrato dos números atuais da Sub-Loja. Esta ação não interfere no caixa contábil principal.</DialogDescription></DialogHeader>
          <div className="grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-4 text-sm"><div><p className="text-muted-foreground">Faturamento</p><p className="font-semibold">{brl(resumoDia.faturamento)}</p></div><div><p className="text-muted-foreground">Pedidos</p><p className="font-semibold">{resumoDia.pedidos}</p></div><div><p className="text-muted-foreground">Despesas</p><p className="font-semibold">{brl(resumoDia.despesas)}</p></div><div><p className="text-muted-foreground">Lucro líquido</p><p className={`font-semibold ${resumoDia.lucroLiquido < 0 ? "text-destructive" : "text-success"}`}>{brl(resumoDia.lucroLiquido)}</p></div></div>
          <DialogFooter><Button variant="outline" onClick={() => setConfirmarFechamento(false)}>Voltar</Button><Button onClick={confirmar} disabled={fechando}><CalendarCheck className="size-4" />{fechando ? "Salvando…" : "Confirmar fechamento"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

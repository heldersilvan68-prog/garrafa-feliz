import { Fragment, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Landmark,
  Scale,
} from "lucide-react";
import { toast } from "sonner";
import { SaldosCards } from "@/components/financeiro/saldos-cards";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputMoeda } from "@/components/ui/input-moeda";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCaixa } from "@/context/caixa";
import { useDespesas } from "@/context/despesas";
import { usePedidos } from "@/context/pedidos";
import { horaCurta } from "@/lib/caixa";
import { CATEGORIA_TAXA_CARTAO } from "@/lib/despesas";
import { brl } from "@/lib/erp";
import { calcularMovimentoDia, contaDaDespesa, contaDaVenda, contaDoRecebimento, sangriaDeDespesa } from "@/lib/financas";
import { proximoDiaUtil } from "@/lib/liquidacao";
import { parcelasDe } from "@/lib/pedidos";
import { PERIODOS, dentroFaixa, faixaPeriodo, isoLocal, type PeriodoId } from "@/lib/periodo";
import { calcularSaldos } from "@/lib/saldos";

type Conta = "especie" | "digital";
const arred = (v: number) => Math.round(v * 100) / 100;
type ExtratoItem = {
  id: string;
  conta: Conta;
  descricao: string;
  detalhe: string;
  valor: number;
  em: string;
};

function AjusteDialog({ conta, tipo }: { conta: Conta; tipo: "entrada" | "saida" }) {
  const { caixaAberto, registrarMovimento } = useCaixa();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState(0);
  const [motivo, setMotivo] = useState("");
  const entrada = tipo === "entrada";
  const digital = conta === "digital";

  const confirmar = () => {
    if (!caixaAberto) {
      toast.error("Abra o caixa antes de registrar um ajuste.");
      return;
    }
    if (valor <= 0 || !motivo.trim()) {
      toast.error("Informe o valor e o motivo do ajuste.");
      return;
    }
    if (digital) {
      registrarMovimento(
        "recebimento",
        entrada ? valor : -valor,
        `Ajuste tesouraria digital (PIX) · ${motivo.trim()}`,
      );
    } else {
      registrarMovimento(entrada ? "suprimento" : "sangria", valor, `Ajuste de saldo · ${motivo.trim()}`);
    }
    toast.success("Ajuste registrado no extrato.");
    setValor(0);
    setMotivo("");
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {entrada ? <ArrowDownCircle className="size-4" /> : <ArrowUpCircle className="size-4" />}
          {entrada ? "Entrada" : "Saída"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {entrada ? "Adicionar" : "Retirar"} saldo {digital ? "digital" : "em espécie"}
          </DialogTitle>
          <DialogDescription>
            O lançamento será identificado no extrato e atualizará o saldo em tempo real.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Campo label="Valor (R$)" htmlFor={`ajuste-${conta}-${tipo}-valor`}>
            <InputMoeda
              id={`ajuste-${conta}-${tipo}-valor`}
              valor={valor}
              onValor={setValor}
            />
          </Campo>
          <Campo label="Motivo" htmlFor={`ajuste-${conta}-${tipo}-motivo`}>
            <Input
              id={`ajuste-${conta}-${tipo}-motivo`}
              value={motivo}
              onChange={(event) => setMotivo(event.target.value)}
              placeholder="Ex.: correção após conferência"
              maxLength={160}
            />
          </Campo>
        </div>
        <DialogFooter>
          <Button onClick={confirmar} disabled={valor <= 0 || !motivo.trim() || !caixaAberto}>
            Confirmar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Conferencia({ conta, saldo }: { conta: Conta; saldo: number }) {
  const [informado, setInformado] = useState(0);
  const [conferido, setConferido] = useState(false);
  const diferenca = Math.round((informado - saldo) * 100) / 100;
  const digital = conta === "digital";

  return (
    <div className="grid gap-3 rounded-lg border border-border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {digital ? <Landmark className="size-4 text-primary" /> : <Banknote className="size-4 text-primary" />}
          <div>
            <p className="text-sm font-medium">{digital ? "Conta digital" : "Espécie"}</p>
            <p className="text-xs text-muted-foreground">Saldo calculado: {brl(saldo)}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <AjusteDialog conta={conta} tipo="entrada" />
          <AjusteDialog conta={conta} tipo="saida" />
        </div>
      </div>
      <Campo
        label={digital ? "Saldo conferido no banco (R$)" : "Valor contado na gaveta (R$)"}
        htmlFor={`conferencia-${conta}`}
      >
        <InputMoeda
          id={`conferencia-${conta}`}
          valor={informado}
          onValor={(valor) => {
            setInformado(valor);
            setConferido(true);
          }}
        />
      </Campo>
      <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
        <span className="text-muted-foreground">Diferença da conferência</span>
        <span className={`font-semibold tabular-nums ${conferido && diferenca < 0 ? "text-destructive" : conferido && diferenca > 0 ? "text-success" : ""}`}>
          {conferido ? `${diferenca > 0 ? "+" : ""}${brl(diferenca)}` : "Aguardando contagem"}
        </span>
      </div>
    </div>
  );
}

export function Tesouraria() {
  const { pedidos } = usePedidos();
  const { despesas } = useDespesas();
  const { caixas, caixaAberto } = useCaixa();
  const [periodo, setPeriodo] = useState<PeriodoId>("mes");
  const [aberto, setAberto] = useState<string | null>(null);
  const faixa = useMemo(() => faixaPeriodo(periodo), [periodo]);
  const saldos = useMemo(
    () => calcularSaldos(pedidos, despesas, caixas, faixa),
    [pedidos, despesas, caixas, faixa],
  );

  const extrato = useMemo(() => {
    const itens: ExtratoItem[] = [];
    for (const pedido of pedidos) {
      if (pedido.status === "cancelado") continue;
      parcelasDe(pedido).forEach((parcela, indice) => {
        const conta = contaDaVenda(parcela.forma);
        if (!conta) return;
        itens.push({
          id: `pedido-${pedido.id}-${indice}`,
          conta: conta === "dinheiro" ? "especie" : "digital",
          descricao: `Venda #${pedido.numero}`,
          detalhe: `${pedido.clienteNome} · ${parcela.forma}`,
          valor: parcela.valor,
          em: pedido.criadoEm,
        });
      });
    }
    for (const despesa of despesas) {
      if (despesa.status !== "Pago") continue;
      const conta = contaDaDespesa(despesa.forma);
      if (!conta) continue;
      itens.push({
        id: `despesa-${despesa.id}`,
        conta: conta === "dinheiro" ? "especie" : "digital",
        descricao: despesa.categoria === CATEGORIA_TAXA_CARTAO ? "Taxa de cartão" : despesa.descricao,
        detalhe: `${despesa.categoria} · ${despesa.forma}`,
        valor: -despesa.valor,
        em: despesa.criadoEm,
      });
    }
    for (const caixa of caixas) {
      for (const movimento of caixa.movimentos) {
        if (sangriaDeDespesa(movimento)) continue;
        const contaMovimento = movimento.tipo === "recebimento" ? contaDoRecebimento(movimento) : "dinheiro";
        const valor = movimento.tipo === "sangria" ? -movimento.valor : movimento.valor;
        itens.push({
          id: `movimento-${movimento.id}`,
          conta: contaMovimento === "dinheiro" ? "especie" : "digital",
          descricao:
            movimento.tipo === "sangria"
              ? "Sangria"
              : movimento.tipo === "suprimento"
                ? "Suprimento"
                : movimento.valor < 0
                  ? "Ajuste de saída"
                  : "Recebimento / ajuste",
          detalhe: movimento.motivo,
          valor,
          em: movimento.em,
        });
      }
    }
    return itens.sort((a, b) => new Date(b.em).getTime() - new Date(a.em).getTime());
  }, [pedidos, despesas, caixas]);

  const resumo = useMemo(() => {
    const dias = new Set<string>();
    for (const item of extrato) {
      const dia = isoLocal(item.em);
      if (dentroFaixa(dia, faixa)) dias.add(dia);
    }
    return [...dias]
      .sort((a, b) => b.localeCompare(a))
      .map((dia) => {
        const m = calcularMovimentoDia(dia, pedidos, despesas, caixas);
        const pix = arred(m.vendasPix + m.recebimentosPix - m.saidasPix);
        const especie = arred(m.vendasDinheiro + m.recebimentosDinheiro + m.suprimentos - m.saidasDinheiro - m.sangrias);
        const cartao = arred(m.vendasCartao + m.recebimentosCartao - m.taxasCartao - m.saidasCartao);
        return { dia, pix, especie, cartao, total: arred(pix + especie + cartao), liquidaEm: proximoDiaUtil(dia) };
      });
  }, [extrato, faixa, pedidos, despesas, caixas]);

  const totais = resumo.reduce(
    (t, r) => ({ pix: t.pix + r.pix, especie: t.especie + r.especie, cartao: t.cartao + r.cartao, total: t.total + r.total }),
    { pix: 0, especie: 0, cartao: 0, total: 0 },
  );
  const hoje = isoLocal(new Date());
  const cor = (v: number) => (v < 0 ? "text-destructive" : "");
  const dataBr = (dia: string) => dia.split("-").reverse().join("/");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Saldos e resumo calculados apenas com as movimentações do período selecionado.
        </p>
        <Select value={periodo} onValueChange={(v) => setPeriodo(v as PeriodoId)}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Período dos saldos">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.filter((p) => p.id !== "custom").map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <SaldosCards faixa={faixa} />

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="size-4 text-primary" /> Conferência e ajuste rápido
          </CardTitle>
          <CardDescription>
            Compare os valores reais com o sistema. Ajustes exigem uma sessão de caixa aberta.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <Conferencia conta="especie" saldo={saldos.especie} />
          <Conferencia conta="digital" saldo={saldos.conta} />
          {!caixaAberto ? (
            <p className="text-xs text-muted-foreground lg:col-span-2">
              Abra uma sessão em Caixa &amp; Acerto para registrar ajustes.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-primary" /> Resumo Diário de Fechamentos (Valores Líquidos)
            </CardTitle>
            <CardDescription>
              Líquido por dia e forma. Cartão já descontado das taxas; entra no saldo digital no próximo dia útil.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {resumo.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma movimentação no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">PIX (Líquido)</TableHead>
                    <TableHead className="text-right">Espécie (Líquido)</TableHead>
                    <TableHead className="text-right">Cartão (Líquido)</TableHead>
                    <TableHead className="text-right">Total Líquido do Dia</TableHead>
                    <TableHead className="text-right">Ações / Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumo.map((r) => {
                    const expandido = aberto === r.dia;
                    const itens = expandido ? extrato.filter((i) => isoLocal(i.em) === r.dia) : [];
                    return (
                      <Fragment key={r.dia}>
                        <TableRow>
                          <TableCell className="font-medium">{dataBr(r.dia)}</TableCell>
                          <TableCell className={`text-right tabular-nums ${cor(r.pix)}`}>{brl(r.pix)}</TableCell>
                          <TableCell className={`text-right tabular-nums ${cor(r.especie)}`}>{brl(r.especie)}</TableCell>
                          <TableCell className="text-right">
                            <span className={`tabular-nums ${cor(r.cartao)}`}>{brl(r.cartao)}</span>
                            {r.cartao !== 0 ? (
                              <span className="block text-[11px] text-muted-foreground">
                                {r.liquidaEm <= hoje ? "Liquidado" : "A receber"} em {dataBr(r.liquidaEm)}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className={`text-right font-semibold tabular-nums ${cor(r.total)}`}>{brl(r.total)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setAberto(expandido ? null : r.dia)}>
                              {expandido ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                              {expandido ? "Ocultar" : "Ver extrato detalhado"}
                            </Button>
                          </TableCell>
                        </TableRow>
                        {expandido ? (
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableCell colSpan={6}>
                              <div className="divide-y divide-border">
                                {itens.map((item) => (
                                  <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2">
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="truncate text-sm font-medium">{item.descricao}</p>
                                        <Badge variant="outline" className="shrink-0">
                                          {item.conta === "especie" ? "Espécie" : "Digital"}
                                        </Badge>
                                      </div>
                                      <p className="truncate text-xs text-muted-foreground">
                                        {horaCurta(item.em)} · {item.detalhe}
                                      </p>
                                    </div>
                                    <span className={`self-center text-sm font-semibold tabular-nums ${item.valor < 0 ? "text-destructive" : "text-success"}`}>
                                      {item.valor >= 0 ? "+" : "−"} {brl(Math.abs(item.valor))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total do período</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(arred(totais.pix))}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(arred(totais.especie))}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(arred(totais.cartao))}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(arred(totais.total))}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

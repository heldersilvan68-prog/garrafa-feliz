import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BadgeDollarSign,
  HandCoins,
  Percent,
  Receipt,
  Settings2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
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
import { useCaixa } from "@/context/caixa";
import { usePedidos } from "@/context/pedidos";
import { brl } from "@/lib/erp";
import { useEntregadores } from "@/context/entregadores";
import {
  comissaoCalculada,
  dataCurta,
  entregasDoEntregador,
  hojeISO,
  unidadesRetornaveis,
  type RegraComissao,
} from "@/lib/caixa";

export const Route = createFileRoute("/_authenticated/comissoes")({
  head: () => ({
    meta: [
      { title: "Gestão de Comissões dos Entregadores — AquaERP" },
      {
        name: "description",
        content:
          "Configure regras de comissão por unidade entregue ou percentual, acompanhe o extrato de cada entregador, registre vales e pague comissões.",
      },
      { property: "og:title", content: "Gestão de Comissões dos Entregadores — AquaERP" },
      {
        property: "og:description",
        content:
          "Extrato por entregador com entregas concluídas, comissão do período, vales e pagamentos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComissoesPage,
});

function RegraDialog({ regra }: { regra: RegraComissao }) {
  const { salvarRegra } = useCaixa();
  const [open, setOpen] = useState(false);
  const [porUnidade, setPorUnidade] = useState(String(regra.porUnidade));
  const [percentual, setPercentual] = useState(String(regra.percentual));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings2 className="size-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regra de comissão · {regra.entregador}</DialogTitle>
          <DialogDescription>
            Use valor por unidade entregue, percentual sobre as vendas, ou os dois somados.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="por-unidade">R$ por vasilhame entregue</Label>
            <Input
              id="por-unidade"
              type="number"
              min={0}
              step="0.01"
              value={porUnidade}
              onChange={(e) => setPorUnidade(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="percentual">% sobre o valor entregue</Label>
            <Input
              id="percentual"
              type="number"
              min={0}
              step="0.1"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              salvarRegra({
                entregador: regra.entregador,
                porUnidade: Math.max(0, Number(porUnidade) || 0),
                percentual: Math.max(0, Number(percentual) || 0),
              });
              setOpen(false);
              toast.success("Regra atualizada.");
            }}
          >
            Salvar regra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValeDialog({ entregador }: { entregador: string }) {
  const { registrarVale } = useCaixa();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Receipt className="size-4" />
          Registrar vale / adiantamento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vale / adiantamento</DialogTitle>
          <DialogDescription>{entregador}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="vale-valor">Valor (R$)</Label>
            <Input
              id="vale-valor"
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="vale-motivo">Motivo</Label>
            <Input
              id="vale-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Combustível, adiantamento..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!Number(valor)}
            onClick={() => {
              registrarVale(entregador, Number(valor), motivo.trim() || "—");
              setValor("");
              setMotivo("");
              setOpen(false);
              toast.success("Vale registrado.");
            }}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linha({ label, valor, tom }: { label: string; valor: string; tom?: "forte" | "neg" }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          tom === "forte"
            ? "text-base font-semibold tabular-nums"
            : tom === "neg"
              ? "font-semibold tabular-nums text-destructive"
              : "tabular-nums"
        }
      >
        {valor}
      </span>
    </div>
  );
}

function ComissoesPage() {
  const { regras, vales, pagamentos, pagarComissao } = useCaixa();
  const { opcoes: ENTREGADORES } = useEntregadores();
  const { pedidos } = usePedidos();
  const dia = hojeISO();
  const [entregador, setEntregador] = useState(ENTREGADORES[1] ?? ENTREGADORES[0]);

  const regra =
    regras.find((r) => r.entregador === entregador) ??
    ({ entregador, porUnidade: 0, percentual: 0 } as RegraComissao);

  const entregas = useMemo(
    () => entregasDoEntregador(pedidos, entregador, dia),
    [pedidos, entregador, dia],
  );

  const comissaoHoje = comissaoCalculada(regra, entregas);
  const valesEntregador = vales.filter((v) => v.entregador === entregador);
  const pagosEntregador = pagamentos.filter((p) => p.entregador === entregador);
  const totalVales = valesEntregador.reduce((s, v) => s + v.valor, 0);
  const totalPago = pagosEntregador.reduce((s, p) => s + p.valor, 0);
  const saldo = comissaoHoje - totalVales - totalPago;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gestão de Comissões</h1>
          <p className="text-sm text-muted-foreground">
            Regras por entregador, extrato do período, vales e pagamentos.
          </p>
        </div>
        <Select value={entregador} onValueChange={setEntregador}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTREGADORES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Truck className="size-4 text-primary" />
              Extrato de hoje
            </CardTitle>
            <CardDescription>{entregador}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Linha label="Entregas concluídas" valor={`${entregas.length}`} />
            <Linha label="Vasilhames entregues" valor={`${unidadesRetornaveis(entregas)} un`} />
            <Linha
              label="Valor entregue"
              valor={brl(entregas.reduce((s, p) => s + p.total, 0))}
            />
            <Separator />
            <Linha label="Comissão do dia" valor={brl(comissaoHoje)} tom="forte" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="size-4 text-primary" />
              Regra aplicada
            </CardTitle>
            <CardDescription>Como a comissão é calculada</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Linha label="Por vasilhame entregue" valor={brl(regra.porUnidade)} />
            <Linha label="Percentual sobre vendas" valor={`${regra.percentual}%`} />
            <Separator />
            <div className="pt-1">
              <RegraDialog regra={regra} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BadgeDollarSign className="size-4 text-primary" />
              Saldo a pagar
            </CardTitle>
            <CardDescription>Comissão menos vales e pagamentos</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Linha label="Comissão acumulada" valor={brl(comissaoHoje)} />
            <Linha label="Vales / adiantamentos" valor={`- ${brl(totalVales)}`} tom="neg" />
            <Linha label="Já pago" valor={`- ${brl(totalPago)}`} tom="neg" />
            <Separator />
            <Linha label="Saldo atual" valor={brl(saldo)} tom="forte" />
            <div className="flex flex-wrap gap-2 pt-2">
              <ValeDialog entregador={entregador} />
              <Button
                size="sm"
                disabled={saldo <= 0}
                onClick={() => {
                  pagarComissao(entregador, saldo);
                  toast.success(`Comissão de ${brl(saldo)} paga a ${entregador}.`);
                }}
              >
                <HandCoins className="size-4" />
                Pagar comissão
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Regras por entregador</CardTitle>
          <CardDescription>Valor por unidade e/ou percentual das vendas</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entregador</TableHead>
                <TableHead className="text-right">R$ / unidade</TableHead>
                <TableHead className="text-right">% vendas</TableHead>
                <TableHead className="text-right">Entregas hoje</TableHead>
                <TableHead className="text-right">Comissão hoje</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ENTREGADORES.map((e) => {
                const r =
                  regras.find((x) => x.entregador === e) ??
                  ({ entregador: e, porUnidade: 0, percentual: 0 } as RegraComissao);
                const ent = entregasDoEntregador(pedidos, e, dia);
                return (
                  <TableRow key={e}>
                    <TableCell className="font-medium">{e}</TableCell>
                    <TableCell className="text-right tabular-nums">{brl(r.porUnidade)}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.percentual}%</TableCell>
                    <TableCell className="text-right tabular-nums">{ent.length}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {brl(comissaoCalculada(r, ent))}
                    </TableCell>
                    <TableCell className="text-right">
                      <RegraDialog regra={r} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Vales de {entregador}</CardTitle>
          </CardHeader>
          <CardContent>
            {valesEntregador.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum vale registrado.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {valesEntregador.map((v) => (
                  <li key={v.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{v.motivo}</span>
                      <span className="text-xs text-muted-foreground">{dataCurta(v.em)}</span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-destructive">
                      - {brl(v.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comissões pagas a {entregador}</CardTitle>
          </CardHeader>
          <CardContent>
            {pagosEntregador.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum pagamento registrado.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {pagosEntregador.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">{dataCurta(p.em)}</span>
                    <span className="font-semibold tabular-nums text-success">{brl(p.valor)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

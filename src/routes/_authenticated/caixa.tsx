import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Calculator,
  CreditCard,
  Lock,
  LockOpen,
  Package,
  Recycle,
  Truck,
  Wallet,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Campo } from "@/components/ui/campo";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
import { useEstoque } from "@/context/estoque";
import { brl } from "@/lib/erp";
import { STATUS_PEDIDO_LABEL, resumoItens } from "@/lib/pedidos";
import { useEntregadores } from "@/context/entregadores";
import {
  dinheiroEsperado,
  dinheiroRecebido,
  entregasDoEntregador,
  hojeISO,
  horaCurta,
  pedidosDoDia,
  somaMovimentos,
  totaisPorPagamento,
  unidadesRetornaveis,
  vaziosRecolhidos,
  type TipoMovimento,
} from "@/lib/caixa";

export const Route = createFileRoute("/_authenticated/caixa")({
  head: () => ({
    meta: [
      { title: "Caixa— AquaERP" },
      {
        name: "description",
        content:
          "Abertura e fechamento de caixa com sangria, suprimento, conferência de dinheiro e acerto de vasilhames por entregador.",
      },
      { property: "og:title", content: "Caixa — AquaERP" },
      {
        property: "og:description",
        content:
          "Controle o dinheiro do dia, registre sangrias e faça o acerto de vasilhames e valores com cada entregador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CaixaPage,
});

function ValorLinha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: "positivo" | "negativo" | "forte";
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          destaque === "positivo"
            ? "font-semibold tabular-nums text-success"
            : destaque === "negativo"
              ? "font-semibold tabular-nums text-destructive"
              : destaque === "forte"
                ? "text-base font-semibold tabular-nums"
                : "tabular-nums"
        }
      >
        {valor}
      </span>
    </div>
  );
}

function AbrirCaixaDialog() {
  const { abrirCaixa } = useCaixa();
  const [open, setOpen] = useState(false);
  const [troco, setTroco] = useState("100");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <LockOpen className="size-4" />
          Abrir caixa
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir caixa</DialogTitle>
          <DialogDescription>Informe o troco inicial da gaveta.</DialogDescription>
        </DialogHeader>
        <Campo label="Troco inicial (R$)" htmlFor="troco-inicial">
          <Input
            id="troco-inicial"
            type="number"
            min={0}
            step="0.01"
            value={troco}
            onChange={(e) => setTroco(e.target.value)}
          />
        </Campo>
        <DialogFooter>
          <Button
            onClick={() => {
              abrirCaixa(Math.max(0, Number(troco) || 0));
              setOpen(false);
              toast.success("Caixa aberto.");
            }}
          >
            Abrir caixa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovimentoDialog({ tipo }: { tipo: TipoMovimento }) {
  const { registrarMovimento } = useCaixa();
  const [open, setOpen] = useState(false);
  const [valor, setValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const sangria = tipo === "sangria";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          {sangria ? <ArrowUpCircle className="size-4" /> : <ArrowDownCircle className="size-4" />}
          {sangria ? "Sangria" : "Suprimento"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{sangria ? "Registrar sangria" : "Registrar suprimento"}</DialogTitle>
          <DialogDescription>
            {sangria
              ? "Retirada de dinheiro da gaveta (depósito, pagamento, cofre)."
              : "Entrada de dinheiro na gaveta (reforço de troco)."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <Campo label="Valor (R$)" htmlFor="mov-valor">
            <Input
              id="mov-valor"
              type="number"
              min={0}
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </Campo>
          <Campo label="Motivo" htmlFor="mov-motivo">
            <Input
              id="mov-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={sangria ? "Depósito bancário" : "Reforço de troco"}
            />
          </Campo>
        </div>
        <DialogFooter>
          <Button
            disabled={!Number(valor)}
            onClick={() => {
              registrarMovimento(tipo, Number(valor), motivo.trim() || "—");
              setValor("");
              setMotivo("");
              setOpen(false);
              toast.success(sangria ? "Sangria registrada." : "Suprimento registrado.");
            }}
          >
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FecharCaixaDialog({
  esperado,
  esperadoPix,
  esperadoCartao,
}: {
  esperado: number;
  esperadoPix: number;
  esperadoCartao: number;
}) {
  const { fecharCaixa } = useCaixa();
  const { produtos } = useEstoque();
  const [open, setOpen] = useState(false);
  const [contado, setContado] = useState("");
  const [pix, setPix] = useState("");
  const [cartao, setCartao] = useState("");
  const [cheios, setCheios] = useState("");
  const [vazios, setVazios] = useState("");
  const diferenca = (Number(contado) || 0) - esperado;
  const difPix = (Number(pix) || 0) - esperadoPix;
  const difCartao = (Number(cartao) || 0) - esperadoCartao;

  const retornaveis = produtos.filter((p) => p.retornavel);
  const cheiosSistema = retornaveis.reduce((s, p) => s + (p.estoqueCheio || 0), 0);
  const vaziosSistema = retornaveis.reduce((s, p) => s + (p.estoqueVazio || 0), 0);
  const divCheios = (Number(cheios) || 0) - cheiosSistema;
  const divVazios = (Number(vazios) || 0) - vaziosSistema;
  const conferido =
    contado !== "" && pix !== "" && cartao !== "" && cheios !== "" && vazios !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Lock className="size-4" />
          Fechar caixa
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fechar caixa</DialogTitle>
          <DialogDescription>
            Confira o declarado x sistema em cada forma de pagamento e o estoque de vasilhames.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">Conferência financeira por forma de pagamento</p>

            <ValorLinha label="Dinheiro no sistema" valor={brl(esperado)} destaque="forte" />
            <Campo label="Valor contado em Dinheiro (R$)" htmlFor="contado">
              <Input
                id="contado"
                type="number"
                min={0}
                step="0.01"
                value={contado}
                onChange={(e) => setContado(e.target.value)}
              />
            </Campo>
            {contado !== "" && (
              <ValorLinha
                label={`Diferença em Dinheiro (${diferenca < 0 ? "falta" : "sobra"})`}
                valor={brl(diferenca)}
                destaque={diferenca < 0 ? "negativo" : "positivo"}
              />
            )}

            <ValorLinha label="PIX no sistema" valor={brl(esperadoPix)} destaque="forte" />
            <Campo label="Valor conferido em PIX (R$)" htmlFor="conf-pix">
              <Input
                id="conf-pix"
                type="number"
                min={0}
                step="0.01"
                value={pix}
                onChange={(e) => setPix(e.target.value)}
              />
            </Campo>
            {pix !== "" && (
              <ValorLinha
                label={`Diferença em PIX (${difPix < 0 ? "falta" : "sobra"})`}
                valor={brl(difPix)}
                destaque={difPix < 0 ? "negativo" : "positivo"}
              />
            )}

            <ValorLinha
              label="Cartão (débito + crédito) no sistema"
              valor={brl(esperadoCartao)}
              destaque="forte"
            />
            <Campo label="Valor conferido em Cartão (R$)" htmlFor="conf-cartao">
              <Input
                id="conf-cartao"
                type="number"
                min={0}
                step="0.01"
                value={cartao}
                onChange={(e) => setCartao(e.target.value)}
              />
            </Campo>
            {cartao !== "" && (
              <ValorLinha
                label={`Diferença em Cartão (${difCartao < 0 ? "falta" : "sobra"})`}
                valor={brl(difCartao)}
                destaque={difCartao < 0 ? "negativo" : "positivo"}
              />
            )}
          </div>

          <div className="mt-2 grid gap-3 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">Conferência de estoque físico (obrigatória)</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo label="Cheios no depósito" htmlFor="conf-cheios">
                <Input
                  id="conf-cheios"
                  type="number"
                  min={0}
                  value={cheios}
                  onChange={(e) => setCheios(e.target.value)}
                />
              </Campo>
              <Campo label="Vazios no depósito" htmlFor="conf-vazios">
                <Input
                  id="conf-vazios"
                  type="number"
                  min={0}
                  value={vazios}
                  onChange={(e) => setVazios(e.target.value)}
                />
              </Campo>
            </div>
            <ValorLinha label="Cheios no sistema" valor={String(cheiosSistema)} />
            <ValorLinha label="Vazios no sistema" valor={String(vaziosSistema)} />
            {cheios !== "" && (
              <ValorLinha
                label="Divergência de cheios"
                valor={`${divCheios > 0 ? "+" : ""}${divCheios}`}
                destaque={divCheios < 0 ? "negativo" : "positivo"}
              />
            )}
            {vazios !== "" && (
              <ValorLinha
                label="Divergência de vazios"
                valor={`${divVazios > 0 ? "+" : ""}${divVazios}`}
                destaque={divVazios < 0 ? "negativo" : "positivo"}
              />
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!conferido}
            onClick={() => {
              fecharCaixa({
                contado: Number(contado),
                esperado,
                contadoPix: Number(pix),
                esperadoPix,
                contadoCartao: Number(cartao),
                esperadoCartao,
              });
              setOpen(false);
              if (divCheios !== 0 || divVazios !== 0) {
                toast.warning(
                  `Estoque com divergência: cheios ${divCheios > 0 ? "+" : ""}${divCheios}, vazios ${divVazios > 0 ? "+" : ""}${divVazios}.`,
                );
              }
              const zerado = diferenca === 0 && difPix === 0 && difCartao === 0;
              toast.success(
                zerado
                  ? "Caixa fechado sem diferença."
                  : `Caixa fechado · Dinheiro ${brl(diferenca)} · PIX ${brl(difPix)} · Cartão ${brl(difCartao)}.`,
              );
            }}
          >
            Confirmar fechamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function AcertoEntregador() {
  const { pedidos } = usePedidos();
  const { produtos } = useEstoque();
  const { opcoes: ENTREGADORES } = useEntregadores();
  const [entregador, setEntregador] = useState(ENTREGADORES[1] ?? ENTREGADORES[0]);
  const dia = hojeISO();

  const entregas = useMemo(
    () => entregasDoEntregador(pedidos, entregador, dia),
    [pedidos, entregador, dia],
  );
  const emRota = useMemo(
    () =>
      pedidos.filter(
        (p) => p.entregador === entregador && p.status === "em-rota" && p.criadoEm.slice(0, 10) === dia,
      ),
    [pedidos, entregador, dia],
  );

  const cheiosSaida = unidadesRetornaveis([...entregas, ...emRota]);
  const cheiosEntregues = unidadesRetornaveis(entregas);
  const cheiosVolta = cheiosSaida - cheiosEntregues;
  const vazios = vaziosRecolhidos(entregas);
  const dinheiro = dinheiroRecebido(entregas);
  const totalEntregas = entregas.reduce((s, p) => s + p.total, 0);
  const fiado = entregas
    .filter((p) => p.pagamento === "Fiado")
    .reduce((s, p) => s + p.total, 0);
  const vaziosEstoque = produtos
    .filter((p) => p.retornavel)
    .reduce((s, p) => s + p.estoqueVazio, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-primary" />
            Acerto do entregador
          </CardTitle>
          <CardDescription>Conferência do turno de hoje</CardDescription>
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
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Recycle className="size-4 text-primary" />
              Conferência de vasilhames (20L)
            </p>
            <div className="flex flex-col gap-2">
              <ValorLinha label="Cheios que saíram" valor={`${cheiosSaida} un`} />
              <ValorLinha label="Cheios entregues" valor={`${cheiosEntregues} un`} />
              <ValorLinha
                label="Cheios a devolver ao depósito"
                valor={`${cheiosVolta} un`}
                destaque={cheiosVolta > 0 ? "negativo" : "positivo"}
              />
              <Separator />
              <ValorLinha label="Vazios recolhidos de clientes" valor={`${vazios} un`} />
              <ValorLinha
                label="Vazios hoje no depósito"
                valor={`${vaziosEstoque} un`}
                destaque="forte"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet className="size-4 text-primary" />
              Conferência financeira
            </p>
            <div className="flex flex-col gap-2">
              <ValorLinha label="Total entregue (vendas)" valor={brl(totalEntregas)} />
              <ValorLinha label="Recebido em cartão / PIX" valor={brl(totalEntregas - dinheiro - fiado)} />
              <ValorLinha label="Fiado deixado na caderneta" valor={brl(fiado)} />
              <Separator />
              <ValorLinha label="Dinheiro recebido em rota" valor={brl(dinheiro)} />
              <ValorLinha
                label="Valor a entregar no caixa"
                valor={brl(dinheiro)}
                destaque="forte"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4 text-muted-foreground" />
            Entregas do turno ({entregas.length + emRota.length})
          </p>
          {entregas.length + emRota.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma entrega registrada hoje para {entregador}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pgto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...emRota, ...entregas].map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">#{p.numero}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{p.clienteNome}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {resumoItens(p.itens)}
                      </TableCell>
                      <TableCell>{p.pagamento}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(p.total)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "concluido" ? "outline" : "default"}>
                          {STATUS_PEDIDO_LABEL[p.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CaixaPage() {
  const { caixaAberto, caixas } = useCaixa();
  const { pedidos } = usePedidos();
  const dia = hojeISO();
  const doDia = useMemo(() => pedidosDoDia(pedidos, dia), [pedidos, dia]);
  const totais = totaisPorPagamento(doDia);
  const esperado = caixaAberto ? dinheiroEsperado(caixaAberto, doDia) : 0;
  const fechados = caixas.filter((c) => c.fechadoEm);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fechamento de Caixa</h1>
          <p className="text-sm text-muted-foreground">
            {caixaAberto
              ? `Caixa aberto às ${horaCurta(caixaAberto.abertoEm)} · troco inicial ${brl(caixaAberto.trocoInicial)}`
              : "Nenhum caixa aberto no momento."}
          </p>
        </div>
        {caixaAberto ? (
          <div className="flex flex-wrap gap-2">
            <MovimentoDialog tipo="suprimento" />
            <MovimentoDialog tipo="sangria" />
            <FecharCaixaDialog
              esperado={esperado}
              esperadoPix={totais.PIX}
              esperadoCartao={totais.Débito + totais.Crédito}
            />

          </div>
        ) : (
          <AbrirCaixaDialog />
        )}
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="size-4 text-primary" />
              Entradas do dia por forma
            </CardTitle>
            <CardDescription>{doDia.length} pedido(s) hoje</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ValorLinha label="Dinheiro" valor={brl(totais.Dinheiro)} />
            <ValorLinha label="PIX" valor={brl(totais.PIX)} />
            <ValorLinha label="Cartão de débito" valor={brl(totais["Débito"])} />
            <ValorLinha label="Cartão de crédito" valor={brl(totais["Crédito"])} />
            <ValorLinha label="Fiado / caderneta" valor={brl(totais.Fiado)} destaque="negativo" />
            <Separator />
            <ValorLinha
              label="Total vendido"
              valor={brl(doDia.reduce((s, p) => s + p.total, 0))}
              destaque="forte"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Banknote className="size-4 text-primary" />
              Gaveta (dinheiro)
            </CardTitle>
            <CardDescription>Movimentações do caixa atual</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ValorLinha label="Troco inicial" valor={brl(caixaAberto?.trocoInicial ?? 0)} />
            <ValorLinha label="Vendas em dinheiro" valor={brl(caixaAberto ? totais.Dinheiro : 0)} />
            <ValorLinha
              label="Suprimentos"
              valor={brl(caixaAberto ? somaMovimentos(caixaAberto.movimentos, "suprimento") : 0)}
              destaque="positivo"
            />
            <ValorLinha
              label="Sangrias"
              valor={`- ${brl(caixaAberto ? somaMovimentos(caixaAberto.movimentos, "sangria") : 0)}`}
              destaque="negativo"
            />
            <Separator />
            <ValorLinha label="Dinheiro esperado" valor={brl(esperado)} destaque="forte" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="size-4 text-primary" />
              Movimentos
            </CardTitle>
            <CardDescription>Sangrias e suprimentos de hoje</CardDescription>
          </CardHeader>
          <CardContent>
            {!caixaAberto || caixaAberto.movimentos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum movimento registrado.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {caixaAberto.movimentos.map((m) => (
                  <li key={m.id} className="flex items-start justify-between gap-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {m.tipo === "sangria"
                          ? "Sangria"
                          : m.tipo === "recebimento"
                            ? "Recebimento"
                            : "Suprimento"}{" "}
                        · {m.motivo}
                      </span>
                      <span className="text-xs text-muted-foreground">{horaCurta(m.em)}</span>
                    </span>
                    <span
                      className={
                        m.tipo === "sangria"
                          ? "shrink-0 font-semibold tabular-nums text-destructive"
                          : "shrink-0 font-semibold tabular-nums text-success"
                      }
                    >
                      {m.tipo === "sangria" ? "-" : "+"} {brl(m.valor)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AcertoEntregador />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Caixas fechados</CardTitle>
          <CardDescription>Histórico de fechamentos e diferenças</CardDescription>
        </CardHeader>
        <CardContent>
          {fechados.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum caixa fechado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Dia</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead>Fechamento</TableHead>
                    <TableHead className="text-right">Troco inicial</TableHead>
                    <TableHead className="text-right">Contado</TableHead>
                    <TableHead className="text-right">Diferença</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fechados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.dia.split("-").reverse().join("/")}</TableCell>
                      <TableCell>{horaCurta(c.abertoEm)}</TableCell>
                      <TableCell>{c.fechadoEm ? horaCurta(c.fechadoEm) : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(c.trocoInicial)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {brl(c.contado ?? 0)}
                      </TableCell>
                      <TableCell
                        className={
                          (c.diferenca ?? 0) < 0
                            ? "text-right font-semibold tabular-nums text-destructive"
                            : "text-right font-semibold tabular-nums text-success"
                        }
                      >
                        {brl(c.diferenca ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

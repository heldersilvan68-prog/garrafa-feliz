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
import { useDespesas } from "@/context/despesas";
import { useEstoque } from "@/context/estoque";
import { brl } from "@/lib/erp";
import {
  dinheiroEsperado,
  hojeISO,
  horaCurta,
  pedidosDoDia,
  somaMovimentos,
  totaisPorPagamento,
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
  const conferido = contado !== "" && pix !== "" && cartao !== "" && cheios !== "" && vazios !== "";

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

function CaixaPage() {
  const { caixaAberto, caixas } = useCaixa();
  const { pedidos } = usePedidos();
  const { despesas } = useDespesas();
  const dia = hojeISO();
  const doDia = useMemo(() => pedidosDoDia(pedidos, dia), [pedidos, dia]);
  const totais = totaisPorPagamento(doDia);
  const fechados = caixas.filter((c) => c.fechadoEm);
  const cartaoTotal = totais["Débito"] + totais["Crédito"];

  // Saídas reais do dia (taxas de cartão são retenções da adquirente, não saída de caixa).
  const saidasDoDia = useMemo(
    () => despesas.filter((d) => d.data === dia && d.categoria !== CATEGORIA_TAXA_CARTAO),
    [despesas, dia],
  );
  const totalSaidas = saidasDoDia.reduce((s, d) => s + d.valor, 0);
  const saidasPix = saidasDoDia
    .filter((d) => d.forma === "PIX")
    .reduce((s, d) => s + d.valor, 0);
  const saidasDinheiro = saidasDoDia
    .filter((d) => d.forma === "Dinheiro")
    .reduce((s, d) => s + d.valor, 0);
  const pixEsperadoConta = totais.PIX - saidasPix;

  // Sangrias avulsas: as geradas por despesas já aparecem na lista de saídas.
  const movimentosVisiveis = useMemo(
    () =>
      (caixaAberto?.movimentos ?? []).filter(
        (m) => !(m.tipo === "sangria" && m.motivo.trim().toLowerCase().startsWith("despesa:")),
      ),
    [caixaAberto],
  );
  const suprimentos = caixaAberto
    ? somaMovimentos(caixaAberto.movimentos, "suprimento")
    : 0;
  const sangriasAvulsas = somaMovimentos(movimentosVisiveis, "sangria");
  const esperado = caixaAberto
    ? caixaAberto.trocoInicial + totais.Dinheiro + suprimentos - saidasDinheiro - sangriasAvulsas
    : 0;

  // Agrupa despesas divididas (mesma descrição no dia) para mostrar cada forma.
  const gruposSaidas = useMemo(() => {
    const mapa = new Map<string, { descricao: string; partes: { valor: number; forma: string }[] }>();
    for (const d of saidasDoDia) {
      const chave = d.descricao.trim().toLowerCase();
      const atual = mapa.get(chave) ?? { descricao: d.descricao, partes: [] };
      atual.partes.push({ valor: d.valor, forma: d.forma });
      mapa.set(chave, atual);
    }
    return [...mapa.values()];
  }, [saidasDoDia]);

  const semMovimentos = movimentosVisiveis.length === 0 && gruposSaidas.length === 0;


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
              esperadoCartao={cartaoTotal}
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
            <ValorLinha label="Cartão Total" valor={brl(cartaoTotal)} destaque="forte" />
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
              Conferência Geral
            </CardTitle>
            <CardDescription>Resumo completo do caixa de hoje</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <ValorLinha label="Troco inicial" valor={brl(caixaAberto?.trocoInicial ?? 0)} />
            <ValorLinha label="Vendas em dinheiro" valor={brl(caixaAberto ? totais.Dinheiro : 0)} />
            <ValorLinha label="Vendas em PIX" valor={brl(totais.PIX)} />
            <ValorLinha
              label="Suprimentos"
              valor={brl(caixaAberto ? somaMovimentos(caixaAberto.movimentos, "suprimento") : 0)}
              destaque="positivo"
            />
            <ValorLinha
              label="Saídas / Despesas"
              valor={`- ${brl(totalSaidas)}`}
              destaque="negativo"
            />
            <Separator />
            <ValorLinha label="Dinheiro esperado (Gaveta)" valor={brl(esperado)} destaque="forte" />
            <ValorLinha label="PIX esperado (Conta)" valor={brl(pixEsperadoConta)} destaque="forte" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="size-4 text-primary" />
              Movimentos
            </CardTitle>
            <CardDescription>Sangrias, suprimentos e todas as saídas de hoje</CardDescription>
          </CardHeader>
          <CardContent>
            {semMovimentos ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum movimento registrado.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {(caixaAberto?.movimentos ?? []).map((m) => (
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
                {gruposSaidas.map((g) => (
                  <li
                    key={`saida-${g.descricao}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">Despesa: {g.descricao}</span>
                      <span className="block text-xs text-muted-foreground">
                        {g.partes.map((p) => `${brl(p.valor)} [${p.forma}]`).join(" / ")}
                      </span>
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums text-destructive">
                      - {brl(g.partes.reduce((s, p) => s + p.valor, 0))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>


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

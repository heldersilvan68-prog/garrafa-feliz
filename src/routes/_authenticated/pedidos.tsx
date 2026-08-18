import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  MessageCircle,
  Pencil,
  BadgeDollarSign,
  Plus,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PdvDrawer } from "@/components/pdv/pdv-drawer";
import { BaixaFiadoDialog } from "@/components/pedidos/baixa-fiado-dialog";
import { CancelarPedidoDialog } from "@/components/pedidos/cancelar-pedido-dialog";
import { DetalhesPedidoDialog } from "@/components/pedidos/detalhes-pedido-dialog";
import { EditarPedidoDialog } from "@/components/pedidos/editar-pedido-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePedidos } from "@/context/pedidos";
import { usePeriodo } from "@/hooks/use-periodo";
import { dentroFaixa } from "@/lib/periodo";
import { brl } from "@/lib/erp";

import {
  STATUS_PEDIDO_LABEL,
  acaoStatusLabel,
  fiadoEmAberto,
  proximoStatus,
  reciboWhatsApp,
  resumoItens,
  rotuloPagamento,
  tempoDecorrido,
  type Pedido,
  type StatusPedido,
} from "@/lib/pedidos";

export const Route = createFileRoute("/_authenticated/pedidos")({
  head: () => ({
    meta: [
      { title: "Vendas · AquaERP" },
      {
        name: "description",
        content:
          "PDV express e painel de pedidos: crie vendas rápidas, controle vasilhames retornáveis, pagamentos e entregas.",
      },
      { property: "og:title", content: "Vendas · AquaERP" },
      {
        property: "og:description",
        content:
          "Crie vendas em segundos, atribua entregadores e acompanhe o status de cada pedido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PedidosPage,
});

type Filtro = "todos" | StatusPedido;

const STATUS_BADGE: Record<StatusPedido, "default" | "secondary" | "destructive" | "outline"> = {
  pendente: "secondary",
  "em-rota": "default",
  concluido: "outline",
  cancelado: "destructive",
};

function PedidoCard({ pedido }: { pedido: Pedido }) {
  const { alterarStatus } = usePedidos();
  const avancar = proximoStatus(pedido.status);

  return (
    <Card>
      <DetalhesPedidoDialog pedido={pedido}>
        <CardHeader
          role="button"
          tabIndex={0}
          className="flex cursor-pointer flex-row flex-wrap items-start justify-between gap-2 pb-3 transition-colors hover:bg-muted/40"
        >
        <div className="min-w-0">
          <CardTitle className="text-base">
            #{pedido.numero} · {pedido.clienteNome}
          </CardTitle>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {pedido.endereco}
              {pedido.bairro && !pedido.endereco.includes(pedido.bairro)
                ? ` — ${pedido.bairro}`
                : ""}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_BADGE[pedido.status]}>{STATUS_PEDIDO_LABEL[pedido.status]}</Badge>
          <Badge variant={pedido.pago ? "outline" : "destructive"}>
            {pedido.pago ? rotuloPagamento(pedido) : "Fiado em aberto"}
          </Badge>
        </div>
        </CardHeader>
      </DetalhesPedidoDialog>
      <CardContent className="flex flex-col gap-3">
        <DetalhesPedidoDialog pedido={pedido}>
          <p className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
            {resumoItens(pedido.itens)}
          </p>
        </DetalhesPedidoDialog>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Bike className="size-3.5" /> {pedido.entregador}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" /> há {tempoDecorrido(pedido.criadoEm)}
          </span>
          {pedido.vaziosRecolhidos > 0 && <span>{pedido.vaziosRecolhidos} vazios recolhidos</span>}
          {pedido.trocoPara ? <span>Troco p/ {brl(pedido.trocoPara)}</span> : null}
        </div>
        {pedido.status === "cancelado" && pedido.motivoCancelamento && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2.5 text-xs">
            <p className="font-medium text-destructive">
              Motivo do cancelamento: {pedido.motivoCancelamento}
            </p>
            {pedido.obsCancelamento && (
              <p className="mt-0.5 text-muted-foreground">{pedido.obsCancelamento}</p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <span className="text-lg font-semibold tabular-nums">{brl(pedido.total)}</span>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={reciboWhatsApp(pedido)}
                target="_blank"
                rel="noreferrer"
                className="text-success"
              >
                <MessageCircle className="size-4" />
                Recibo
              </a>
            </Button>
            {fiadoEmAberto(pedido) && (
              <BaixaFiadoDialog pedido={pedido}>
                <Button size="sm" variant="outline" className="text-success">
                  <BadgeDollarSign className="size-4" />
                  Dar Baixa / Pago
                </Button>
              </BaixaFiadoDialog>
            )}
            {pedido.status !== "concluido" && pedido.status !== "cancelado" && (
              <EditarPedidoDialog pedido={pedido}>
                <Button size="sm" variant="outline">
                  <Pencil className="size-4" />
                  Editar
                </Button>
              </EditarPedidoDialog>
            )}
            {avancar && (
              <Button
                size="sm"
                onClick={() => {
                  alterarStatus(pedido.id, avancar);
                  toast.success(`Pedido #${pedido.numero}: ${STATUS_PEDIDO_LABEL[avancar]}`);
                }}
              >
                {avancar === "em-rota" ? (
                  <Truck className="size-4" />
                ) : (
                  <CheckCircle2 className="size-4" />
                )}
                {acaoStatusLabel(pedido.status)}
              </Button>
            )}
            {pedido.status !== "cancelado" && (
              <CancelarPedidoDialog pedido={pedido}>
                <Button size="sm" variant="ghost">
                  <XCircle className="size-4" />
                  Cancelar
                </Button>
              </CancelarPedidoDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PedidosPage() {
  const { pedidos } = usePedidos();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const periodo = usePeriodo("hoje");

  const doPeriodo = useMemo(
    () => pedidos.filter((p) => dentroFaixa(p.criadoEm, periodo.faixa)),
    [pedidos, periodo.faixa],
  );

  const lista = useMemo(
    () => (filtro === "todos" ? doPeriodo : doPeriodo.filter((p) => p.status === filtro)),
    [filtro, doPeriodo],
  );

  const contar = (s: Filtro) =>
    s === "todos" ? doPeriodo.length : doPeriodo.filter((p) => p.status === s).length;

  const faturamento = doPeriodo
    .filter((p) => p.status !== "cancelado")
    .reduce((s, p) => s + p.total, 0);

  const tabs: { valor: Filtro; label: string }[] = [
    { valor: "todos", label: "Todos" },
    { valor: "pendente", label: "Pendentes" },
    { valor: "em-rota", label: "Em rota" },
    { valor: "concluido", label: "Concluídos" },
    { valor: "cancelado", label: "Cancelados" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Vendas</h1>
          <p className="text-sm text-muted-foreground">
            {doPeriodo.length} pedido(s) no período · {brl(faturamento)} em vendas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodo estado={periodo} />
          <PdvDrawer>
            <Button size="lg">
              <Plus className="size-4" />
              Nova venda / Pedido express
            </Button>
          </PdvDrawer>
        </div>
      </header>

      <Tabs value={filtro} onValueChange={(v) => setFiltro(v as Filtro)}>
        <TabsList className="flex-wrap">
          {tabs.map((t) => (
            <TabsTrigger key={t.valor} value={t.valor}>
              {t.label} ({contar(t.valor)})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {lista.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Truck className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nenhum pedido neste filtro. Registre uma venda no PDV Express.
            </p>
            <PdvDrawer>
              <Button variant="outline">
                <Plus className="size-4" />
                Nova venda
              </Button>
            </PdvDrawer>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {lista.map((p) => (
            <PedidoCard key={p.id} pedido={p} />
          ))}
        </div>
      )}
    </div>
  );
}

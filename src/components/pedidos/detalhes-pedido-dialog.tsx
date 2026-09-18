import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bike, Clock, MapPin, Package, Recycle, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ImprimirComprovante } from "@/components/pedidos/comprovante-pedido";
import { Separator } from "@/components/ui/separator";
import { brl } from "@/lib/erp";
import { supabase } from "@/integrations/supabase/client";
import { paraItemPedido, type ItemPedidoRow } from "@/lib/mapeadores";
import { isoLocal, TIMEZONE } from "@/lib/periodo";
import { LABEL_MODO } from "@/lib/vasilhames";
import {
  STATUS_PEDIDO_LABEL,
  parcelasDe,
  rotuloItemPedido,
  totalItemPedido,
  type Pedido,
} from "@/lib/pedidos";

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Resumo completo da venda em modal, aberto ao clicar no card do pedido. */
export function DetalhesPedidoDialog({
  pedido,
  children,
}: {
  pedido: Pedido;
  children: ReactNode;
}) {
  const [aberto, setAberto] = useState(false);
  const { data: itensBanco } = useQuery({
    queryKey: ["pedido-itens", pedido.id],
    enabled: aberto,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", pedido.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as ItemPedidoRow[]).map(paraItemPedido);
    },
  });
  const itens = itensBanco ?? pedido.itens;
  const parcelas = parcelasDe(pedido);
  const totalPago = parcelas.reduce((s, x) => s + x.valor, 0);

  // Galões de 20L que geram troca de vasilhame (refil = troca casco a casco).
  const galoesRefil = itens
    .filter((i) => i.retornavel && i.modo === "refil")
    .reduce((s, i) => s + i.qtd, 0);
  const pendentes = Math.max(0, galoesRefil - pedido.vaziosRecolhidos);

  const linha = (label: string, valor: ReactNode) => (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium tabular-nums">{valor}</span>
    </div>
  );

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">
            Pedido #{pedido.numero} · {pedido.clienteNome}
            <Badge variant="secondary">{STATUS_PEDIDO_LABEL[pedido.status]}</Badge>
          </DialogTitle>
          <DialogDescription className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="size-3.5" /> {dataHora(pedido.criadoEm)}
            </span>
            <span>{isoLocal(pedido.criadoEm) === isoLocal(new Date()) ? "Hoje" : ""}</span>
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-3">
          <div className="flex flex-col gap-5">
            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Package className="size-4" /> Produtos
              </h3>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                {itens.map((i, idx) => (
                  <div
                    key={`${i.produtoId}-${i.modo}-${i.embalagem}-${idx}`}
                    className="flex items-start justify-between gap-3 text-sm"
                  >
                    <span className="min-w-0">
                       {rotuloItemPedido(i)}
                      {i.retornavel && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({LABEL_MODO[i.modo]})
                        </span>
                      )}
                      <span className="block text-xs text-muted-foreground">
                         {i.embalagem === "fardo" && i.precoEmbalagem !== undefined
                           ? `${brl(i.precoEmbalagem)} / ${i.rotuloEmbalagem || "Fardo"}`
                           : `${brl(i.precoUnit)} / un.`}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium tabular-nums">
                       {brl(totalItemPedido(i))}
                    </span>
                  </div>
                ))}
                {itens.length === 0 && (
                  <p className="py-2 text-sm text-destructive">
                    Os itens desta venda não foram encontrados no banco de dados.
                  </p>
                )}
                <Separator className="my-1" />
                {linha("Total do pedido", brl(pedido.total))}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="size-4" /> Pagamento
              </h3>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                {parcelas.map((x, idx) => (
                  <div key={`${x.forma}-${idx}`}>{linha(x.forma, brl(x.valor))}</div>
                ))}
                <Separator className="my-1" />
                {linha("Total lançado", brl(totalPago))}
                {pedido.valorFiado > 0 && linha("Em fiado", brl(pedido.valorFiado))}
                {pedido.trocoPara ? linha("Troco para", brl(pedido.trocoPara)) : null}
                {linha(
                  "Situação",
                  <Badge variant={pedido.pago ? "outline" : "destructive"}>
                    {pedido.pago ? "Pago" : "Em aberto"}
                  </Badge>,
                )}
                {pedido.formaBaixa && linha("Baixa recebida em", pedido.formaBaixa)}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Recycle className="size-4" /> Vasilhames 20L
              </h3>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                {linha("Galões vendidos em troca (refil)", galoesRefil)}
                {linha("Vazios recolhidos", pedido.vaziosRecolhidos)}
                {linha(
                  "Pendentes / emprestados",
                  <span className={pendentes > 0 ? "text-destructive" : "text-success"}>
                    {pendentes}
                  </span>,
                )}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Bike className="size-4" /> Logística
              </h3>
              <div className="flex flex-col gap-1.5 rounded-xl border border-border p-3">
                {linha("Entregador", pedido.entregador || "—")}
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    {pedido.enderecoEntrega}
                  </span>
                </div>
                {pedido.observacao && (
                  <p className="text-xs text-muted-foreground">Obs.: {pedido.observacao}</p>
                )}
                {pedido.status === "cancelado" && pedido.motivoCancelamento && (
                  <p className="text-xs text-destructive">
                    Cancelado: {pedido.motivoCancelamento}
                    {pedido.obsCancelamento ? ` — ${pedido.obsCancelamento}` : ""}
                  </p>
                )}
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-2">
          <ImprimirComprovante pedido={pedido} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

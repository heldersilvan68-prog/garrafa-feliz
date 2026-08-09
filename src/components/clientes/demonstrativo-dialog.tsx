import { type ReactNode } from "react";
import { FileText, MessageCircle } from "lucide-react";
import { BaixaFiadoDialog } from "@/components/pedidos/baixa-fiado-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { demonstrativoDebito, formatarDataHora, formatarDataLonga } from "@/lib/cliente-insights";
import type { Cliente, Compra } from "@/lib/clientes";
import { brl } from "@/lib/erp";
import type { Pedido } from "@/lib/pedidos";

export function DemonstrativoDialog({
  cliente,
  compras,
  saldo,
  fiados,
  children,
}: {
  cliente: Cliente;
  compras: Compra[];
  saldo: number;
  fiados: Pedido[];
  children: ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="size-4" /> Demonstrativo de débito
          </DialogTitle>
          <DialogDescription>
            {cliente.nome} · saldo em aberto de {brl(saldo)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Pedidos fiado em aberto</p>
            {fiados.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nenhum pedido fiado pendente.
              </p>
            )}
            {fiados.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    #{p.numero} · {brl(p.total)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatarDataHora(p.criadoEm)}
                  </p>
                </div>
                <BaixaFiadoDialog pedido={p}>
                  <Button size="sm">Dar Baixa / Pago</Button>
                </BaixaFiadoDialog>
              </div>
            ))}
          </div>

          {saldo > 0 && (
            <BaixaFiadoDialog
              cliente={{ id: cliente.id, nome: cliente.nome }}
              saldo={saldo}
            >
              <Button variant="outline">Registrar pagamento avulso</Button>
            </BaixaFiadoDialog>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">Últimas compras</p>
            {compras.slice(0, 12).map((h) => (
              <div
                key={h.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-sm"
              >
                <span className="min-w-0 truncate">
                  {formatarDataLonga(h.data)} — {h.descricao}
                </span>
                <span className="shrink-0 tabular-nums">{brl(h.valor)}</span>
              </div>
            ))}
          </div>

          <Button asChild variant="outline" className="text-success">
            <a
              href={demonstrativoDebito(cliente, compras, saldo)}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle /> Enviar demonstrativo por WhatsApp
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

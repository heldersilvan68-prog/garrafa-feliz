import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useClientes } from "@/context/clientes";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { brl } from "@/lib/erp";
import { MOTIVOS_CANCELAMENTO, type Pedido } from "@/lib/pedidos";

export function CancelarPedidoDialog({
  pedido,
  children,
}: {
  pedido: Pedido;
  children: ReactNode;
}) {
  const { cancelar } = usePedidos();
  const { estornarVenda } = useEstoque();
  const { ajustarDivida, ajustarVasilhames } = useClientes();
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS_CANCELAMENTO[0]!);
  const [obs, setObs] = useState("");
  const [processando, setProcessando] = useState(false);

  // O estoque é baixado na criação do pedido, então todo cancelamento estorna.
  const estorna = pedido.itens.length > 0;
  const valorFiadoAberto = !pedido.pago
    ? pedido.valorFiado > 0
      ? pedido.valorFiado
      : pedido.pagamento === "Fiado"
        ? pedido.total
        : 0
    : 0;
  const fiadoEmAberto = valorFiadoAberto > 0;

  const confirmar = async () => {
    if (motivo === "Outro" && !obs.trim()) {
      toast.error("Descreva o motivo do cancelamento.");
      return;
    }
    setProcessando(true);
    try {
      cancelar(pedido.id, motivo, obs);
      if (estorna) {
        await estornarVenda(pedido.itens, pedido.vaziosRecolhidos);
      }
      if (fiadoEmAberto && pedido.clienteId) {
        ajustarDivida(pedido.clienteId, -valorFiadoAberto);
      }
      // Cascos que ficaram na rua nesta venda voltam a não pertencer ao cliente.
      const cascosNaRua =
        pedido.itens
          .filter((i) => i.retornavel && i.modo === "refil")
          .reduce((t, i) => t + i.qtd, 0) - pedido.vaziosRecolhidos;
      if (cascosNaRua > 0 && pedido.clienteId) {
        await ajustarVasilhames(pedido.clienteId, -cascosNaRua);
      }

      toast.info(`Pedido #${pedido.numero} cancelado — ${motivo}`);
      setAberto(false);
      setObs("");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar pedido #{pedido.numero}</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento — ele ficará registrado no pedido.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-destructive">
              Esta ação reverte o pedido de {brl(pedido.total)}.
            </p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {estorna && <li>Os produtos e vasilhames voltam para o estoque.</li>}
              <li>O valor deixa de contar nas vendas, no caixa e no financeiro.</li>
              {fiadoEmAberto && <li>A dívida do fiado é removida da caderneta do cliente.</li>}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Motivo do cancelamento</Label>
            <RadioGroup value={motivo} onValueChange={setMotivo} className="grid gap-2">
              {MOTIVOS_CANCELAMENTO.map((m) => (
                <Label
                  key={m}
                  htmlFor={`cancel-${pedido.id}-${m}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-[[data-state=checked]]:border-destructive has-[[data-state=checked]]:bg-destructive/5"
                >
                  <RadioGroupItem id={`cancel-${pedido.id}-${m}`} value={m} />
                  {m}
                </Label>
              ))}
            </RadioGroup>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor={`cancel-obs-${pedido.id}`}>Observações</Label>
            <Textarea
              id={`cancel-obs-${pedido.id}`}
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              placeholder="Detalhes adicionais (opcional)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Voltar
          </Button>
          <Button
            variant="destructive"
            disabled={processando}
            onClick={() => void confirmar()}
          >
            {processando ? "Cancelando…" : "Confirmar cancelamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

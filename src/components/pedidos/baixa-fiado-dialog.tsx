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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCaixa } from "@/context/caixa";
import { useClientes } from "@/context/clientes";
import { usePedidos } from "@/context/pedidos";
import { brl } from "@/lib/erp";
import { FORMAS_RECEBIMENTO, type FormaPagamento, type Pedido } from "@/lib/pedidos";

type Props = {
  children: ReactNode;
  /** Baixa de um pedido fiado específico. */
  pedido?: Pedido;
  /** Baixa de valor avulso do saldo do cliente. */
  cliente?: { id: string; nome: string };
  saldo?: number;
  onConcluido?: () => void;
};

export function BaixaFiadoDialog({ children, pedido, cliente, saldo, onConcluido }: Props) {
  const { darBaixa } = usePedidos();
  const { registrarMovimento, caixaAberto } = useCaixa();
  const { ajustarDivida } = useClientes();

  const totalPedido = pedido ? (pedido.valorFiado > 0 ? pedido.valorFiado : pedido.total) : 0;
  const valorPadrao = pedido ? totalPedido : Math.max(0, saldo ?? 0);
  const [aberto, setAberto] = useState(false);
  const [forma, setForma] = useState<FormaPagamento>("PIX");
  const [valor, setValor] = useState(String(valorPadrao.toFixed(2)));

  const nome = pedido?.clienteNome ?? cliente?.nome ?? "cliente";
  const valorNum = Number(valor.replace(",", ".")) || 0;

  const confirmar = () => {
    if (valorNum <= 0) {
      toast.error("Informe um valor maior que zero.");
      return;
    }
    if (!caixaAberto) {
      toast.error("Abra o caixa para registrar recebimentos");
      return;
    }

    if (pedido) {
      // Só encerra o pedido quando o valor recebido cobre o fiado em aberto.
      if (valorNum >= totalPedido - 0.009) darBaixa(pedido.id, forma);
      if (pedido.clienteId) ajustarDivida(pedido.clienteId, -valorNum);
    } else if (cliente) {
      ajustarDivida(cliente.id, -valorNum);
    }

    registrarMovimento(
      forma === "Dinheiro" ? "suprimento" : "recebimento",
      valorNum,
      pedido
        ? `Baixa fiado pedido #${pedido.numero} — ${nome} (${forma})`
        : `Baixa fiado — ${nome} (${forma})`,
    );

    toast.success(`${brl(valorNum)} recebido em ${forma} e lançado no caixa.`);
    setAberto(false);
    onConcluido?.();
  };


  return (
    <Dialog
      open={aberto}
      onOpenChange={(o) => {
        setAberto(o);
        if (o) setValor(String(valorPadrao.toFixed(2)));
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pedido ? `Dar baixa — pedido #${pedido.numero}` : `Dar baixa — ${nome}`}
          </DialogTitle>
          <DialogDescription>
            Selecione a forma de pagamento efetivamente recebida. O valor entra no caixa e
            abate o saldo em aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Valor recebido</Label>
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Saldo em aberto: {brl(pedido ? totalPedido : (saldo ?? 0))} — pagamentos parciais
              são permitidos.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Forma de pagamento recebida</Label>
            <RadioGroup
              value={forma}
              onValueChange={(v) => setForma(v as FormaPagamento)}
              className="grid grid-cols-2 gap-2"
            >
              {FORMAS_RECEBIMENTO.map((f) => (
                <Label
                  key={f}
                  htmlFor={`baixa-${pedido?.id ?? cliente?.id}-${f}`}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm font-medium has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <RadioGroupItem id={`baixa-${pedido?.id ?? cliente?.id}-${f}`} value={f} />
                  {f}
                </Label>
              ))}
            </RadioGroup>
          </div>

          {!caixaAberto && (
            <p className="text-xs font-medium text-destructive">
              Abra o caixa para registrar recebimentos.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Voltar
          </Button>
          <Button onClick={confirmar} disabled={!caixaAberto}>
            Confirmar pagamento
          </Button>

        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

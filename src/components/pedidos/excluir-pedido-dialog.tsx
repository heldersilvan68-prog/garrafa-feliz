import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { usePedidos } from "@/context/pedidos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { Pedido } from "@/lib/pedidos";

export function ExcluirPedidoDialog({ pedido, children }: { pedido: Pedido; children: ReactNode }) {
  const { excluir } = usePedidos();
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [processando, setProcessando] = useState(false);
  const confirmar = async () => {
    if (processando || confirmacao.trim() !== String(pedido.numero)) return;
    setProcessando(true);
    try {
      await excluir(pedido.id, pedido.numero);
      toast.success(`Venda #${pedido.numero} excluída definitivamente`);
      setAberto(false);
    } catch {
      // A ação compartilhada apresenta o erro e mantém a venda intacta.
    } finally {
      setProcessando(false);
    }
  };
  return (
    <Dialog open={aberto} onOpenChange={(valor) => { if (!processando) { setAberto(valor); setConfirmacao(""); } }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir definitivamente a venda #{pedido.numero}?</DialogTitle>
          <DialogDescription>
            A venda e seus registros vinculados serão removidos das vendas, relatórios e históricos do sistema. Diferente do cancelamento, não ficará uma venda cancelada. Não é possível desfazer.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-destructive">Estoque, vasilhames, vales, crédito e fiado serão ajustados na mesma operação. Vendas em caixa fechado ou com acertos já pagos ficam protegidas.</p>
        <div className="grid gap-2">
          <Label htmlFor={`excluir-${pedido.id}`}>Digite {pedido.numero} para confirmar</Label>
          <Input id={`excluir-${pedido.id}`} value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} inputMode="numeric" autoComplete="off" disabled={processando} />
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={processando} onClick={() => setAberto(false)}>Voltar</Button>
          <Button variant="destructive" disabled={processando || confirmacao.trim() !== String(pedido.numero)} onClick={() => void confirmar()}>
            {processando ? "Excluindo…" : "Excluir definitivamente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEstoque } from "@/context/estoque";
import { brl } from "@/lib/erp";

const PAGAMENTOS = ["PIX", "Dinheiro", "Débito", "Crédito", "Fiado"];

export function RegistrarVendaDialog({ children }: { children: ReactNode }) {
  const { produtos } = useEstoque();
  const [open, setOpen] = useState(false);
  const [cliente, setCliente] = useState("");
  const [produtoId, setProdutoId] = useState(produtos[0]?.id ?? "");
  const [qtd, setQtd] = useState("1");
  const [pagamento, setPagamento] = useState("PIX");

  const produto = produtos.find((p) => p.id === produtoId);
  const total = (produto?.precoVenda ?? 0) * (Number(qtd) || 0);

  const registrar = () => {
    if (!produto || Number(qtd) <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }
    toast.success(`Venda registrada — ${brl(total)} (${pagamento})`, {
      description: `${qtd}x ${produto.nome}${cliente ? ` · ${cliente}` : ""}`,
    });
    setOpen(false);
    setCliente("");
    setQtd("1");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar venda</DialogTitle>
          <DialogDescription>Lançamento rápido de venda no balcão ou entrega.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="venda-cliente">Cliente (opcional)</Label>
            <Input
              id="venda-cliente"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label>Produto</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} — {brl(p.precoVenda)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="venda-qtd">Quantidade</Label>
              <Input
                id="venda-qtd"
                type="number"
                min={1}
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Pagamento</Label>
              <Select value={pagamento} onValueChange={setPagamento}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGAMENTOS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-3 py-2">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-semibold tabular-nums">{brl(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={registrar}>Registrar venda</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

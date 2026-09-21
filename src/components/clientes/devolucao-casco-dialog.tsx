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
import { useClientes } from "@/context/clientes";
import { useEstoque } from "@/context/estoque";

/** Registra a devolução de cascos do cliente: sai da rua e entra nos vazios do depósito. */
export function DevolucaoCascoDialog({
  clienteId,
  naRua,
  children,
}: {
  clienteId: string;
  naRua: number;
  children: ReactNode;
}) {
  const { produtos, devolucaoCliente } = useEstoque();
  const { ajustarVasilhames } = useClientes();
  const retornaveis = produtos.filter((p) => p.retornavel);

  const [aberto, setAberto] = useState(false);
  const [produtoId, setProdutoId] = useState(retornaveis[0]?.id ?? "");
  const [qtd, setQtd] = useState("1");
  const [processando, setProcessando] = useState(false);

  const confirmar = async () => {
    const n = Math.max(0, Math.floor(Number(qtd) || 0));
    if (!produtoId) {
      toast.error("Cadastre um produto retornável primeiro.");
      return;
    }
    if (n <= 0) {
      toast.error("Informe a quantidade devolvida.");
      return;
    }
    setProcessando(true);
    try {
      await devolucaoCliente(produtoId, n, clienteId);
      await ajustarVasilhames(clienteId, -n);
      toast.success(`${n} casco(s) devolvido(s) e somado(s) aos vazios do depósito!`);
      setAberto(false);
      setQtd("1");
    } finally {
      setProcessando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar devolução de casco</DialogTitle>
          <DialogDescription>
            O cliente tem {naRua} casco(s) na rua. A devolução entra como vazio no depósito.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Produto retornável</Label>
            <Select value={produtoId} onValueChange={setProdutoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {retornaveis.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dev-qtd">Quantidade devolvida</Label>
            <Input
              id="dev-qtd"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Voltar
          </Button>
          <Button disabled={processando} onClick={() => void confirmar()}>
            {processando ? "Registrando…" : "Confirmar devolução"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

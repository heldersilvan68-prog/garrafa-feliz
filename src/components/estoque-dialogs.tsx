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

function MovimentoDialog({
  modo,
  children,
  produtoId,
}: {
  modo: "entrada" | "vazios";
  children: ReactNode;
  produtoId?: string;
}) {
  const { produtos, entradaEstoque, moverVazios } = useEstoque();
  const lista = modo === "vazios" ? produtos.filter((p) => p.retornavel) : produtos;
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(produtoId ?? lista[0]?.id ?? "");
  const [qtd, setQtd] = useState("10");

  const confirmar = () => {
    const n = Number(qtd);
    if (!id || !Number.isFinite(n) || n <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }
    if (modo === "entrada") {
      entradaEstoque(id, n);
      toast.success(`Entrada de ${n} un. registrada no estoque cheio.`);
    } else {
      moverVazios(id, n);
      toast.success(`${n} vasilhame(s) enviados para envase.`);
    }
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === "entrada" ? "Entrada de Estoque" : "Movimentar Vasilhames Vazios"}
          </DialogTitle>
          <DialogDescription>
            {modo === "entrada"
              ? "Registre a chegada de mercadoria no estoque cheio."
              : "Converta vasilhames vazios em estoque cheio após o envase."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Produto</Label>
            <Select value={id} onValueChange={setId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {lista.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                    {modo === "vazios" ? ` · ${p.estoqueVazio} vazios` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qtd">Quantidade</Label>
            <Input
              id="qtd"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EntradaEstoqueDialog(props: { children: ReactNode; produtoId?: string }) {
  return <MovimentoDialog modo="entrada" {...props} />;
}

export function MoverVaziosDialog(props: { children: ReactNode; produtoId?: string }) {
  return <MovimentoDialog modo="vazios" {...props} />;
}

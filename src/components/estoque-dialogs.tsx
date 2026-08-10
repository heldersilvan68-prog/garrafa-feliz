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
      toast.success(`${n} vasilhame(s) vazios enviados para a envasadora.`);
    }
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {modo === "entrada" ? "Entrada de Estoque Cheio" : "Enviar Vazios para Envasadora"}
          </DialogTitle>
          <DialogDescription>
            {modo === "entrada"
              ? "Registre a chegada de mercadoria cheia no depósito."
              : "Retira os vasilhames vazios do depósito para envio ao envase na fonte."}
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

export function AporteVasilhameDialog({ children }: { children: ReactNode }) {
  const { produtos, comprarVasilhames } = useEstoque();
  const vasilhames = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(vasilhames[0]?.id ?? "");
  const [qtd, setQtd] = useState("100");

  const confirmar = async () => {
    const n = Number(qtd);
    if (!id || !Number.isFinite(n) || n <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }

    await comprarVasilhames(id, n);
    toast.success(`${n} novos vasilhames comprados e adicionados ao estoque cheio!`);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprar Vasilhames Novos (Cheios)</DialogTitle>
          <DialogDescription>
            Adicione novos cascos comprados diretamente cheios. Isso aumenta o estoque cheio e o Patrimônio Total.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Produto / Casco</Label>
            <Select value={id} onValueChange={setId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o casco" />
              </SelectTrigger>
              <SelectContent>
                {vasilhames.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qtdAporte">Quantidade Comprada</Label>
            <Input
              id="qtdAporte"
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
          <Button onClick={confirmar}>Confirmar Compra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RetornoEnvaseDialog({ children, produtoId }: { children: ReactNode; produtoId?: string }) {
  const { produtos, entradaEstoque } = useEstoque();
  const vasilhames = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(produtoId ?? vasilhames[0]?.id ?? "");
  const [qtd, setQtd] = useState("100");

  const confirmar = () => {
    const n = Number(qtd);
    if (!id || !Number.isFinite(n) || n <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }

    // Registra a entrada dos vasilhames que voltaram recarregados/cheios da fonte
    entradaEstoque(id, n);
    toast.success(`Chegada de ${n} un. envasadas registrada no estoque cheio.`);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Chegada da Carga (Retorno de Envase)</DialogTitle>
          <DialogDescription>
            Registre a entrada dos vasilhames que retornaram envasados/cheios da envasadora.
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
                {vasilhames.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qtdChegada">Quantidade Recebida (Cheios)</Label>
            <Input
              id="qtdChegada"
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
          <Button onClick={confirmar}>Confirmar Chegada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
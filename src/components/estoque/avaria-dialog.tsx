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
import { MOTIVOS_AVARIA, type MotivoAvaria } from "@/lib/vasilhames";

/** Registra quebras/perdas de garrafões cheios ou vazios e lança a despesa no financeiro. */
export function AvariaDialog({ children }: { children: ReactNode }) {
  const { produtos, registrarAvaria } = useEstoque();
  const retornaveis = produtos.filter((p) => p.retornavel);

  const [aberto, setAberto] = useState(false);
  const [produtoId, setProdutoId] = useState(retornaveis[0]?.id ?? "");
  const [estado, setEstado] = useState<"cheio" | "vazio">("cheio");
  const [motivo, setMotivo] = useState<MotivoAvaria>(MOTIVOS_AVARIA[0]);
  const [qtd, setQtd] = useState("1");
  const [processando, setProcessando] = useState(false);

  const produto = produtos.find((p) => p.id === produtoId);
  const unitario = produto
    ? estado === "cheio"
      ? produto.custoCasco + produto.custoEnvase
      : produto.custoCasco
    : 0;
  const n = Math.max(0, Math.floor(Number(qtd) || 0));

  const confirmar = async () => {
    if (!produtoId) {
      toast.error("Cadastre um produto retornável primeiro.");
      return;
    }
    if (n <= 0) {
      toast.error("Informe a quantidade avariada.");
      return;
    }
    setProcessando(true);
    try {
      await registrarAvaria({ produtoId, estado, motivo, qtd: n });
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
          <DialogTitle>Registrar avaria / quebra</DialogTitle>
          <DialogDescription>
            Baixa o vasilhame do estoque e do patrimônio e lança a perda no financeiro.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Produto</Label>
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
            <Label>Estado do garrafão</Label>
            <Select value={estado} onValueChange={(v) => setEstado(v as "cheio" | "vazio")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cheio">Garrafão CHEIO</SelectItem>
                <SelectItem value="vazio">Garrafão VAZIO</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Motivo</Label>
            <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoAvaria)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS_AVARIA.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="avaria-qtd">Quantidade</Label>
            <Input
              id="avaria-qtd"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Perda estimada: <strong>{brl(unitario * n)}</strong> ({brl(unitario)} por unidade)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Voltar
          </Button>
          <Button variant="destructive" disabled={processando} onClick={() => void confirmar()}>
            {processando ? "Registrando…" : "Registrar avaria"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Registra vasilhames que voltaram da fonte sem serem envasados. */
export function RetornoFonteDialog({ children }: { children: ReactNode }) {
  const { produtos, retornoSemEnvase } = useEstoque();
  const retornaveis = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [produtoId, setProdutoId] = useState(retornaveis[0]?.id ?? "");
  const [qtd, setQtd] = useState("1");

  const confirmar = async () => {
    const n = Math.max(0, Math.floor(Number(qtd) || 0));
    if (!produtoId || n <= 0) {
      toast.error("Informe o produto e a quantidade.");
      return;
    }
    await retornoSemEnvase(produtoId, n);
    toast.success(`${n} vasilhame(s) retornaram da fonte sem envase.`);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Retorno da fonte sem envasar</DialogTitle>
          <DialogDescription>
            Corrige o saldo de vazios no depósito para vasilhames que voltaram sem envase.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label>Produto</Label>
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
            <Label htmlFor="retorno-qtd">Quantidade</Label>
            <Input
              id="retorno-qtd"
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
          <Button onClick={() => void confirmar()}>Confirmar retorno</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

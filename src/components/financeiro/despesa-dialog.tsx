import { useEffect, useState } from "react";
import { toast } from "sonner";
import { isoLocal } from "@/lib/periodo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useCaixa } from "@/context/caixa";
import { useDespesas } from "@/context/despesas";
import {
  CATEGORIAS_DESPESA,
  FORMAS_DESPESA,
  type CategoriaDespesa,
  type Despesa,
  type FormaDespesa,
  type StatusDespesa,
} from "@/lib/despesas";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  despesa?: Despesa;
};

const hoje = () => isoLocal(new Date());

export function DespesaDialog({ open, onOpenChange, despesa }: Props) {
  const { adicionarDespesa, atualizarDespesa, categorias, criarCategoria } = useDespesas();
  const { caixaAberto, registrarMovimento } = useCaixa();

  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<CategoriaDespesa>("Combustível");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [forma, setForma] = useState<FormaDespesa>("PIX");
  const [status, setStatus] = useState<StatusDespesa>("Pago");
  const [observacoes, setObservacoes] = useState("");
  const [criandoCategoria, setCriandoCategoria] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState("");
  const [salvandoCategoria, setSalvandoCategoria] = useState(false);

  const opcoesCategoria = Array.from(
    new Set([...categorias.map((c) => c.nome), ...CATEGORIAS_DESPESA]),
  );

  const confirmarCategoria = async () => {
    const nome = novaCategoria.trim();
    if (!nome) {
      toast.error("Informe o nome da nova categoria.");
      return;
    }
    setSalvandoCategoria(true);
    try {
      const criada = await criarCategoria(nome);
      setCategoria(criada);
      setNovaCategoria("");
      setCriandoCategoria(false);
      toast.success(`Categoria “${criada}” criada.`);
    } finally {
      setSalvandoCategoria(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    setDescricao(despesa?.descricao ?? "");
    setCategoria(despesa?.categoria ?? "Combustível");
    setValor(despesa ? String(despesa.valor) : "");
    setData(despesa?.data ?? hoje());
    setForma(despesa?.forma ?? "PIX");
    setStatus(despesa?.status ?? "Pago");
    setObservacoes(despesa?.observacoes ?? "");
    setCriandoCategoria(false);
    setNovaCategoria("");
  }, [open, despesa]);


  const salvar = () => {
    const v = Number(valor.replace(",", "."));
    if (!descricao.trim() || !Number.isFinite(v) || v <= 0) {
      toast.error("Informe descrição e um valor válido.");
      return;
    }
    const payload = {
      descricao: descricao.trim(),
      categoria,
      valor: v,
      data,
      forma,
      status,
      observacoes: observacoes.trim() || undefined,
    };

    if (despesa) {
      atualizarDespesa(despesa.id, payload);
      toast.success("Despesa atualizada.");
    } else {
      adicionarDespesa(payload);
      if (forma === "Dinheiro do Caixa" && status === "Pago") {
        if (caixaAberto) {
          registrarMovimento("sangria", v, `Despesa: ${payload.descricao}`);
          toast.success("Despesa registrada e sangria lançada no caixa.");
        } else {
          toast.warning("Despesa registrada, mas não há caixa aberto para lançar a sangria.");
        }
      } else {
        toast.success("Despesa registrada.");
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{despesa ? "Editar despesa" : "Nova despesa"}</DialogTitle>
          <DialogDescription>
            Despesas pagas em dinheiro do caixa geram sangria automática no caixa aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="desc">Descrição</Label>
            <Input
              id="desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Combustível Titan 150"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Categoria</Label>
              <Select
                value={categoria}
                onValueChange={(v) => {
                  if (v === "__nova__") {
                    setCriandoCategoria(true);
                    return;
                  }
                  setCategoria(v as CategoriaDespesa);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opcoesCategoria.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value="__nova__" className="text-primary">
                    + Adicionar Nova Categoria
                  </SelectItem>
                </SelectContent>
              </Select>
              {criandoCategoria && (
                <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                  <Label htmlFor="nova-cat" className="text-xs">
                    Nome da nova categoria
                  </Label>
                  <Input
                    id="nova-cat"
                    autoFocus
                    value={novaCategoria}
                    onChange={(e) => setNovaCategoria(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void confirmarCategoria();
                      }
                    }}
                    placeholder="Ex.: Marketing"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => void confirmarCategoria()}
                      disabled={salvandoCategoria}
                    >
                      {salvandoCategoria ? "Salvando…" : "Salvar categoria"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCriandoCategoria(false);
                        setNovaCategoria("");
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="valor">Valor (R$)</Label>
              <Input
                id="valor"
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="data">Data de vencimento/pagamento</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Forma de pagamento</Label>
              <Select value={forma} onValueChange={(v) => setForma(v as FormaDespesa)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS_DESPESA.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as StatusDespesa)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pago">Pago</SelectItem>
                <SelectItem value="Pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="obs">Observações</Label>
            <Textarea
              id="obs"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Opcional"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>{despesa ? "Salvar alterações" : "Registrar despesa"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

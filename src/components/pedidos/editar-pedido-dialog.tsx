import { useEffect, useState, type ReactNode } from "react";
import { ProdutoFoto } from "@/components/produto-foto";
import { Minus, Plus, Trash2 } from "lucide-react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { useEntregadores } from "@/context/entregadores";
import { brl } from "@/lib/erp";
import {
  FORMAS_PAGAMENTO,
  parcelasDe,
  type FormaPagamento,
  type ItemPedido,
  type Pedido,
} from "@/lib/pedidos";

type Parcela = { forma: FormaPagamento; valor: string };

export function EditarPedidoDialog({
  pedido,
  children,
}: {
  pedido: Pedido;
  children: ReactNode;
}) {
  const { produtos } = useEstoque();
  const { atualizar } = usePedidos();
  const { opcoes } = useEntregadores();

  const [aberto, setAberto] = useState(false);
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [endereco, setEndereco] = useState(pedido.endereco);
  const [parcelas, setParcelas] = useState<Parcela[]>([]);
  const [trocoPara, setTrocoPara] = useState(pedido.trocoPara ? String(pedido.trocoPara) : "");
  const [vazios, setVazios] = useState(String(pedido.vaziosRecolhidos));
  const [entregador, setEntregador] = useState(pedido.entregador);

  const opcoesEntregador = [...new Set([...opcoes, pedido.entregador].filter(Boolean))];

  useEffect(() => {
    if (!aberto) return;
    setCarrinho(Object.fromEntries(pedido.itens.map((i) => [i.produtoId, i.qtd])));
    setPrecos(Object.fromEntries(pedido.itens.map((i) => [i.produtoId, String(i.precoUnit)])));
    setEndereco(pedido.endereco);
    setParcelas(
      parcelasDe(pedido).map((x) => ({ forma: x.forma, valor: String(x.valor || "") })),
    );
    setTrocoPara(pedido.trocoPara ? String(pedido.trocoPara) : "");
    setVazios(String(pedido.vaziosRecolhidos));
    setEntregador(pedido.entregador);
  }, [aberto, pedido]);

  const itens: ItemPedido[] = produtos
    .filter((p) => (carrinho[p.id] ?? 0) > 0)
    .map((p) => ({
      produtoId: p.id,
      nome: p.nome,
      qtd: carrinho[p.id]!,
      // Preço negociado guardado só no item do pedido.
      precoUnit: Math.max(0, Number(precos[p.id] ?? p.precoVenda) || 0),
      retornavel: p.retornavel,
      modo: pedido.itens.find((i) => i.produtoId === p.id)?.modo ?? "refil",
    }));


  const total = itens.reduce((s, i) => s + i.qtd * i.precoUnit, 0);
  const pago = Math.round(parcelas.reduce((s, x) => s + (Number(x.valor) || 0), 0) * 100) / 100;
  const restante = Math.round((total - pago) * 100) / 100;
  const valorFiado =
    Math.round(
      parcelas
        .filter((x) => x.forma === "Fiado")
        .reduce((s, x) => s + (Number(x.valor) || 0), 0) * 100,
    ) / 100;
  const dinheiroInformado = parcelas.some((x) => x.forma === "Dinheiro");
  const formaPrincipal =
    [...parcelas]
      .filter((x) => (Number(x.valor) || 0) > 0)
      .sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0))[0]?.forma ??
    parcelas[0]?.forma ??
    pedido.pagamento;

  const mudar = (id: string, delta: number) =>
    setCarrinho((c) => {
      const n = Math.max(0, (c[id] ?? 0) + delta);
      const next = { ...c };
      if (n === 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const salvar = () => {
    if (itens.length === 0) {
      toast.error("O pedido precisa ter pelo menos um produto.");
      return;
    }
    if (Math.abs(restante) > 0.009) {
      toast.error(
        restante > 0
          ? `Falta distribuir ${brl(restante)} entre as formas de pagamento.`
          : `Total pago excede o pedido em ${brl(Math.abs(restante))}.`,
      );
      return;
    }
    atualizar(pedido.id, {
      itens,
      total,
      endereco: endereco || pedido.endereco,
      pagamento: formaPrincipal,
      pago: valorFiado <= 0,
      valorFiado,
      pagamentos: parcelas
        .filter((x) => (Number(x.valor) || 0) > 0)
        .map((x) => ({ forma: x.forma, valor: Number(x.valor) })),
      trocoPara: dinheiroInformado ? Number(trocoPara) || undefined : undefined,
      vaziosRecolhidos: Math.max(0, Number(vazios) || 0),
      entregador,
    });
    toast.success(`Pedido #${pedido.numero} atualizado — ${brl(total)}`);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar pedido #{pedido.numero}</DialogTitle>
          <DialogDescription>
            Ajuste itens, pagamento e entrega antes de finalizar — {pedido.clienteNome}.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-3">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor={`edit-end-${pedido.id}`}>Endereço de entrega</Label>
              <Input
                id={`edit-end-${pedido.id}`}
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Itens</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {produtos.map((p) => {
                  const q = carrinho[p.id] ?? 0;
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-2 rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <ProdutoFoto url={p.imagemUrl} nome={p.nome} />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{p.nome}</p>
                            <p className="text-xs text-muted-foreground">{brl(p.precoVenda)}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-8"
                            onClick={() => mudar(p.id, -1)}
                            aria-label={`Remover ${p.nome}`}
                          >
                            <Minus className="size-4" />
                          </Button>
                          <span className="w-7 text-center text-sm font-semibold tabular-nums">
                            {q}
                          </span>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="size-8"
                            onClick={() => mudar(p.id, 1)}
                            aria-label={`Adicionar ${p.nome}`}
                          >
                            <Plus className="size-4" />
                          </Button>
                        </div>
                      </div>
                      {q > 0 && (
                        <div className="flex items-center gap-2">
                          <Label
                            htmlFor={`edit-preco-${pedido.id}-${p.id}`}
                            className="shrink-0 text-xs text-muted-foreground"
                          >
                            Preço unit.
                          </Label>
                          <Input
                            id={`edit-preco-${pedido.id}-${p.id}`}
                            type="number"
                            min="0"
                            step="0.01"
                            className="h-8 w-24"
                            value={precos[p.id] ?? String(p.precoVenda)}
                            onChange={(e) => setPrecos((s) => ({ ...s, [p.id]: e.target.value }))}
                          />
                          <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                            = {brl(q * (Number(precos[p.id] ?? p.precoVenda) || 0))}
                          </span>
                        </div>
                      )}
                    </div>
                  );

                })}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Label>Formas de pagamento</Label>
              {parcelas.map((x, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select
                    value={x.forma}
                    onValueChange={(v) =>
                      setParcelas((ps) =>
                        ps.map((y, i) => (i === idx ? { ...y, forma: v as FormaPagamento } : y)),
                      )
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGAMENTO.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    className="w-32"
                    value={x.valor}
                    onChange={(e) =>
                      setParcelas((ps) =>
                        ps.map((y, i) => (i === idx ? { ...y, valor: e.target.value } : y)),
                      )
                    }
                  />
                  {parcelas.length > 1 && (
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-8"
                      aria-label="Remover forma de pagamento"
                      onClick={() => setParcelas((ps) => ps.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setParcelas((ps) => [
                      ...ps,
                      { forma: "Dinheiro", valor: restante > 0 ? String(restante) : "" },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Adicionar forma
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setParcelas((ps) =>
                      ps.length === 0
                        ? [{ forma: pedido.pagamento, valor: String(total) }]
                        : ps.map((y, i) => (i === 0 ? { ...y, valor: String(total) } : { ...y, valor: "" })),
                    )
                  }
                >
                  Lançar total na 1ª forma
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <span className="text-muted-foreground">
                  Total do pedido: <strong className="tabular-nums text-foreground">{brl(total)}</strong>
                </span>
                <span className="text-muted-foreground">
                  Total pago: <strong className="tabular-nums text-foreground">{brl(pago)}</strong>
                </span>
                <span
                  className={
                    Math.abs(restante) < 0.01
                      ? "font-medium text-success"
                      : "font-medium text-destructive"
                  }
                >
                  Saldo restante: <span className="tabular-nums">{brl(restante)}</span>
                </span>
              </div>
            </div>

            {dinheiroInformado && (
              <div className="flex flex-col gap-2">
                <Label htmlFor={`edit-troco-${pedido.id}`}>Troco para R$</Label>
                <Input
                  id={`edit-troco-${pedido.id}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  Troco a devolver:{" "}
                  <strong>{brl(Math.max(0, (Number(trocoPara) || 0) - total))}</strong>
                </p>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor={`edit-vazios-${pedido.id}`}>Galões vazios recolhidos</Label>
                <Input
                  id={`edit-vazios-${pedido.id}`}
                  type="number"
                  min={0}
                  value={vazios}
                  onChange={(e) => setVazios(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Entregador</Label>
                <Select value={entregador} onValueChange={setEntregador}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {opcoesEntregador.map((e) => (
                      <SelectItem key={e} value={e}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Novo total</span>
              <span className="text-xl font-semibold tabular-nums">{brl(total)}</span>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={salvar}>Salvar alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

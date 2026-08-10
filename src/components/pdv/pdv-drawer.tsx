import { useMemo, useState, type ReactNode } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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
import { useCaixa } from "@/context/caixa";
import { useClientes } from "@/context/clientes";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { useEntregadores } from "@/context/entregadores";

import { bairroDe, hojeISO, rotuloCliente } from "@/lib/clientes";
import { brl } from "@/lib/erp";
import { BALCAO } from "@/lib/entregadores";
import {
  FORMAS_PAGAMENTO,
  resumoItens,
  type FormaPagamento,
  type ItemPedido,
} from "@/lib/pedidos";
import { LABEL_MODO, type ModoVenda } from "@/lib/vasilhames";

type Parcela = { forma: FormaPagamento; valor: string };

export function PdvDrawer({ children }: { children: ReactNode }) {
  const { produtos, baixaVenda } = useEstoque();
  const { clientes, registrarCompra, ajustarDivida, ajustarVasilhames } = useClientes();
  const { criar } = usePedidos();
  const { caixaAberto } = useCaixa();
  const { opcoes } = useEntregadores();



  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [endereco, setEndereco] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [vazios, setVazios] = useState("0");
  const [vaziosEditado, setVaziosEditado] = useState(false);
  const [modos, setModos] = useState<Record<string, ModoVenda>>({});
  const [parcelas, setParcelas] = useState<Parcela[]>([{ forma: "PIX", valor: "" }]);
  const [trocoPara, setTrocoPara] = useState("");
  const [entregador, setEntregador] = useState<string>(BALCAO);


  const cliente = clientes.find((c) => c.id === clienteId);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return clientes.slice(0, 6);
    return clientes
      .filter((c) =>
        [c.nome, c.codigo ?? "", c.telefone, c.endereco, bairroDe(c)].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
      .slice(0, 6);
  }, [busca, clientes]);

  const itens: ItemPedido[] = produtos
    .filter((p) => (carrinho[p.id] ?? 0) > 0)
    .map((p) => ({
      produtoId: p.id,
      nome: p.nome,
      qtd: carrinho[p.id]!,
      // Preço negociado apenas nesta venda — não altera o cadastro do produto.
      precoUnit: Math.max(0, Number(precos[p.id] ?? p.precoVenda) || 0),
      retornavel: p.retornavel,
      modo: p.retornavel ? (modos[p.id] ?? "refil") : "refil",
    }));


  const total = itens.reduce((s, i) => s + i.qtd * i.precoUnit, 0);
  // Só as trocas de refil geram devolução de vasilhame vazio.
  const qtdRetornavel = itens
    .filter((i) => i.retornavel && i.modo === "refil")
    .reduce((s, i) => s + i.qtd, 0);

  const informado = parcelas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const restante = Math.round((total - informado) * 100) / 100;
  const valorFiado = parcelas
    .filter((x) => x.forma === "Fiado")
    .reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const valorDinheiro = parcelas
    .filter((x) => x.forma === "Dinheiro")
    .reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const pagamento: FormaPagamento =
    parcelas.reduce<Parcela | null>(
      (m, x) => (!m || (Number(x.valor) || 0) > (Number(m.valor) || 0) ? x : m),
      null,
    )?.forma ?? "PIX";
  // Pré-preenche com a soma de retornáveis do carrinho, mas segue editável.
  const vaziosValor = vaziosEditado ? vazios : String(qtdRetornavel);
  const troco = Math.max(0, (Number(trocoPara) || 0) - valorDinheiro);


  const mudar = (id: string, delta: number) =>
    setCarrinho((c) => {
      const n = Math.max(0, (c[id] ?? 0) + delta);
      const next = { ...c };
      if (n === 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const limpar = () => {
    setCarrinho({});
    setPrecos({});
    setModos({});

    setVazios("0");
    setVaziosEditado(false);
    setTrocoPara("");
    setParcelas([{ forma: "PIX", valor: "" }]);
    setBusca("");
    setClienteId("");
    setEndereco("");
  };

  const selecionar = (id: string) => {
    const c = clientes.find((x) => x.id === id);
    setClienteId(id);
    setEndereco(c?.endereco ?? "");
    setBusca(c ? rotuloCliente(c) : "");
  };

  const finalizar = async () => {
    if (!caixaAberto) {
      toast.error("Abra o caixa para realizar vendas");
      return;
    }
    if (!cliente) {
      toast.error("Selecione um cliente para o pedido.");
      return;
    }

    if (itens.length === 0) {
      toast.error("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    if (restante > 0.009) {
      toast.error(`Falta informar ${brl(restante)} em formas de pagamento.`);
      return;
    }
    if (valorFiado > 0 && !cliente) {
      toast.error("Vendas com fiado exigem um cliente cadastrado.");
      return;
    }
    const nVazios = Math.max(0, Number(vaziosValor) || 0);
    const pedido = await criar({
      clienteId: cliente.id,
      clienteNome: cliente.nome,
      telefone: cliente.telefone,
      endereco: endereco || cliente.endereco,
      bairro: bairroDe(cliente),
      itens,
      pagamentos: parcelas
        .filter((x) => (Number(x.valor) || 0) > 0)
        .map((x) => ({ forma: x.forma, valor: Number(x.valor) })),
      total,
      pagamento,
      pago: valorFiado === 0,
      valorFiado,
      trocoPara: valorDinheiro > 0 ? Number(trocoPara) || undefined : undefined,
      vaziosRecolhidos: nVazios,
      entregador: entregador || BALCAO,
    });

    baixaVenda(
      itens.map((i) => ({ produtoId: i.produtoId, qtd: i.qtd, modo: i.modo })),
      nVazios,
    );
    registrarCompra(cliente.id, resumoItens(itens), total, hojeISO());
    // Débito lançado exatamente igual ao valor informado como fiado.
    if (valorFiado > 0) ajustarDivida(cliente.id, valorFiado);
    // Cascos que saíram e não voltaram ficam na conta do cliente.
    const naRua = Math.max(0, qtdRetornavel - nVazios);
    if (naRua > 0) void ajustarVasilhames(cliente.id, naRua);

    toast.success(`Pedido #${pedido.numero} criado — ${brl(total)}`, {
      description: `${cliente.nome} · ${pagamento} · ${entregador}`,
    });
    limpar();
    setAberto(false);
  };

  return (
    <Drawer open={aberto} onOpenChange={setAberto}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[92vh]">
        <div className="mx-auto flex w-full max-w-5xl flex-col overflow-hidden">
          <DrawerHeader className="text-left">
            <DrawerTitle className="flex items-center gap-2">
              <ShoppingCart className="size-5 text-primary" />
              Nova venda / pedido express
            </DrawerTitle>
            <DrawerDescription>
              Selecione o cliente, monte o carrinho e defina pagamento e entrega.
            </DrawerDescription>
          </DrawerHeader>

          {!caixaAberto && (
            <div className="mx-4 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">
              Abra o caixa para realizar vendas — vá em “Caixa &amp; Acerto” e abra a sessão
              do dia.
            </div>
          )}



          <ScrollArea className="max-h-[62vh] px-4">
            <div className="grid gap-6 pb-4 lg:grid-cols-[1.15fr_1fr]">
              {/* Cliente + produtos */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="pdv-cliente">Cliente (nome, telefone ou bairro)</Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="pdv-cliente"
                      className="pl-9"
                      placeholder="Buscar cliente..."
                      value={busca}
                      onChange={(e) => {
                        setBusca(e.target.value);
                        setClienteId("");
                      }}
                    />
                  </div>
                  {!clienteId && (
                    <div className="overflow-hidden rounded-lg border border-border">
                      {filtrados.length === 0 && (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhum cliente encontrado.
                        </p>
                      )}
                      {filtrados.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => selecionar(c.id)}
                          className="flex w-full flex-col items-start gap-0.5 border-b border-border px-3 py-2 text-left last:border-0 hover:bg-muted/60"
                        >
                          <span className="text-sm font-medium">{rotuloCliente(c)}</span>
                          <span className="text-xs text-muted-foreground">
                            {bairroDe(c) || c.endereco} · {c.telefone}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  {cliente && (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{rotuloCliente(cliente)}</span>
                        {(cliente.divida ?? 0) > 0 && (
                          <Badge variant="destructive">
                            Fiado: {brl(cliente.divida ?? 0)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label htmlFor="pdv-endereco" className="text-xs">
                          Endereço de entrega
                        </Label>
                        <Input
                          id="pdv-endereco"
                          value={endereco}
                          onChange={(e) => setEndereco(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Label>Produtos</Label>
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
                                <p className="text-xs text-muted-foreground">
                                  {brl(p.precoVenda)} · {p.estoqueCheio} em estoque
                                  {p.retornavel ? " · retornável" : ""}
                                </p>
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
                          {q > 0 && p.retornavel && (
                            <Select
                              value={modos[p.id] ?? "refil"}
                              onValueChange={(v) =>
                                setModos((m) => ({ ...m, [p.id]: v as ModoVenda }))
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(LABEL_MODO) as ModoVenda[]).map((m) => (
                                  <SelectItem key={m} value={m}>
                                    {LABEL_MODO[m]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {q > 0 && (
                            <div className="flex items-center gap-2">
                              <Label
                                htmlFor={`preco-${p.id}`}
                                className="shrink-0 text-xs text-muted-foreground"
                              >
                                Preço unit. negociado
                              </Label>
                              <Input
                                id={`preco-${p.id}`}
                                type="number"
                                min="0"
                                step="0.01"
                                className="h-8 w-24"
                                value={precos[p.id] ?? String(p.precoVenda)}
                                onChange={(e) =>
                                  setPrecos((s) => ({ ...s, [p.id]: e.target.value }))
                                }
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
              </div>

              {/* Resumo / pagamento */}
              <div className="flex flex-col gap-4">
                {qtdRetornavel > 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <Label htmlFor="pdv-vazios">
                      Galões vazios recolhidos ({qtdRetornavel} retornáveis na venda)
                    </Label>
                    <Input
                      id="pdv-vazios"
                      type="number"
                      min={0}
                      value={vaziosValor}
                      onChange={(e) => {
                        setVaziosEditado(true);
                        setVazios(e.target.value);
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Preenchido automaticamente com os retornáveis do carrinho — edite se
                      o cliente não devolveu todos.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Formas de pagamento</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setParcelas((ps) => [
                          ...ps,
                          { forma: "Dinheiro", valor: restante > 0 ? String(restante) : "" },
                        ])
                      }
                    >
                      <Plus className="size-4" /> Adicionar
                    </Button>
                  </div>
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
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMAS_PAGAMENTO.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f === "Fiado" ? "Fiado / Caderneta" : f}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        className="w-28"
                        placeholder="0,00"
                        value={x.valor}
                        onChange={(e) =>
                          setParcelas((ps) =>
                            ps.map((y, i) => (i === idx ? { ...y, valor: e.target.value } : y)),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        aria-label="Remover forma de pagamento"
                        disabled={parcelas.length === 1}
                        onClick={() => setParcelas((ps) => ps.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <span className="text-muted-foreground">
                      Total: <strong className="tabular-nums">{brl(total)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Informado: <strong className="tabular-nums">{brl(informado)}</strong>
                    </span>
                    <span className={restante > 0.009 ? "text-destructive" : "text-success"}>
                      Restante:{" "}
                      <strong className="tabular-nums">{brl(Math.max(0, restante))}</strong>
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() =>
                      setParcelas((ps) =>
                        ps.map((y, i) => (i === 0 ? { ...y, valor: String(total) } : y)),
                      )
                    }
                  >
                    Lançar total na 1ª forma
                  </Button>
                </div>

                {valorDinheiro > 0 && (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="pdv-troco">Troco para R$</Label>
                    <Input
                      id="pdv-troco"
                      type="number"
                      min={0}
                      step="0.01"
                      value={trocoPara}
                      onChange={(e) => setTrocoPara(e.target.value)}
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Recebido em dinheiro: <strong>{brl(valorDinheiro)}</strong> · Troco a
                      devolver: <strong>{brl(troco)}</strong>
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label>Entregador</Label>
                  <Select value={entregador} onValueChange={setEntregador}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {opcoes.map((e) => (
                        <SelectItem key={e} value={e}>
                          {e}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  {itens.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Carrinho vazio.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {itens.map((i) => (
                        <li
                          key={i.produtoId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="truncate pr-2">
                            {i.qtd}x {i.nome}
                          </span>
                          <span className="tabular-nums">{brl(i.qtd * i.precoUnit)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <span className="text-xl font-semibold tabular-nums">{brl(total)}</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DrawerFooter className="flex-row justify-end gap-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancelar</Button>
            </DrawerClose>
            <Button onClick={finalizar} disabled={!caixaAberto || restante > 0.009}>
              {caixaAberto ? `Criar pedido · ${brl(total)}` : "Caixa fechado"}
            </Button>

          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

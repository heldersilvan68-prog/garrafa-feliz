import { useMemo, useState, type ReactNode } from "react";
import { ProdutoFoto } from "@/components/produto-foto";
import { ChevronDown, ChevronUp, Loader2, Plus, ShoppingCart, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { InputNumero } from "@/components/ui/input-numero";
import { Campo } from "@/components/ui/campo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useConfiguracoes } from "@/context/configuracoes";

import { bairroDe, hojeISO, rotuloCliente } from "@/lib/clientes";
import { brl, precoPorModo, totalComPromocao, unidPorFardo } from "@/lib/erp";
import { BALCAO } from "@/lib/entregadores";
import { resumoItens, type FormaPagamento, type ItemPedido, type Pedido } from "@/lib/pedidos";
import { ImprimirComprovante } from "@/components/pedidos/comprovante-pedido";
import { LABEL_MODO, type ModoVenda } from "@/lib/vasilhames";

type Parcela = { forma: FormaPagamento; valor: string };

/** Cliente padrão das vendas de balcão sem cadastro. */
const CONSUMIDOR_FINAL = "Consumidor Final / Balcão";

export function PdvDrawer({ children }: { children: ReactNode }) {
  const { produtos, baixaVenda } = useEstoque();
  const { clientes, registrarCompra, ajustarDivida, ajustarVasilhames, ajustarVales } =
    useClientes();
  const { criar } = usePedidos();
  const { caixaAberto } = useCaixa();
  const { opcoes } = useEntregadores();
  const { metodosAtivos } = useConfiguracoes();
  // Formas de pagamento vêm das Configurações (globais) e atualizam na hora.
  // "Vale" é sempre oferecido: é resgate de crédito já pago pelo cliente.
  const formasDisponiveis = [
    ...new Set([...(metodosAtivos as FormaPagamento[]), "Vale" as FormaPagamento]),
  ];

  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [endereco, setEndereco] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [precos, setPrecos] = useState<Record<string, string>>({});
  const [vazios, setVazios] = useState("0");
  const [vaziosEditado, setVaziosEditado] = useState(false);
  const [modos, setModos] = useState<Record<string, ModoVenda>>({});
  // Embalagem escolhida por produto: unidade avulsa ou fardo fechado.
  const [embalagens, setEmbalagens] = useState<Record<string, "un" | "fardo">>({});
  const [parcelas, setParcelas] = useState<Parcela[]>([{ forma: "PIX", valor: "" }]);
  const [trocoPara, setTrocoPara] = useState("");
  // Desconto manual aplicado sobre o total da venda.
  const [desconto, setDesconto] = useState(0);
  const [listaAberta, setListaAberta] = useState(false);
  const [entregador, setEntregador] = useState<string>(BALCAO);
  // Pacote de vales: entrada financeira que gera crédito, sem baixa de estoque.
  const [pacoteQtd, setPacoteQtd] = useState("");
  const [pacoteValorUnit, setPacoteValorUnit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Último pedido criado: abre a confirmação com opção de imprimir o comprovante.
  const [pedidoCriado, setPedidoCriado] = useState<Pedido | null>(null);

  const cliente = clientes.find((c) => c.id === clienteId);

  /** Passo de incremento no carrinho: 1 unidade ou o fardo inteiro. */
  const passoDe = (id: string) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return 1;
    return (embalagens[id] ?? "un") === "fardo" ? unidPorFardo(p) : 1;
  };

  /**
   * Preço da unidade de venda escolhida:
   * fardo fechado = preço cheio do fardo; retornável = preço do modo (refil,
   * casco avulso ou venda completa já com o desconto automático).
   */
  const precoPadrao = (id: string) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return 0;
    if ((embalagens[id] ?? "un") === "fardo")
      return p.precoFardo > 0 ? p.precoFardo : p.precoVenda * unidPorFardo(p);
    if (p.retornavel) return precoPorModo(p, modos[id] ?? "refil");
    return p.precoVenda;
  };

  /** Preço praticado (com edição manual) na unidade de venda escolhida. */
  const precoVenda = (id: string) =>
    Math.max(0, Number(precos[id] ?? precoPadrao(id)) || 0);

  /**
   * Total exato do item (R$), cravado em centavos:
   * fardo fechado = nº de fardos × preço do fardo (sem dividir por unidade);
   * avulso = promoção progressiva (combos fechados) + unidades restantes.
   */
  const totalItem = (id: string, qtdUnidades: number) => {
    const p = produtos.find((x) => x.id === id);
    if (!p || qtdUnidades <= 0) return 0;
    const preco = precoVenda(id);
    if ((embalagens[id] ?? "un") === "fardo") {
      const fardos = Math.max(1, Math.round(qtdUnidades / unidPorFardo(p)));
      return Math.round(fardos * preco * 100) / 100;
    }
    return Math.round(
      totalComPromocao(qtdUnidades, preco, p.promoQtd || 0, p.promoPreco || 0) * 100,
    ) / 100;
  };

  /**
   * Preço unitário armazenado no pedido — SEM arredondar, para que
   * qtd × precoUnit devolva exatamente o total do item (evita R$ 39,96).
   */
  const precoUnitario = (id: string, qtd: number) =>
    qtd > 0 ? totalItem(id, qtd) / qtd : 0;

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

  const itensFisicos: ItemPedido[] = produtos
    .filter((p) => (carrinho[p.id] ?? 0) > 0)
    .map((p) => ({
      produtoId: p.id,
      nome: p.nome,
      qtd: carrinho[p.id]!,
      // Preço negociado apenas nesta venda — não altera o cadastro do produto.
      // Fardo fechado: o valor digitado é do fardo, convertido por unidade.
      // Atacado: aplica combos fechados + unidades avulsas progressivamente.
      precoUnit: precoUnitario(p.id, carrinho[p.id]!),
      retornavel: p.retornavel,
      modo: p.retornavel ? (modos[p.id] ?? "refil") : "refil",
    }));

  const valesVendidos = Math.max(0, Math.floor(Number(pacoteQtd) || 0));
  const valorValeUnit = Math.max(0, Number(pacoteValorUnit) || 0);
  const itemPacote: ItemPedido[] =
    valesVendidos > 0
      ? [
          {
            produtoId: "",
            nome: `Pacote de Vales (${valesVendidos} vales)`,
            qtd: valesVendidos,
            precoUnit: valorValeUnit,
            retornavel: false,
            modo: "refil",
          },
        ]
      : [];
  const itens: ItemPedido[] = [...itensFisicos, ...itemPacote];

  const subtotal =
    Math.round(itens.reduce((s, i) => s + i.qtd * i.precoUnit, 0) * 100) / 100;
  const descontoAplicado = Math.min(Math.max(0, desconto), subtotal);
  const total = Math.round((subtotal - descontoAplicado) * 100) / 100;
  // Só as trocas de refil geram devolução de vasilhame vazio.
  const qtdRetornavel = itensFisicos
    .filter((i) => i.retornavel && i.modo === "refil")
    .reduce((s, i) => s + i.qtd, 0);

  const informado = parcelas.reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const restante = Math.round((total - informado) * 100) / 100;
  const valorFiado = parcelas
    .filter((x) => x.forma === "Fiado")
    .reduce((s, x) => s + (Number(x.valor) || 0), 0);
  const valorVale = parcelas
    .filter((x) => x.forma === "Vale")
    .reduce((s, x) => s + (Number(x.valor) || 0), 0);
  // Vales resgatados: galões retornáveis do carrinho (ou unidades físicas, se não houver).
  const unidadesFisicas = itensFisicos.reduce((s, i) => s + i.qtd, 0);
  const valesResgatados =
    valorVale > 0
      ? itensFisicos.filter((i) => i.retornavel).reduce((s, i) => s + i.qtd, 0) || unidadesFisicas
      : 0;
  const saldoVales = cliente?.valesSaldo ?? 0;
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

  /** Digitação direta: valor em fardos ou unidades conforme a embalagem escolhida. */
  const definirQtd = (id: string, texto: string) =>
    setCarrinho((c) => {
      const bruto = Math.max(0, Math.floor(Number(texto.replace(",", ".")) || 0));
      const n = bruto * passoDe(id);
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });

  const limpar = () => {
    setCarrinho({});
    setPrecos({});
    setModos({});
    setEmbalagens({});
    setVazios("0");
    setVaziosEditado(false);
    setTrocoPara("");
    setDesconto(0);
    setListaAberta(false);
    setPacoteQtd("");
    setPacoteValorUnit("");
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
    setListaAberta(false);
  };

  const finalizar = async () => {
    if (!caixaAberto) {
      toast.error("Abra o caixa para realizar vendas");
      return;
    }
    if (itens.length === 0) {
      toast.error("Adicione pelo menos um produto ao carrinho.");
      return;
    }
    if ((valorVale > 0 || valesVendidos > 0) && !cliente) {
      toast.error("Vales exigem um cliente cadastrado.");
      return;
    }
    if (valorVale > 0 && valesResgatados > saldoVales) {
      toast.error(
        `Saldo de vales insuficiente: cliente tem ${saldoVales} e a venda precisa de ${valesResgatados}.`,
      );
      return;
    }
    if (valesVendidos > 0 && valorValeUnit <= 0) {
      toast.error("Informe o valor de cada vale do pacote.");
      return;
    }
    if (restante > 0.009) {
      toast.error(`Falta informar ${brl(restante)} em formas de pagamento.`);
      return;
    }
    if (valorFiado > 0 && !cliente) {
      toast.error("Vendas no fiado exigem um cliente cadastrado.");
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const nVazios = Math.max(0, Number(vaziosValor) || 0);
      const pedido = await criar({
      // Venda de balcão sem cadastro entra como consumidor final.
      clienteId: cliente?.id ?? "",
      clienteNome: cliente?.nome ?? CONSUMIDOR_FINAL,
      telefone: cliente?.telefone ?? "",
      endereco: endereco || cliente?.endereco || "",
      bairro: cliente ? bairroDe(cliente) : "",
      itens,
      pagamentos: parcelas
        .filter((x) => (Number(x.valor) || 0) > 0)
        .map((x) => ({ forma: x.forma, valor: Number(x.valor) })),
      total,
      desconto: descontoAplicado,
      pagamento,
      pago: valorFiado === 0,
      valorFiado,
      trocoPara: valorDinheiro > 0 ? Number(trocoPara) || undefined : undefined,
      vaziosRecolhidos: nVazios,
      entregador: entregador || BALCAO,
      valesCredito: valesVendidos,
      valesResgatados,
      // Venda de balcão já sai concluída; entregas seguem em "pendente".
      status: (entregador || BALCAO) === BALCAO ? "concluido" : undefined,
      });

      // Pacote de vales não baixa estoque físico — só os itens de produto.
      baixaVenda(
        itensFisicos.map((i) => ({ produtoId: i.produtoId, qtd: i.qtd, modo: i.modo })),
        nVazios,
      );
      if (cliente) {
        if (valesVendidos > 0) await ajustarVales(cliente.id, valesVendidos);
        if (valesResgatados > 0) await ajustarVales(cliente.id, -valesResgatados);
        registrarCompra(cliente.id, resumoItens(itens), total, hojeISO());
        // Débito lançado exatamente igual ao valor informado como fiado.
        if (valorFiado > 0) ajustarDivida(cliente.id, valorFiado);
        // Cascos que saíram e não voltaram ficam na conta do cliente.
        const naRua = Math.max(0, qtdRetornavel - nVazios);
        if (naRua > 0) void ajustarVasilhames(cliente.id, naRua);
      }

      toast.success(`Pedido #${pedido.numero} criado — ${brl(total)}`, {
        description: `${cliente?.nome ?? CONSUMIDOR_FINAL} · ${pagamento} · ${entregador}`,
      });
      setPedidoCriado(pedido);
      limpar();
      setAberto(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível criar o pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog
      open={aberto}
      onOpenChange={(v) => {
        // Fechar por X, "Cancelar" ou clique fora zera o formulário por completo.
        if (!v) limpar();
        setAberto(v);
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-4xl rounded-3xl p-0 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col gap-0">
        <DialogHeader className="p-6 pb-2 text-left">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            Nova venda / pedido express
          </DialogTitle>
          <DialogDescription>
            Selecione o cliente, monte o carrinho e defina pagamento e entrega.
          </DialogDescription>
        </DialogHeader>

        {!caixaAberto && (
          <div className="mx-6 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            Abra o caixa para realizar vendas — vá em “Caixa & Acerto” e abra a sessão do dia.
          </div>
        )}

        <ScrollArea className="flex-1 overflow-y-auto px-6 py-2">
          <div className="grid gap-6 pb-4 lg:grid-cols-[1.15fr_1fr]">
            {/* Cliente + produtos */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Campo
                  label="Cliente (opcional — nome, telefone ou código)"
                  htmlFor="pdv-cliente"
                >
                  <Popover open={listaAberta} onOpenChange={setListaAberta}>
                    <div className="relative flex items-center">
                      <PopoverTrigger asChild>
                        <span className="absolute inset-0 -z-10" aria-hidden />
                      </PopoverTrigger>
                      <Input
                        id="pdv-cliente"
                        className="pr-10"
                        placeholder={`Buscar cliente ou deixe vazio (${CONSUMIDOR_FINAL})`}
                        value={busca}
                        onChange={(e) => {
                          setBusca(e.target.value);
                          setClienteId("");
                          setListaAberta(true);
                        }}
                        onClick={() => setListaAberta(true)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={listaAberta ? "Fechar lista de clientes" : "Abrir lista de clientes"}
                        className="absolute right-0 size-9 text-muted-foreground"
                        onClick={() => setListaAberta((v) => !v)}
                      >
                        {listaAberta ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </Button>
                    </div>
                    <PopoverContent
                      align="start"
                      className="w-[--radix-popover-trigger-width] min-w-[18rem] p-0"
                      onOpenAutoFocus={(e) => e.preventDefault()}
                    >
                      {filtrados.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground">
                          Nenhum cliente encontrado.
                        </p>
                      ) : (
                        filtrados.map((c) => (
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
                        ))
                      )}
                    </PopoverContent>
                  </Popover>
                </Campo>
                {cliente && (
                  <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{rotuloCliente(cliente)}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {(cliente.divida ?? 0) > 0 && (
                          <Badge variant="destructive">Fiado: {brl(cliente.divida ?? 0)}</Badge>
                        )}
                        <Badge variant={saldoVales > 0 ? "default" : "secondary"}>
                          <Ticket className="mr-1 size-3" />
                          Saldo: {saldoVales} vales
                        </Badge>
                      </div>
                    </div>
                    <Campo label="Endereço de entrega" htmlFor="pdv-endereco">
                      <Input
                        id="pdv-endereco"
                        value={endereco}
                        onChange={(e) => setEndereco(e.target.value)}
                      />
                    </Campo>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Produtos</p>
                <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                  {produtos.map((p) => {
                    const q = carrinho[p.id] ?? 0;
                    const upf = unidPorFardo(p);
                    const emFardo = (embalagens[p.id] ?? "un") === "fardo";
                    // Quantidade exibida: fardos inteiros ou unidades.
                    const qExibida = emFardo ? Math.round(q / upf) : q;
                    const limparPreco = () =>
                      setPrecos((s2) => {
                        const next = { ...s2 };
                        delete next[p.id];
                        return next;
                      });
                    // Ao trocar de modo/embalagem a quantidade volta para 1.
                    const resetQtd = (passo: number) =>
                      setCarrinho((c) => (c[p.id] ? { ...c, [p.id]: passo } : c));
                    return (
                      <div
                        key={p.id}
                        className="relative flex w-full min-w-0 flex-col gap-2 overflow-hidden rounded-xl border border-border bg-card p-4"
                      >
                        {/* Linha 1: foto + nome completo */}
                        <div className="flex min-w-0 items-start gap-3">
                          <ProdutoFoto
                            url={p.imagemUrl}
                            nome={p.nome}
                            className="size-[50px] shrink-0 rounded-lg"
                          />
                          <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-snug">
                            {p.nome}
                          </p>
                        </div>


                        {/* Linha 2: preço base editável (R$ 00,00) */}
                        <div className="flex items-center gap-2">
                          <InputMoeda
                            id={`preco-${p.id}`}
                            className="h-9 w-full rounded-lg text-sm font-semibold text-primary"
                            aria-label={`Preço de ${p.nome}`}
                            valor={precoVenda(p.id)}
                            onValor={(n) => setPrecos((s) => ({ ...s, [p.id]: String(n) }))}
                          />
                          <span className="shrink-0 text-xs font-normal text-muted-foreground">
                            {emFardo ? " /fardo" : " /un"}
                          </span>
                        </div>

                        {/* Linha 3: seleção de embalagem e/ou modo do retornável */}
                        {upf > 1 && (
                          <Select
                            value={embalagens[p.id] ?? "un"}
                            onValueChange={(v) => {
                              const fardo = v === "fardo";
                              setEmbalagens((m) => ({ ...m, [p.id]: fardo ? "fardo" : "un" }));
                              limparPreco();
                              resetQtd(fardo ? upf : 1);
                            }}
                          >
                            <SelectTrigger className="h-9 w-full min-w-0 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="un">Unidade avulsa</SelectItem>
                              <SelectItem value="fardo">Fardo fechado ({upf} un.)</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {p.retornavel && (
                          <Select
                            value={modos[p.id] ?? "refil"}
                            onValueChange={(v) => {
                              setModos((m) => ({ ...m, [p.id]: v as ModoVenda }));
                              // O preço acompanha o modo escolhido automaticamente.
                              limparPreco();
                              resetQtd(emFardo ? upf : 1);
                            }}
                          >
                            <SelectTrigger className="h-9 w-full min-w-0 text-xs">
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

                        {/* Rodapé: quantidade + total do item */}
                        <div className="flex min-w-0 items-center justify-between gap-2 pt-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              inputMode="numeric"
                              className="h-9 w-16 shrink-0 text-center tabular-nums"
                              aria-label={`Quantidade de ${p.nome}`}
                              placeholder="0"
                              value={qExibida > 0 ? String(qExibida) : ""}
                              onChange={(e) => definirQtd(p.id, e.target.value)}
                            />
                            <span className="truncate text-[11px] text-muted-foreground">
                              {emFardo ? "fardos" : "un."}
                            </span>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {brl(totalItem(p.id, q))}
                          </span>
                        </div>
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
                  <Campo
                    label={`Galões vazios recolhidos (${qtdRetornavel} retornáveis na venda)`}
                    htmlFor="pdv-vazios"
                  >
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
                  </Campo>
                  <p className="text-xs text-muted-foreground">
                    Preenchido automaticamente com os retornáveis do carrinho — edite se o cliente
                    não devolveu todos.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Ticket className="size-4 text-primary" /> Pacote de vales (crédito)
                </p>
                <div className="flex items-center gap-2">
                  <Campo label="Qtd. de vales" htmlFor="pdv-vales-qtd">
                    <InputNumero
                      id="pdv-vales-qtd"
                      min={0}
                      valor={valesVendidos}
                      onValor={(n) => setPacoteQtd(String(Math.max(0, n)))}
                    />
                  </Campo>
                  <Campo label="Valor por vale (R$)" htmlFor="pdv-vales-valor">
                    <InputNumero
                      id="pdv-vales-valor"
                      decimal
                      min={0}
                      valor={valorValeUnit}
                      onValor={(n) => setPacoteValorUnit(String(Math.max(0, n)))}
                    />
                  </Campo>
                </div>
                <p className="text-xs text-muted-foreground">
                  {valesVendidos > 0
                    ? `${valesVendidos} vales × ${brl(valorValeUnit)} = ${brl(valesVendidos * valorValeUnit)} — entra no caixa e credita o saldo do cliente, sem baixar estoque.`
                    : "Venda de crédito antecipado: soma no caixa e credita vales ao cliente, sem baixa de estoque."}
                </p>
              </div>

              <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">Formas de pagamento</p>
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
                        {formasDisponiveis.map((f) => (
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
                {valorVale > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Resgate em vale: <strong>{valesResgatados}</strong> galão(ões) ·{" "}
                    <strong>saldo do cliente: {saldoVales}</strong> · não entra como novo
                    faturamento no caixa.
                  </p>
                )}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">
                    Total: <strong className="tabular-nums">{brl(total)}</strong>
                  </span>
                  <span className="text-muted-foreground">
                    Informado: <strong className="tabular-nums">{brl(informado)}</strong>
                  </span>
                  <span className={restante > 0.009 ? "text-destructive" : "text-success"}>
                    Restante: <strong className="tabular-nums">{brl(Math.max(0, restante))}</strong>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setParcelas((ps) =>
                        ps.map((y, i) => (i === 0 ? { ...y, valor: String(total) } : y)),
                      )
                    }
                  >
                    Lançar total na 1ª forma
                  </Button>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">Desconto (R$)</span>
                    <InputNumero
                      id="pdv-desconto"
                      decimal
                      min={0}
                      className="h-8 w-24"
                      aria-label="Desconto em reais"
                      valor={desconto}
                      onValor={setDesconto}
                    />
                  </div>
                </div>
              </div>

              {valorDinheiro > 0 && (
                <div className="flex flex-col gap-2">
                  <Campo label="Troco para R$" htmlFor="pdv-troco">
                    <Input
                      id="pdv-troco"
                      type="number"
                      min={0}
                      step="0.01"
                      value={trocoPara}
                      onChange={(e) => setTrocoPara(e.target.value)}
                      placeholder="0,00"
                    />
                  </Campo>
                  <p className="text-xs text-muted-foreground">
                    Recebido em dinheiro: <strong>{brl(valorDinheiro)}</strong> · Troco a devolver:{" "}
                    <strong>{brl(troco)}</strong>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Entregador</p>
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
                      <li key={i.produtoId} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">
                          {i.qtd}x {i.nome}
                        </span>
                        <span className="tabular-nums">{brl(i.qtd * i.precoUnit)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Separator className="my-2" />
                {descontoAplicado > 0 && (
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Subtotal {brl(subtotal)} · desconto
                    </span>
                    <span className="tabular-nums text-destructive">
                      − {brl(descontoAplicado)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-xl font-semibold tabular-nums">{brl(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row justify-end gap-2 border-t p-6 pt-2">
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button
            onClick={finalizar}
            disabled={!caixaAberto || restante > 0.009 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Criando pedido...
              </>
            ) : caixaAberto ? (
              `Criar pedido · ${brl(total)}`
            ) : (
              "Caixa fechado"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      <Dialog open={!!pedidoCriado} onOpenChange={(v) => !v && setPedidoCriado(null)}>
        <DialogContent className="rounded-3xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Venda registrada</DialogTitle>
            <DialogDescription>
              {pedidoCriado
                ? `Pedido #${pedidoCriado.numero} · ${brl(pedidoCriado.total)} — ${pedidoCriado.clienteNome}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row justify-end gap-2">
            <DialogClose asChild>
              <Button variant="ghost">Fechar</Button>
            </DialogClose>
            {pedidoCriado ? <ImprimirComprovante pedido={pedidoCriado} variant="default" /> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

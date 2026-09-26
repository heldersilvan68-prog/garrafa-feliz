import type React from "react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraMovimentoVasilhame, paraProduto, type ProdutoRow, type VasilhameRow } from "@/lib/mapeadores";
import type { Produto } from "@/lib/erp";
import { aPrazo, PREFIXO_AVARIA_CARGA, type ModoVenda, type MotivoAvaria, type MovimentoVasilhame, type TipoMovVasilhame } from "@/lib/vasilhames";

/** Dados completos da chegada de uma carga da fonte. */
export type ChegadaCarga = {
  produtoId: string;
  enviados: number;
  custoEnvase: number;
  forma: string;
  vencimento?: string;
  quebrados: number;
  motivoAvaria: MotivoAvaria;
  valorPerda: number;
  formaPerda: string;
  retornados: number;
  data: string;
  /** Pagamentos divididos (uma parte por forma). */
  pagamentosEnvase?: { forma: string; valor: number }[];
  pagamentosPerda?: { forma: string; valor: number }[];
  /** Compra opcional de vasilhames novos junto com a carga. */
  novos?: number;
  valorNovos?: number;
  pagamentosNovos?: { forma: string; valor: number }[];
  /** Onde os vasilhames novos entram no estoque (padrão: vazio). */
  novosComo?: "cheio" | "vazio";
};
import { CATEGORIA_COMPRA_MERCADORIA, CATEGORIA_ENVASE } from "@/lib/despesas";

export type ItemBaixa = { produtoId: string; qtd: number; modo?: ModoVenda; retornavel?: boolean };

/** Dados financeiros opcionais de uma entrada de mercadoria (compra). */
export type CompraEntrada = {
  custoUnitario: number;
  valorTotal: number;
  data: string;
  fornecedor?: string;
  forma: string;
  /** Vencimento do boleto/título quando a compra é a prazo. */
  vencimento?: string;
  /** Descrição/categoria alternativa (ex.: custo de envase). */
  descricao?: string;
  categoria?: string;
  /** Pagamento dividido: uma despesa é lançada por forma. */
  pagamentos?: { forma: string; valor: number }[];
};

type Ctx = {
  produtos: Produto[];
  movimentos: MovimentoVasilhame[];
  carregarMaisMovimentos: () => void;
  temMaisMovimentos: boolean;
  carregandoMaisMovimentos: boolean;
  emTransitoFonte: number;
  carregando: boolean;
  salvar: (p: Produto) => void;
  remover: (id: string) => void;
  entradaEstoque: (id: string, qtd: number, compra?: CompraEntrada) => void;
  moverVazios: (id: string, qtd: number) => void;
  comprarVasilhames: (id: string, qtd: number) => Promise<void>;
  retornoSemEnvase: (id: string, qtd: number) => Promise<void>;
  registrarChegadaCarga: (dados: ChegadaCarga) => Promise<void>;
  registrarAvaria: (dados: {
    produtoId: string;
    estado: "cheio" | "vazio";
    motivo: MotivoAvaria;
    qtd: number;
  }) => Promise<void>;
  devolucaoCliente: (produtoId: string, qtd: number, clienteId?: string) => Promise<void>;
  baixaVenda: (
    itens: ItemBaixa[],
    vaziosRecolhidos: number,
    vinculo?: { clienteId?: string; pedidoId?: string; numeroPedido?: number },
  ) => Promise<void>;
  estornarVenda: (itens: ItemBaixa[], vaziosRecolhidos: number) => Promise<void>;
};

const EstoqueContext = (((globalThis as Record<string, unknown>).__ctx_EstoqueContext ??= createContext<Ctx | null>(null)) as React.Context<Ctx | null>);

export function EstoqueProvider({ children }: { children: ReactNode }) {
  const { userId, user } = useAuth();
  const email = user?.email;
  const queryClient = useQueryClient();

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ["produtos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data as ProdutoRow[]).map(paraProduto);
    },
  });

  const movimentosQuery = useInfiniteQuery({
    queryKey: ["movimentos-vasilhames", userId],
    enabled: !!userId,
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const inicio = pageParam * 50;
      const { data, error } = await supabase
        .from("returnable_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .range(inicio, inicio + 49);
      if (error) throw error;
      return (data as VasilhameRow[]).map(paraMovimentoVasilhame);
    },
    getNextPageParam: (ultima, paginas) => (ultima.length === 50 ? paginas.length : undefined),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  const movimentos = useMemo(
    () => movimentosQuery.data?.pages.flat() ?? [],
    [movimentosQuery.data],
  );
  const { data: emTransitoFonte = 0 } = useQuery({
    queryKey: ["movimentos-vasilhames", "saldo-transito", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returnable_movements")
        .select("tipo,qtd,motivo")
        .in("tipo", ["envasado", "entrada", "retorno_sem_envase", "avaria_cheio"]);
      if (error) throw error;
      return (data ?? []).reduce((saldo, movimento) => {
        if (movimento.tipo === "envasado") return saldo + movimento.qtd;
        if (movimento.tipo === "avaria_cheio")
          return movimento.motivo?.startsWith(PREFIXO_AVARIA_CARGA) ? saldo - movimento.qtd : saldo;
        return saldo - movimento.qtd;
      }, 0);
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ["produtos"] });
    queryClient.invalidateQueries({ queryKey: ["movimentos-vasilhames"] });
  };

  const useMutacao = <T,>(fn: (v: T) => Promise<void>, erro: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: invalidar,
      onError: (e: Error) => toast.error(`${erro}: ${e.message}`),
    });

  const logar = async (dados: {
    produtoId?: string;
    clienteId?: string;
    pedidoId?: string;
    tipo: TipoMovVasilhame;
    qtd: number;
    motivo?: string;
    deltaCheio?: number;
    deltaVazio?: number;
    deltaPatrimonio?: number;
    custoUnitario?: number;
    valorTotal?: number;
    fornecedor?: string;
    formaPagamento?: string;
    despesaId?: string;
  }) => {
    if (!userId) return;
    await supabase.from("returnable_movements").insert({
      user_id: userId,
      product_id: dados.produtoId ?? null,
      client_id: dados.clienteId ?? null,
      order_id: dados.pedidoId ?? null,
      tipo: dados.tipo,
      qtd: dados.qtd,
      motivo: dados.motivo ?? null,
      usuario: email ?? null,
      delta_cheio: dados.deltaCheio ?? 0,
      delta_vazio: dados.deltaVazio ?? 0,
      delta_patrimonio: dados.deltaPatrimonio ?? 0,
      custo_unitario: dados.custoUnitario ?? 0,
      valor_total: dados.valorTotal ?? 0,
      fornecedor: dados.fornecedor ?? null,
      forma_pagamento: dados.formaPagamento ?? null,
      expense_id: dados.despesaId ?? null,
    });
  };

  /**
   * Lança a compra de mercadoria no financeiro:
   * à vista → despesa paga no dia; a prazo → título em Contas a Pagar.
   * Devolve o id da despesa criada para o log da movimentação.
   */
  const lancarCompra = async (
    produto: Produto,
    qtd: number,
    compra: CompraEntrada,
  ): Promise<string | undefined> => {
    if (!userId || !(compra.valorTotal > 0)) return undefined;
    const prazo = aPrazo(compra.forma);

    const nomeCategoria = compra.categoria ?? CATEGORIA_COMPRA_MERCADORIA;
    // Garante a categoria automática do lançamento.
    const { data: cats } = await supabase
      .from("expense_categories")
      .select("id,nome")
      .eq("nome", nomeCategoria)
      .limit(1);
    let categoriaId = cats?.[0]?.id ?? null;
    if (!categoriaId) {
      const { data: nova } = await supabase
        .from("expense_categories")
        .insert({
          user_id: userId,
          nome: nomeCategoria,
          cor: "var(--color-primary)",
        })
        .select("id")
        .single();
      categoriaId = nova?.id ?? null;
    }

    const partes =
      compra.pagamentos && compra.pagamentos.length > 0
        ? compra.pagamentos.filter((x) => x.valor > 0)
        : [{ forma: compra.forma, valor: compra.valorTotal }];

    let primeiroId: string | undefined;
    for (const parte of partes) {
      const prazoParte = aPrazo(parte.forma);
      const forma = prazoParte
        ? "Boleto"
        : parte.forma === "Dinheiro"
          ? "Dinheiro do Caixa"
          : parte.forma;
      const { data: despesa, error } = await supabase
        .from("expenses")
        .insert({
          user_id: userId,
          descricao:
            (compra.descricao ?? `Compra de mercadoria · ${qtd} un. ${produto.nome}`) +
            (partes.length > 1 ? ` (${parte.forma})` : ""),
          categoria: nomeCategoria,
          category_id: categoriaId,
          valor: Math.round(parte.valor * 100) / 100,
          data: prazoParte ? compra.vencimento || compra.data : compra.data,
          forma,
          status: prazoParte ? "Pendente" : "Pago",
          observacoes: [
            compra.fornecedor ? `Fornecedor: ${compra.fornecedor}` : null,
            `Custo unitário: ${compra.custoUnitario}`,
            `Entrada em ${compra.data}`,
            partes.length > 1 ? `Pagamento dividido (${partes.length} formas)` : null,
          ]
            .filter(Boolean)
            .join(" · "),
        })
        .select("id")
        .single();
      if (error) throw error;
      primeiroId ??= despesa?.id;
    }
    void prazo;
    queryClient.invalidateQueries({ queryKey: ["despesas"] });
    return primeiroId;
  };

  const salvarMut = useMutacao<Produto>(async (p) => {
    if (!userId) throw new Error("Sessão expirada");
    const linha = {
      user_id: userId,
      nome: p.nome,
      categoria: p.categoria,
      marca: p.marca?.trim() || null,
      unidade: p.unidade?.trim() || null,
      imagem_url: p.imagemUrl?.trim() || null,
      preco_custo: p.precoCusto,
      preco_venda: p.precoVenda,
      estoque_minimo: p.estoqueMinimo,
      retornavel: p.retornavel,
      estoque_cheio: p.estoqueCheio,
      estoque_vazio: p.estoqueVazio,
      custo_casco: p.custoCasco,
      custo_envase: p.custoEnvase,
      unidades_por_fardo: Math.max(1, Math.floor(p.unidadesPorFardo || 1)),
      preco_custo_fardo: p.precoCustoFardo || 0,
      preco_fardo: p.precoFardo || 0,
      margem_desejada: p.margemDesejada || 0,
      preco_venda_casco: p.precoVendaCasco || 0,
      desconto_completa: p.descontoCompleta || 0,
      promo_qtd: Math.max(0, Math.floor(p.promoQtd || 0)),
      promo_preco: p.promoPreco || 0,
    };

    const existe = produtos.some((x) => x.id === p.id);
    // Patrimônio de cascos NUNCA é recalculado por edição manual de cheios/vazios:
    // no cadastro inicial ele nasce do saldo informado e depois só muda por evento.
    const { error } = existe
      ? await supabase.from("products").update(linha).eq("id", p.id)
      : await supabase.from("products").insert({
          ...linha,
          patrimonio_cascos: p.retornavel
            ? Math.max(0, Math.floor((p.estoqueCheio || 0) + (p.estoqueVazio || 0)))
            : 0,
        });
    if (error) throw error;
  }, "Não foi possível salvar o produto");

  const removerMut = useMutacao<string>(async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  }, "Não foi possível remover o produto");

  const patch = async (id: string, dados: Partial<ProdutoRow>) => {
    const { error } = await supabase.from("products").update(dados).eq("id", id);
    if (error) throw error;
  };

  // Chegada de mercadoria cheia/recarregada vinda da fonte (O patrimônio NÃO muda)
  const entradaMut = useMutacao<{ id: string; qtd: number; compra?: CompraEntrada }>(
    async ({ id, qtd, compra }) => {
      const p = produtos.find((x) => x.id === id);
      if (!p) return;
      // O estoque sobe sempre, à vista ou a prazo.
      await patch(id, { estoque_cheio: Math.max(0, p.estoqueCheio + qtd) });
      const despesaId = compra ? await lancarCompra(p, qtd, compra) : undefined;
      await logar({
        produtoId: id,
        tipo: "entrada",
        qtd,
        motivo: compra
          ? `Compra de mercadoria · ${p.nome}${compra.fornecedor ? ` · ${compra.fornecedor}` : ""}`
          : `Chegada de carga envasada · ${p.nome}`,
        deltaCheio: qtd,
        deltaVazio: 0,
        deltaPatrimonio: 0, // Patrimônio inalterado
        custoUnitario: compra?.custoUnitario,
        valorTotal: compra?.valorTotal,
        fornecedor: compra?.fornecedor,
        formaPagamento: compra?.forma,
        despesaId,
      });
    },
    "Não foi possível registrar a chegada da carga",
  );

  // Envio de vasilhames vazios para a envasadora (O patrimônio NÃO muda)
  const vaziosMut = useMutacao<{ id: string; qtd: number }>(async ({ id, qtd }) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    const mov = Math.min(qtd, p.estoqueVazio);
    await patch(id, {
      estoque_vazio: p.estoqueVazio - mov,
    });
    await logar({
      produtoId: id,
      tipo: "envasado",
      qtd: mov,
      motivo: `Envio para envasadora (em trânsito) · ${p.nome}`,
      deltaCheio: 0,
      deltaVazio: -mov,
      deltaPatrimonio: 0, // Patrimônio inalterado
    });
  }, "Não foi possível registrar envio de vasilhames");

  // Compra/Aporte de NOVOS vasilhames (AUMENTA o patrimônio total)
  const comprarMut = useMutacao<{ id: string; qtd: number }>(async ({ id, qtd }) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    await patch(id, {
      estoque_cheio: p.estoqueCheio + qtd,
      patrimonio_cascos: Math.max(0, (p.patrimonioCascos || 0) + qtd),
    });
    await logar({
      produtoId: id,
      tipo: "entrada",
      qtd,
      motivo: `Compra / Aporte de novos vasilhames cheios · ${p.nome}`,
      deltaCheio: qtd,
      deltaVazio: 0,
      deltaPatrimonio: qtd, // Patrimônio AUMENTA
    });
  }, "Não foi possível registrar a compra de vasilhames");

  // Retorno sem envase (O patrimônio NÃO muda)
  const retornoMut = useMutacao<{ id: string; qtd: number }>(async ({ id, qtd }) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    await patch(id, { estoque_vazio: p.estoqueVazio + qtd });
    await logar({
      produtoId: id,
      tipo: "retorno_sem_envase",
      qtd,
      motivo: `Retorno da fonte sem envasar · ${p.nome}`,
      deltaVazio: qtd,
      deltaPatrimonio: 0, // Patrimônio inalterado
    });
  }, "Não foi possível registrar o retorno da fonte");

  // Avarias e perdas (REDUZ O PATRIMÔNIO)
  const avariaMut = useMutation({
    mutationFn: async ({
      produtoId,
      estado,
      motivo,
      qtd,
    }: {
      produtoId: string;
      estado: "cheio" | "vazio";
      motivo: MotivoAvaria;
      qtd: number;
    }) => {
      if (!userId) throw new Error("Sessão expirada");
      const p = produtos.find((x) => x.id === produtoId);
      if (!p) throw new Error("Produto não encontrado");
      const cheio = estado === "cheio";
      const perdidos = Math.min(qtd, cheio ? p.estoqueCheio : p.estoqueVazio);
      if (perdidos <= 0) throw new Error("Sem saldo suficiente para registrar a avaria");

      await patch(produtoId, {
        ...(cheio
          ? { estoque_cheio: p.estoqueCheio - perdidos }
          : { estoque_vazio: p.estoqueVazio - perdidos }),
        // Avaria/perda descarta o casco: reduz o patrimônio.
        patrimonio_cascos: Math.max(0, (p.patrimonioCascos || 0) - perdidos),
      });

      const unitario = cheio ? p.custoCasco + p.custoEnvase : p.custoCasco;
      const valor = unitario * perdidos;
      if (valor > 0) {
        await supabase.from("expenses").insert({
          user_id: userId,
          descricao: cheio
            ? `Avaria/Perda de carga · ${p.nome} (${perdidos} un.) — ${motivo}`
            : `Avaria/Perda de casco · ${p.nome} (${perdidos} un.) — ${motivo}`,
          categoria: "Avarias/Perdas",
          valor,
          forma: "Dinheiro",
          status: "Pago" as const,
          observacoes: motivo,
        });
      }

      await logar({
        produtoId,
        tipo: cheio ? "avaria_cheio" : "avaria_vazio",
        qtd: perdidos,
        motivo,
        deltaCheio: cheio ? -perdidos : 0,
        deltaVazio: cheio ? 0 : -perdidos,
        deltaPatrimonio: -perdidos, // Patrimônio REDUZ
      });
    },
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      toast.success("Avaria registrada e lançada no financeiro!");
    },
    onError: (e: Error) => toast.error(`Não foi possível registrar a avaria: ${e.message}`),
  });

  const devolucaoMut = useMutacao<{ produtoId: string; qtd: number; clienteId?: string }>(
    async ({ produtoId, qtd, clienteId }) => {
      const p = produtos.find((x) => x.id === produtoId);
      if (!p) throw new Error("Produto não encontrado");
      await patch(produtoId, { estoque_vazio: p.estoqueVazio + qtd });
      await logar({
        produtoId,
        clienteId,
        tipo: "devolucao_cliente",
        qtd,
        motivo: `Devolução de casco pelo cliente · ${p.nome}`,
        deltaVazio: qtd,
        deltaPatrimonio: 0,
      });
    },
    "Não foi possível registrar a devolução",
  );

  // Vendas (Se for água completa ou casco vendido, REDUZ o patrimônio)
  const aplicarVenda = async (
    itens: ItemBaixa[],
    vaziosRecolhidos: number,
    sinal: 1 | -1,
    vinculo?: { clienteId?: string; pedidoId?: string; numeroPedido?: number },
  ) => {
    const modoDe = (i: ItemBaixa): ModoVenda => {
      const p = produtos.find((x) => x.id === i.produtoId);
      return p?.retornavel ? (i.modo ?? "refil") : "refil";
    };
    const refis = itens.filter(
      (i) => modoDe(i) === "refil" && produtos.find((p) => p.id === i.produtoId)?.retornavel,
    );
    const totalRefil = refis.reduce((s, i) => s + i.qtd, 0);
    // Vazios recolhidos são distribuídos entre as linhas de refil, sem sobra.
    let vaziosRestantes = vaziosRecolhidos;
    let refisRestantes = totalRefil;

    // Um mesmo produto pode aparecer em várias linhas (modos diferentes):
    // acumulamos os deltas e gravamos uma única vez por produto.
    const acumulado = new Map<
      string,
      { cheio: number; vazio: number; patrimonio: number }
    >();

    for (const item of itens) {
      const p = produtos.find((x) => x.id === item.produtoId);
      if (!p) continue;
      const modo = modoDe(item);
      let deltaCheio = 0;
      let deltaVazio = 0;
      let deltaPatrimonio = 0;

      if (modo === "casco") {
        deltaVazio = -item.qtd * sinal;
        deltaPatrimonio = -item.qtd * sinal; // Venda de casco REDUZ patrimônio
      } else if (modo === "completa") {
        // Casco + água: sai cheio do estoque e o vasilhame deixa o patrimônio.
        deltaCheio = -item.qtd * sinal;
        deltaPatrimonio = -item.qtd * sinal;
      } else {
        // Troca de refil: sai cheio, volta casco vazio, patrimônio intacto.
        deltaCheio = -item.qtd * sinal;
        if (p.retornavel && refisRestantes > 0 && vaziosRestantes > 0) {
          const cota = Math.min(
            vaziosRestantes,
            Math.round((item.qtd / refisRestantes) * vaziosRestantes),
          );
          vaziosRestantes -= cota;
          refisRestantes -= item.qtd;
          deltaVazio = cota * sinal;
        }
        deltaPatrimonio = 0;
      }

      const acc = acumulado.get(p.id) ?? { cheio: 0, vazio: 0, patrimonio: 0 };
      acumulado.set(p.id, {
        cheio: acc.cheio + deltaCheio,
        vazio: acc.vazio + deltaVazio,
        patrimonio: acc.patrimonio + deltaPatrimonio,
      });

      if (p.retornavel) {
        await logar({
          produtoId: p.id,
          clienteId: vinculo?.clienteId,
          pedidoId: vinculo?.pedidoId,
          tipo: sinal === 1 ? (modo === "refil" ? "recolhido" : modo === "casco" ? "venda_casco" : "venda_completa") : "estorno",
          qtd: item.qtd,
          motivo:
            sinal === 1
              ? `Venda #${vinculo?.numeroPedido ?? "—"} (${modo}) · ${p.nome}`
              : `Estorno da venda #${vinculo?.numeroPedido ?? "—"} (${modo}) · ${p.nome}`,
          deltaCheio,
          deltaVazio,
          deltaPatrimonio,
        });
      }
    }

    for (const [produtoId, d] of acumulado) {
      const p = produtos.find((x) => x.id === produtoId);
      if (!p) continue;
      await patch(produtoId, {
        estoque_cheio: Math.max(0, p.estoqueCheio + d.cheio),
        estoque_vazio: Math.max(0, p.estoqueVazio + d.vazio),
        // Só venda definitiva de casco/completa mexe no patrimônio (refil mantém intacto).
        ...(d.patrimonio !== 0
          ? { patrimonio_cascos: Math.max(0, (p.patrimonioCascos || 0) + d.patrimonio) }
          : {}),
      });
    }
  };


  const baixaMut = useMutacao<{
    itens: ItemBaixa[];
    vaziosRecolhidos: number;
    vinculo?: { clienteId?: string; pedidoId?: string; numeroPedido?: number };
  }>(
    async ({ itens, vaziosRecolhidos, vinculo }) =>
      aplicarVenda(itens, vaziosRecolhidos, 1, vinculo),
    "Não foi possível atualizar o estoque",
  );

  const estornoMut = useMutation({
    mutationFn: async ({
      itens,
      vaziosRecolhidos,
    }: {
      itens: ItemBaixa[];
      vaziosRecolhidos: number;
    }) => aplicarVenda(itens, vaziosRecolhidos, -1),
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(`Não foi possível estornar o estoque: ${e.message}`),
  });

  // Chegada completa da carga: cheios entram, quebras saem do patrimônio,
  // vazios retornam ao depósito e as despesas são lançadas já com abatimentos.
  const chegadaMut = useMutation({
    mutationFn: async (c: ChegadaCarga) => {
      if (!userId) throw new Error("Sessão expirada");
      const p = produtos.find((x) => x.id === c.produtoId);
      if (!p) throw new Error("Produto não encontrado");
      const quebrados = Math.max(0, Math.floor(c.quebrados));
      const retornados = Math.max(0, Math.floor(c.retornados));
      const novos = Math.max(0, Math.floor(c.novos ?? 0));
      const avulsa = c.enviados <= 0;
      const recebidos = avulsa ? 0 : c.enviados - quebrados - retornados;
      if (recebidos < 0) throw new Error("Avarias + retornos excedem a quantidade da carga");
      const r2 = (n: number) => Math.round(n * 100) / 100;
      const valorFinal = r2(Math.max(0, recebidos * c.custoEnvase));

      // Avaria avulsa (sem carga): sai do depósito — primeiro vazios, depois cheios.
      const quebraVazio = avulsa ? Math.min(quebrados, p.estoqueVazio) : 0;
      const quebraCheio = avulsa ? Math.min(quebrados - quebraVazio, p.estoqueCheio) : 0;

      const novosCheios = c.novosComo === "cheio" ? novos : 0;
      const novosVazios = novos - novosCheios;

      await patch(p.id, {
        estoque_cheio: p.estoqueCheio + recebidos + novosCheios - quebraCheio,
        estoque_vazio: p.estoqueVazio + (avulsa ? 0 : retornados) + novosVazios - quebraVazio,
        patrimonio_cascos: Math.max(0, (p.patrimonioCascos || 0) - quebrados + novos),
      });

      if (recebidos > 0) {
        const despesaId =
          valorFinal > 0
            ? await lancarCompra(p, recebidos, {
                custoUnitario: c.custoEnvase,
                valorTotal: valorFinal,
                data: c.data,
                forma: c.forma,
                vencimento: aPrazo(c.forma) ? c.vencimento : undefined,
                categoria: CATEGORIA_ENVASE,
                descricao: `Custo de envase · ${recebidos} un. ${p.nome}`,
                pagamentos: c.pagamentosEnvase,
              })
            : undefined;
        await logar({
          produtoId: p.id,
          tipo: "entrada",
          qtd: recebidos,
          motivo: `Chegada de carga · ${p.nome} (carga ${c.enviados}${quebrados ? ` · ${quebrados} quebra(s)` : ""}${retornados ? ` · ${retornados} retorno(s)` : ""})`,
          deltaCheio: recebidos,
          custoUnitario: c.custoEnvase,
          valorTotal: valorFinal,
          formaPagamento: c.pagamentosEnvase?.map((x) => x.forma).join(" + ") || c.forma,
          despesaId,
        });
      }

      if (novos > 0) {
        const valorNovos = r2(c.valorNovos ?? 0);
        const despesaId =
          valorNovos > 0
            ? await lancarCompra(p, novos, {
                custoUnitario: r2(valorNovos / novos),
                valorTotal: valorNovos,
                data: c.data,
                forma: c.pagamentosNovos?.[0]?.forma ?? "PIX",
                categoria: "Compra de Vasilhames",
                descricao: `Compra de vasilhames novos · ${novos} un. ${p.nome}`,
                pagamentos: c.pagamentosNovos,
              })
            : undefined;
        await logar({
          produtoId: p.id,
          tipo: "compra",
          qtd: novos,
          motivo: `Compra de vasilhames novos · ${p.nome} (entraram ${novosComo === "cheio" ? "cheios" : "vazios"})`,
          deltaCheio: novosCheios,
          deltaVazio: novosVazios,
          deltaPatrimonio: novos,
          custoUnitario: r2(valorNovos / novos),
          valorTotal: valorNovos,
          formaPagamento: c.pagamentosNovos?.map((x) => x.forma).join(" + "),
          despesaId,
        });
      }

      if (quebrados > 0) {
        let despesaId: string | undefined;
        if (c.valorPerda > 0) {
          const partes =
            c.pagamentosPerda && c.pagamentosPerda.length > 0
              ? c.pagamentosPerda.filter((x) => x.valor > 0)
              : [{ forma: c.formaPerda, valor: c.valorPerda }];
          for (const parte of partes) {
            const forma = parte.forma === "Dinheiro" ? "Dinheiro do Caixa" : parte.forma;
            const { data: d, error } = await supabase
              .from("expenses")
              .insert({
                user_id: userId,
                descricao: `Avaria/Perda${avulsa ? "" : " na carga"} · ${p.nome} (${quebrados} un.) — ${c.motivoAvaria}${partes.length > 1 ? ` (${parte.forma})` : ""}`,
                categoria: "Avarias/Perdas",
                valor: r2(parte.valor),
                data: c.data,
                forma,
                status: "Pago" as const,
                observacoes: c.motivoAvaria,
              })
              .select("id")
              .single();
            if (error) throw error;
            despesaId ??= d?.id;
          }
        }
        await logar({
          produtoId: p.id,
          tipo: avulsa && quebraCheio > 0 && quebraVazio === 0 ? "avaria_cheio" : avulsa ? "avaria_vazio" : "avaria_cheio",
          qtd: quebrados,
          motivo: avulsa ? c.motivoAvaria : `${PREFIXO_AVARIA_CARGA} ${c.motivoAvaria}`,
          deltaCheio: -quebraCheio,
          deltaVazio: -quebraVazio,
          deltaPatrimonio: -quebrados,
          valorTotal: r2(c.valorPerda),
          formaPagamento: c.pagamentosPerda?.map((x) => x.forma).join(" + ") || c.formaPerda,
          despesaId,
        });
      }

      if (retornados > 0 && !avulsa) {
        await logar({
          produtoId: p.id,
          tipo: "retorno_sem_envase",
          qtd: retornados,
          motivo: `Retorno da fonte sem envasar · ${p.nome}`,
          deltaVazio: retornados,
        });
      }
    },
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["despesas"] });
      queryClient.invalidateQueries({ queryKey: ["caixa"] });
    },
    onError: (e: Error) => toast.error(`Não foi possível registrar a chegada: ${e.message}`),
  });

  const valor = useMemo<Ctx>(
    () => ({
      produtos,
      movimentos,
      carregarMaisMovimentos: () => void movimentosQuery.fetchNextPage(),
      temMaisMovimentos: movimentosQuery.hasNextPage,
      carregandoMaisMovimentos: movimentosQuery.isFetchingNextPage,
      emTransitoFonte: Math.max(0, emTransitoFonte),
      carregando: isLoading,
      salvar: (p) => salvarMut.mutate(p),
      remover: (id) => removerMut.mutate(id),
      entradaEstoque: (id, qtd, compra) => entradaMut.mutate({ id, qtd, compra }),
      moverVazios: (id, qtd) => vaziosMut.mutate({ id, qtd }),
      comprarVasilhames: (id, qtd) => comprarMut.mutateAsync({ id, qtd }).then(() => undefined),
      retornoSemEnvase: (id, qtd) => retornoMut.mutateAsync({ id, qtd }).then(() => undefined),
      registrarChegadaCarga: (dados) => chegadaMut.mutateAsync(dados).then(() => undefined),
      registrarAvaria: (dados) => avariaMut.mutateAsync(dados).then(() => undefined),
      devolucaoCliente: (produtoId, qtd, clienteId) =>
        devolucaoMut.mutateAsync({ produtoId, qtd, clienteId }).then(() => undefined),
      estornarVenda: (itens, vaziosRecolhidos) =>
        estornoMut.mutateAsync({ itens, vaziosRecolhidos }).then(() => undefined),
       baixaVenda: (itens, vaziosRecolhidos, vinculo) =>
         baixaMut.mutateAsync({ itens, vaziosRecolhidos, vinculo }).then(() => undefined),
    }),
    [produtos, movimentos, movimentosQuery.fetchNextPage, movimentosQuery.hasNextPage, movimentosQuery.isFetchingNextPage, emTransitoFonte, isLoading, salvarMut.mutate, removerMut.mutate, entradaMut.mutate, vaziosMut.mutate, comprarMut.mutateAsync, retornoMut.mutateAsync, avariaMut.mutateAsync, devolucaoMut.mutateAsync, estornoMut.mutateAsync, baixaMut.mutate, chegadaMut.mutateAsync],
  );

  return (
    <EstoqueContext.Provider
      value={valor}
    >
      {children}
    </EstoqueContext.Provider>
  );
}

export function useEstoque() {
  const ctx = useContext(EstoqueContext);
  if (!ctx) throw new Error("useEstoque precisa estar dentro de EstoqueProvider");
  return ctx;
}
import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraMovimentoVasilhame, paraProduto, type ProdutoRow, type VasilhameRow } from "@/lib/mapeadores";
import type { Produto } from "@/lib/erp";
import type { ModoVenda, MotivoAvaria, MovimentoVasilhame, TipoMovVasilhame } from "@/lib/vasilhames";

export type ItemBaixa = { produtoId: string; qtd: number; modo?: ModoVenda; retornavel?: boolean };

type Ctx = {
  produtos: Produto[];
  movimentos: MovimentoVasilhame[];
  carregando: boolean;
  salvar: (p: Produto) => void;
  remover: (id: string) => void;
  entradaEstoque: (id: string, qtd: number) => void;
  moverVazios: (id: string, qtd: number) => void;
  comprarVasilhames: (id: string, qtd: number) => Promise<void>;
  retornoSemEnvase: (id: string, qtd: number) => Promise<void>;
  registrarAvaria: (dados: {
    produtoId: string;
    estado: "cheio" | "vazio";
    motivo: MotivoAvaria;
    qtd: number;
  }) => Promise<void>;
  devolucaoCliente: (produtoId: string, qtd: number, clienteId?: string) => Promise<void>;
  baixaVenda: (itens: ItemBaixa[], vaziosRecolhidos: number) => void;
  estornarVenda: (itens: ItemBaixa[], vaziosRecolhidos: number) => Promise<void>;
};

const EstoqueContext = createContext<Ctx | null>(null);

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

  const { data: movimentos = [] } = useQuery({
    queryKey: ["movimentos-vasilhames", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returnable_movements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;
      return (data as VasilhameRow[]).map(paraMovimentoVasilhame);
    },
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
    tipo: TipoMovVasilhame;
    qtd: number;
    motivo?: string;
    deltaCheio?: number;
    deltaVazio?: number;
    deltaPatrimonio?: number;
  }) => {
    if (!userId) return;
    await supabase.from("returnable_movements").insert({
      user_id: userId,
      product_id: dados.produtoId ?? null,
      client_id: dados.clienteId ?? null,
      tipo: dados.tipo,
      qtd: dados.qtd,
      motivo: dados.motivo ?? null,
      usuario: email ?? null,
      delta_cheio: dados.deltaCheio ?? 0,
      delta_vazio: dados.deltaVazio ?? 0,
      delta_patrimonio: dados.deltaPatrimonio ?? 0,
    });
  };

  const salvarMut = useMutacao<Produto>(async (p) => {
    if (!userId) throw new Error("Sessão expirada");
    const linha = {
      user_id: userId,
      nome: p.nome,
      categoria: p.categoria,
      marca: p.marca?.trim() || null,
      unidade: p.unidade?.trim() || null,
      preco_custo: p.precoCusto,
      preco_venda: p.precoVenda,
      estoque_minimo: p.estoqueMinimo,
      retornavel: p.retornavel,
      estoque_cheio: p.estoqueCheio,
      estoque_vazio: p.estoqueVazio,
      custo_casco: p.custoCasco,
      custo_envase: p.custoEnvase,
    };
    const existe = produtos.some((x) => x.id === p.id);
    const { error } = existe
      ? await supabase.from("products").update(linha).eq("id", p.id)
      : await supabase.from("products").insert(linha);
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

  // Entrada de mercadoria cheia vinda do fornecedor/envasadora (Chegada no Depósito)
  const entradaMut = useMutacao<{ id: string; qtd: number }>(async ({ id, qtd }) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    await patch(id, { estoque_cheio: Math.max(0, p.estoqueCheio + qtd) });
    await logar({
      produtoId: id,
      tipo: "entrada",
      qtd,
      motivo: `Entrada de estoque cheio · ${p.nome}`,
      deltaCheio: qtd,
      deltaPatrimonio: 0,
    });
  }, "Não foi possível registrar a entrada");

  // Envio de vasilhames vazios para a envasadora (Apenas baixa nos vazios do pátio)
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
    });
  }, "Não foi possível registrar envio de vasilhames");

  // Compra/Aporte de NOVOS vasilhames (Aumenta o patrimônio total)
  const comprarMut = useMutacao<{ id: string; qtd: number }>(async ({ id, qtd }) => {
    const p = produtos.find((x) => x.id === id);
    if (!p) return;
    await patch(id, {
      estoque_vazio: p.estoqueVazio + qtd,
    });
    await logar({
      produtoId: id,
      tipo: "entrada",
      qtd,
      motivo: `Compra / Aporte de novos vasilhames (Patrimônio) · ${p.nome}`,
      deltaVazio: qtd,
      deltaPatrimonio: qtd,
    });
  }, "Não foi possível registrar a compra de vasilhames");

  // Retorno sem envase (Caso o casco tenha voltado da envasadora sem ser cheio)
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
      deltaPatrimonio: 0,
    });
  }, "Não foi possível registrar o retorno da fonte");

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

      await patch(produtoId,
        cheio
          ? { estoque_cheio: p.estoqueCheio - perdidos }
          : { estoque_vazio: p.estoqueVazio - perdidos },
      );

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
        deltaPatrimonio: -perdidos,
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
      });
    },
    "Não foi possível registrar a devolução",
  );

  const aplicarVenda = async (itens: ItemBaixa[], vaziosRecolhidos: number, sinal: 1 | -1) => {
    const refis = itens.filter(
      (i) => (i.modo ?? "refil") === "refil" && produtos.find((p) => p.id === i.produtoId)?.retornavel,
    );
    const totalRefil = refis.reduce((s, i) => s + i.qtd, 0);

    for (const item of itens) {
      const p = produtos.find((x) => x.id === item.produtoId);
      if (!p) continue;
      const modo: ModoVenda = p.retornavel ? (item.modo ?? "refil") : "refil";
      let cheio = p.estoqueCheio;
      let vazio = p.estoqueVazio;
      let deltaCheio = 0;
      let deltaVazio = 0;
      let deltaPatrimonio = 0;

      if (modo === "casco") {
        deltaVazio = -item.qtd * sinal;
        deltaPatrimonio = -item.qtd * sinal;
      } else if (modo === "completa") {
        deltaCheio = -item.qtd * sinal;
        deltaPatrimonio = -item.qtd * sinal;
      } else {
        deltaCheio = -item.qtd * sinal;
        if (p.retornavel && totalRefil > 0 && vaziosRecolhidos > 0) {
          deltaVazio = Math.round((item.qtd / totalRefil) * vaziosRecolhidos) * sinal;
        }
      }

      cheio = Math.max(0, cheio + deltaCheio);
      vazio = Math.max(0, vazio + deltaVazio);
      await patch(p.id, { estoque_cheio: cheio, estoque_vazio: vazio });

      if (p.retornavel) {
        await logar({
          produtoId: p.id,
          tipo: sinal === 1 ? (modo === "refil" ? "recolhido" : modo === "casco" ? "venda_casco" : "venda_completa") : "estorno",
          qtd: item.qtd,
          motivo:
            sinal === 1
              ? `Venda (${modo}) · ${p.nome}`
              : `Estorno de venda cancelada (${modo}) · ${p.nome}`,
          deltaCheio,
          deltaVazio,
          deltaPatrimonio,
        });
      }
    }
  };

  const baixaMut = useMutacao<{ itens: ItemBaixa[]; vaziosRecolhidos: number }>(
    async ({ itens, vaziosRecolhidos }) => aplicarVenda(itens, vaziosRecolhidos, 1),
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

  return (
    <EstoqueContext.Provider
      value={{
        produtos,
        movimentos,
        carregando: isLoading,
        salvar: (p) => salvarMut.mutate(p),
        remover: (id) => removerMut.mutate(id),
        entradaEstoque: (id, qtd) => entradaMut.mutate({ id, qtd }),
        moverVazios: (id, qtd) => vaziosMut.mutate({ id, qtd }),
        comprarVasilhames: (id, qtd) => comprarMut.mutateAsync({ id, qtd }).then(() => undefined),
        retornoSemEnvase: (id, qtd) => retornoMut.mutateAsync({ id, qtd }).then(() => undefined),
        registrarAvaria: (dados) => avariaMut.mutateAsync(dados).then(() => undefined),
        devolucaoCliente: (produtoId, qtd, clienteId) =>
          devolucaoMut.mutateAsync({ produtoId, qtd, clienteId }).then(() => undefined),
        estornarVenda: (itens, vaziosRecolhidos) =>
          estornoMut.mutateAsync({ itens, vaziosRecolhidos }).then(() => undefined),
        baixaVenda: (itens, vaziosRecolhidos) => baixaMut.mutate({ itens, vaziosRecolhidos }),
      }}
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
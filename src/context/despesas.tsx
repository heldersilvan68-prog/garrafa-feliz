import type React from "react";
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraDespesa, type DespesaRow } from "@/lib/mapeadores";
import { buscarTodos } from "@/lib/supabase-paginado";
import { dataRecorrente, HORIZONTE_RECORRENCIA, type Despesa } from "@/lib/despesas";
import { isoLocal } from "@/lib/periodo";

type NovaDespesa = Omit<
  Despesa,
  "id" | "criadoEm" | "recorrenciaId" | "recorrenciaDia" | "recorrenciaMeses" | "recorrenciaParcela"
>;

export type Recorrencia = { dia: number; meses?: number };

type Ctx = {
  despesas: Despesa[];
  categorias: { id: string; nome: string; cor: string }[];
  carregando: boolean;
  adicionarDespesa: (d: NovaDespesa, recorrencia?: Recorrencia) => void;
  atualizarDespesa: (id: string, d: NovaDespesa) => void;
  removerDespesa: (id: string) => void;
  criarCategoria: (nome: string) => Promise<string>;
  renomearCategoria: (id: string, nome: string) => Promise<void>;
  removerCategoria: (id: string) => Promise<void>;
};

const DespesasContext = (((globalThis as Record<string, unknown>).__ctx_DespesasContext ??= createContext<Ctx | null>(null)) as React.Context<Ctx | null>);

export function DespesasProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["despesas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [despesasArr, categoriasRes] = await Promise.all([
        buscarTodos<DespesaRow>((de, ate) =>
          supabase
            .from("expenses")
            .select("*")
            .order("data", { ascending: false })
            .range(de, ate),
        ),
        supabase.from("expense_categories").select("*").order("nome"),
      ]);
      if (categoriasRes.error) throw categoriasRes.error;
      return {
        despesas: despesasArr.map(paraDespesa),
        categorias: (categoriasRes.data ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          cor: c.cor,
        })),
      };
    },
  });

  const invalidar = () => {
    // Despesas afetam saldos e o extrato do caixa: recarrega os dois.
    queryClient.invalidateQueries({ queryKey: ["despesas"] });
    queryClient.invalidateQueries({ queryKey: ["caixa"] });
  };

  const useMutacao = <T,>(fn: (v: T) => Promise<void>, erro: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: invalidar,
      onError: (e: Error) => toast.error(`${erro}: ${e.message}`),
    });

  const linhaDe = (d: NovaDespesa) => ({
    descricao: d.descricao,
    categoria: d.categoria,
    category_id: data?.categorias.find((c) => c.nome === d.categoria)?.id ?? null,
    valor: d.valor,
    data: d.data,
    forma: d.forma,
    status: d.status,
    observacoes: d.observacoes ?? null,
  });

  const adicionarMut = useMutacao<{ d: NovaDespesa; rec?: Recorrencia }>(async ({ d, rec }) => {
    if (!userId) throw new Error("Sessão expirada");
    if (!rec) {
      const { error } = await supabase.from("expenses").insert({ user_id: userId, ...linhaDe(d) });
      if (error) throw error;
      return;
    }
    const serie = crypto.randomUUID();
    const qtd = rec.meses ?? HORIZONTE_RECORRENCIA;
    const linhas = Array.from({ length: qtd }, (_, k) => ({
      user_id: userId,
      ...linhaDe(d),
      data: k === 0 ? d.data : dataRecorrente(d.data, k, rec.dia),
      status: k === 0 ? d.status : ("Pendente" as const),
      recorrencia_id: serie,
      recorrencia_dia: rec.dia,
      recorrencia_meses: rec.meses ?? null,
      recorrencia_parcela: k + 1,
    }));
    const { error } = await supabase.from("expenses").insert(linhas);
    if (error) throw error;
  }, "Não foi possível salvar a despesa");

  // Recorrências indefinidas: mantém sempre ~12 meses gerados à frente.
  const completando = useRef(false);
  useEffect(() => {
    if (!userId || !data || completando.current) return;
    const series = new Map<string, Despesa>();
    for (const x of data.despesas) {
      if (!x.recorrenciaId || x.recorrenciaMeses) continue;
      const atual = series.get(x.recorrenciaId);
      if (!atual || (x.recorrenciaParcela ?? 0) > (atual.recorrenciaParcela ?? 0)) series.set(x.recorrenciaId, x);
    }
    const limite = dataRecorrente(isoLocal(new Date()), HORIZONTE_RECORRENCIA - 1, 31);
    const novas: Record<string, unknown>[] = [];
    for (const ult of series.values()) {
      const dia = ult.recorrenciaDia ?? Number(ult.data.slice(8, 10));
      let k = 1;
      let prox = dataRecorrente(ult.data, k, dia);
      while (prox <= limite && k <= 24) {
        novas.push({
          user_id: userId,
          descricao: ult.descricao,
          categoria: ult.categoria,
          category_id: data.categorias.find((c) => c.nome === ult.categoria)?.id ?? null,
          valor: ult.valor,
          data: prox,
          forma: ult.forma,
          status: "Pendente",
          observacoes: ult.observacoes ?? null,
          recorrencia_id: ult.recorrenciaId,
          recorrencia_dia: dia,
          recorrencia_meses: null,
          recorrencia_parcela: (ult.recorrenciaParcela ?? 1) + k,
        });
        k++;
        prox = dataRecorrente(ult.data, k, dia);
      }
    }
    if (novas.length === 0) return;
    completando.current = true;
    void supabase
      .from("expenses")
      .insert(novas as never)
      .then(({ error }) => {
        completando.current = false;
        if (!error) invalidar();
      });
  }, [userId, data]);

  const atualizarMut = useMutacao<{ id: string; d: NovaDespesa }>(async ({ id, d }) => {
    const { error } = await supabase.from("expenses").update(linhaDe(d)).eq("id", id);
    if (error) throw error;
  }, "Não foi possível atualizar a despesa");

  const categoriaMut = useMutation({
    mutationFn: async (nome: string) => {
      if (!userId) throw new Error("Sessão expirada");
      const limpo = nome.trim();
      if (!limpo) throw new Error("Informe o nome da categoria");
      const existente = data?.categorias.find(
        (c) => c.nome.toLowerCase() === limpo.toLowerCase(),
      );
      if (existente) return existente.nome;
      const { error } = await supabase
        .from("expense_categories")
        .insert({ user_id: userId, nome: limpo, cor: "var(--color-primary)" });
      if (error) throw error;
      return limpo;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(`Não foi possível criar a categoria: ${e.message}`),
  });

  const removerMut = useMutacao<string>(async (id) => {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) throw error;
  }, "Não foi possível remover a despesa");

  const renomearCategoriaMut = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const limpo = nome.trim();
      if (!limpo) throw new Error("Informe o nome da categoria");
      const anterior = data?.categorias.find((c) => c.id === id)?.nome;
      const { error } = await supabase
        .from("expense_categories")
        .update({ nome: limpo })
        .eq("id", id);
      if (error) throw error;
      // Mantém as despesas coerentes com o novo nome.
      if (anterior) {
        await supabase.from("expenses").update({ categoria: limpo }).eq("category_id", id);
      }
    },
    onSuccess: () => {
      invalidar();
      toast.success("Categoria atualizada!");
    },
    onError: (e: Error) => toast.error(`Não foi possível renomear: ${e.message}`),
  });

  const removerCategoriaMut = useMutation({
    mutationFn: async (id: string) => {
      // Controle total: exclui mesmo em uso; as despesas antigas mantêm o nome histórico.
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Categoria excluída!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valor = useMemo<Ctx>(
    () => ({
      despesas: data?.despesas ?? [],
      categorias: data?.categorias ?? [],
      carregando: isLoading,
      adicionarDespesa: (d, rec) => adicionarMut.mutate({ d, rec }),
      atualizarDespesa: (id, d) => atualizarMut.mutate({ id, d }),
      removerDespesa: (id) => removerMut.mutate(id),
      criarCategoria: (nome) => categoriaMut.mutateAsync(nome),
      renomearCategoria: (id, nome) =>
        renomearCategoriaMut.mutateAsync({ id, nome }).then(() => undefined),
      removerCategoria: (id) => removerCategoriaMut.mutateAsync(id).then(() => undefined),
    }),
    [data?.despesas, data?.categorias, isLoading, adicionarMut.mutate, atualizarMut.mutate, removerMut.mutate, categoriaMut.mutateAsync, renomearCategoriaMut.mutateAsync, removerCategoriaMut.mutateAsync],
  );

  return (
    <DespesasContext.Provider
      value={valor}
    >
      {children}
    </DespesasContext.Provider>
  );
}

export function useDespesas() {
  const ctx = useContext(DespesasContext);
  if (!ctx) throw new Error("useDespesas precisa estar dentro de DespesasProvider");
  return ctx;
}

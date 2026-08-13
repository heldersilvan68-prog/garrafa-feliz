import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraDespesa, type DespesaRow } from "@/lib/mapeadores";
import type { Despesa } from "@/lib/despesas";

type NovaDespesa = Omit<Despesa, "id" | "criadoEm">;

type Ctx = {
  despesas: Despesa[];
  categorias: { id: string; nome: string; cor: string }[];
  carregando: boolean;
  adicionarDespesa: (d: NovaDespesa) => void;
  atualizarDespesa: (id: string, d: NovaDespesa) => void;
  removerDespesa: (id: string) => void;
  criarCategoria: (nome: string) => Promise<string>;
  renomearCategoria: (id: string, nome: string) => Promise<void>;
  removerCategoria: (id: string) => Promise<void>;
};

const DespesasContext = createContext<Ctx | null>(null);

export function DespesasProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["despesas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [despesas, categorias] = await Promise.all([
        supabase.from("expenses").select("*").order("data", { ascending: false }),
        supabase.from("expense_categories").select("*").order("nome"),
      ]);
      if (despesas.error) throw despesas.error;
      if (categorias.error) throw categorias.error;
      return {
        despesas: ((despesas.data ?? []) as DespesaRow[]).map(paraDespesa),
        categorias: (categorias.data ?? []).map((c) => ({
          id: c.id,
          nome: c.nome,
          cor: c.cor,
        })),
      };
    },
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["despesas"] });

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

  const adicionarMut = useMutacao<NovaDespesa>(async (d) => {
    if (!userId) throw new Error("Sessão expirada");
    const { error } = await supabase.from("expenses").insert({ user_id: userId, ...linhaDe(d) });
    if (error) throw error;
  }, "Não foi possível salvar a despesa");

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
      const emUso = (data?.despesas ?? []).some(
        (d) => d.categoria === data?.categorias.find((c) => c.id === id)?.nome,
      );
      if (emUso) throw new Error("Existem despesas usando esta categoria.");
      const { error } = await supabase.from("expense_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Categoria excluída!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <DespesasContext.Provider
      value={{
        despesas: data?.despesas ?? [],
        categorias: data?.categorias ?? [],
        carregando: isLoading,
        adicionarDespesa: (d) => adicionarMut.mutate(d),
        atualizarDespesa: (id, d) => atualizarMut.mutate({ id, d }),
        removerDespesa: (id) => removerMut.mutate(id),
        criarCategoria: (nome) => categoriaMut.mutateAsync(nome),
        renomearCategoria: (id, nome) =>
          renomearCategoriaMut.mutateAsync({ id, nome }).then(() => undefined),
        removerCategoria: (id) => removerCategoriaMut.mutateAsync(id).then(() => undefined),
      }}
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

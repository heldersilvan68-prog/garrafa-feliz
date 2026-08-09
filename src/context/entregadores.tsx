import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BALCAO, type Entregador, type TipoEntregador } from "@/lib/entregadores";

type Ctx = {
  entregadores: Entregador[];
  /** Nomes disponíveis para seleção em pedidos (balcão + ativos). */
  opcoes: string[];
  carregando: boolean;
  salvar: (e: Omit<Entregador, "id"> & { id?: string }) => Promise<void>;
  remover: (id: string) => Promise<void>;
};

const EntregadoresContext = createContext<Ctx | null>(null);

export function EntregadoresProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: entregadores = [], isLoading } = useQuery({
    queryKey: ["entregadores", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deliverers")
        .select("*")
        .order("nome", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (r): Entregador => ({
          id: r.id,
          nome: r.nome,
          telefone: r.telefone,
          documento: r.documento ?? undefined,
          tipo: r.tipo as TipoEntregador,
          ativo: r.ativo,
          observacoes: r.observacoes ?? undefined,
        }),
      );
    },
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["entregadores"] });

  const salvarMut = useMutation({
    mutationFn: async (e: Omit<Entregador, "id"> & { id?: string }) => {
      if (!userId) throw new Error("Sessão expirada");
      const linha = {
        user_id: userId,
        nome: e.nome.trim(),
        telefone: e.telefone.trim(),
        documento: e.documento?.trim() || null,
        tipo: e.tipo,
        ativo: e.ativo,
        observacoes: e.observacoes?.trim() || null,
      };
      const { error } = e.id
        ? await supabase.from("deliverers").update(linha).eq("id", e.id)
        : await supabase.from("deliverers").insert(linha);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(`Não foi possível salvar o cadastro: ${e.message}`),
  });

  const removerMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("deliverers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(`Não foi possível excluir o cadastro: ${e.message}`),
  });

  const opcoes = [
    BALCAO,
    ...entregadores.filter((e) => e.ativo && e.tipo === "entregador").map((e) => e.nome),
    ...entregadores.filter((e) => e.ativo && e.tipo === "auxiliar").map((e) => e.nome),
  ];

  return (
    <EntregadoresContext.Provider
      value={{
        entregadores,
        opcoes,
        carregando: isLoading,
        salvar: (e) => salvarMut.mutateAsync(e).then(() => undefined),
        remover: (id) => removerMut.mutateAsync(id).then(() => undefined),
      }}
    >
      {children}
    </EntregadoresContext.Provider>
  );
}

export function useEntregadores() {
  const ctx = useContext(EntregadoresContext);
  if (!ctx) throw new Error("useEntregadores precisa estar dentro de EntregadoresProvider");
  return ctx;
}

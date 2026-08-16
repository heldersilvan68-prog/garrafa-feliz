import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/** Tabelas auxiliares (cadastros rápidos) usadas nos selects do sistema. */
export type TipoAuxiliar = "categorias" | "marcas" | "unidades";

const TABELA: Record<TipoAuxiliar, "product_categories" | "product_brands" | "product_units"> = {
  categorias: "product_categories",
  marcas: "product_brands",
  unidades: "product_units",
};

export const LABEL_AUXILIAR: Record<TipoAuxiliar, string> = {
  categorias: "Categoria",
  marcas: "Marca",
  unidades: "Unidade de medida",
};

export type ItemAuxiliar = { id: string; nome: string };

type Ctx = {
  categorias: ItemAuxiliar[];
  marcas: ItemAuxiliar[];
  unidades: ItemAuxiliar[];
  carregando: boolean;
  lista: (t: TipoAuxiliar) => ItemAuxiliar[];
  criar: (t: TipoAuxiliar, nome: string) => Promise<string>;
  renomear: (t: TipoAuxiliar, id: string, nome: string) => Promise<void>;
  remover: (t: TipoAuxiliar, id: string) => Promise<void>;
};

const CatalogoContext = createContext<Ctx | null>(null);

export function CatalogoProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const carregar = (t: TipoAuxiliar) =>
    useQuery({
      queryKey: ["auxiliares", t, userId],
      enabled: !!userId,
      queryFn: async () => {
        const { data, error } = await supabase
          .from(TABELA[t])
          .select("id, nome")
          .order("nome", { ascending: true });
        if (error) throw error;
        return (data ?? []) as ItemAuxiliar[];
      },
    });

  const qCategorias = carregar("categorias");
  const qMarcas = carregar("marcas");
  const qUnidades = carregar("unidades");

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["auxiliares"] });

  const criarMut = useMutation({
    mutationFn: async ({ tipo, nome }: { tipo: TipoAuxiliar; nome: string }) => {
      if (!userId) throw new Error("Sessão expirada");
      const limpo = nome.trim();
      if (!limpo) throw new Error("Informe um nome");
      const { data, error } = await supabase
        .from(TABELA[tipo])
        .insert({ user_id: userId, nome: limpo })
        .select("nome")
        .single();
      if (error) throw error;
      return (data as { nome: string }).nome;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Cadastro criado!");
    },
    onError: (e: Error) => toast.error(`Não foi possível criar: ${e.message}`),
  });

  const renomearMut = useMutation({
    mutationFn: async ({ tipo, id, nome }: { tipo: TipoAuxiliar; id: string; nome: string }) => {
      const limpo = nome.trim();
      if (!limpo) throw new Error("Informe um nome");
      const anterior = (lista(tipo).find((x) => x.id === id) ?? { nome: "" }).nome;
      const { error } = await supabase.from(TABELA[tipo]).update({ nome: limpo }).eq("id", id);
      if (error) throw error;
      // Mantém os produtos coerentes com o novo nome.
      if (tipo === "categorias") await supabase.from("products").update({ categoria: limpo }).eq("categoria", anterior);
      if (tipo === "marcas") await supabase.from("products").update({ marca: limpo }).eq("marca", anterior);
      if (tipo === "unidades") await supabase.from("products").update({ unidade: limpo }).eq("unidade", anterior);
    },
    onSuccess: () => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success("Cadastro atualizado!");
    },
    onError: (e: Error) => toast.error(`Não foi possível renomear: ${e.message}`),
  });

  const removerMut = useMutation({
    mutationFn: async ({ tipo, id }: { tipo: TipoAuxiliar; id: string }) => {
      const item = lista(tipo).find((x) => x.id === id);
      if (!item) return 0;
      const coluna = tipo === "categorias" ? "categoria" : tipo === "marcas" ? "marca" : "unidade";
      // Controle total: exclui mesmo em uso e apenas desvincula os produtos afetados.
      const { count, error: erroVinculo } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq(coluna, item.nome);
      if (erroVinculo) throw erroVinculo;
      if ((count ?? 0) > 0) {
        const { error: erroLimpeza } = await supabase
          .from("products")
          .update(coluna === "categoria" ? { categoria: "Sem categoria" } : { [coluna]: null })
          .eq(coluna, item.nome);
        if (erroLimpeza) throw erroLimpeza;
      }
      const { error } = await supabase.from(TABELA[tipo]).delete().eq("id", id);
      if (error) throw error;
      return count ?? 0;
    },
    onSuccess: (afetados) => {
      invalidar();
      queryClient.invalidateQueries({ queryKey: ["produtos"] });
      toast.success(
        afetados && afetados > 0
          ? `Cadastro excluído! ${afetados} produto(s) foram desvinculados.`
          : "Cadastro excluído!",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const categorias = qCategorias.data ?? [];
  const marcas = qMarcas.data ?? [];
  const unidades = qUnidades.data ?? [];

  function lista(t: TipoAuxiliar) {
    return t === "categorias" ? categorias : t === "marcas" ? marcas : unidades;
  }

  return (
    <CatalogoContext.Provider
      value={{
        categorias,
        marcas,
        unidades,
        carregando: qCategorias.isLoading || qMarcas.isLoading || qUnidades.isLoading,
        lista,
        criar: (tipo, nome) => criarMut.mutateAsync({ tipo, nome }),
        renomear: (tipo, id, nome) => renomearMut.mutateAsync({ tipo, id, nome }),
        remover: (tipo, id) => removerMut.mutateAsync({ tipo, id }).then(() => undefined),
      }}
    >
      {children}
    </CatalogoContext.Provider>
  );
}

export function useCatalogo() {
  const ctx = useContext(CatalogoContext);
  if (!ctx) throw new Error("useCatalogo precisa estar dentro de CatalogoProvider");
  return ctx;
}

import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraCliente, type ClienteRow, type CompraRow } from "@/lib/mapeadores";
import { ordenarPorCodigo, type Cliente } from "@/lib/clientes";

type Ctx = {
  clientes: Cliente[];
  carregando: boolean;
  salvar: (c: Cliente) => void;
  remover: (id: string) => void;
  registrarCompra: (id: string, descricao: string, valor: number, data: string) => void;
  ajustarDivida: (id: string, delta: number) => void;
  /** Define o saldo devedor exato do cliente (sincronização com os fiados em aberto). */
  definirDivida: (id: string, valor: number) => void;
  /** Ajusta os cascos que o cliente tem na rua (positivo = levou, negativo = devolveu). */
  ajustarVasilhames: (id: string, delta: number) => Promise<void>;
  /** Ajusta o saldo de vales do cliente (positivo = comprou pacote, negativo = resgatou). */
  ajustarVales: (id: string, delta: number) => Promise<void>;
  /** Importa clientes em lote (planilha CSV), preservando código e data de cadastro. */
  importar: (lista: ClienteImportado[]) => Promise<number>;
};

/** Registro mínimo aceito na importação de clientes por CSV. */
export type ClienteImportado = {
  codigo?: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  bairro?: string;
  cadastradoEm?: string;
};

const ClientesContext = createContext<Ctx | null>(null);

export function ClientesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ["clientes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: linhas, error }, { data: compras, error: erroCompras }] = await Promise.all([
        supabase.from("clients").select("*").order("nome", { ascending: true }),
        supabase.from("client_purchases").select("*"),
      ]);
      if (error) throw error;
      if (erroCompras) throw erroCompras;
      // Ordem global: código numérico crescente (1, 2, 3... 10, 11).
      return ordenarPorCodigo(
        (linhas as ClienteRow[]).map((l) => paraCliente(l, (compras ?? []) as CompraRow[])),
      );
    },
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["clientes"] });

  const useMutacao = <T,>(fn: (v: T) => Promise<void>, erro: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: invalidar,
      onError: (e: Error) => toast.error(`${erro}: ${e.message}`),
    });

  const salvarMut = useMutacao<Cliente>(async (c) => {
    if (!userId) throw new Error("Sessão expirada");
    const linha = {
      user_id: userId,
      code: c.codigo?.trim() || null,
      nome: c.nome,
      telefone: c.telefone,
      endereco: c.endereco,
      bairro: c.bairro ?? null,
      documento: c.documento ?? null,
      divida: c.divida ?? 0,
      vasilhames_rua: c.vasilhamesRua ?? 0,
      vales_saldo: Math.max(0, Math.round(c.valesSaldo ?? 0)),
      consumo_medio_dias: c.consumoMedioDias,
      ultima_compra: c.ultimaCompra,
    };
    const existe = clientes.some((x) => x.id === c.id);
    const { error } = existe
      ? await supabase.from("clients").update(linha).eq("id", c.id)
      : await supabase.from("clients").insert(linha);
    if (error) throw error;
  }, "Não foi possível salvar o cliente");

  const removerMut = useMutacao<string>(async (id) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
  }, "Não foi possível remover o cliente");

  const compraMut = useMutacao<{
    id: string;
    descricao: string;
    valor: number;
    data: string;
  }>(async ({ id, descricao, valor, data }) => {
    if (!userId) throw new Error("Sessão expirada");
    const { error } = await supabase
      .from("client_purchases")
      .insert({ user_id: userId, client_id: id, descricao, valor, data });
    if (error) throw error;
    const { error: erroCliente } = await supabase
      .from("clients")
      .update({ ultima_compra: data })
      .eq("id", id);
    if (erroCliente) throw erroCliente;
  }, "Não foi possível registrar a compra");

  const dividaMut = useMutacao<{ id: string; delta: number }>(async ({ id, delta }) => {
    const atual = clientes.find((c) => c.id === id)?.divida ?? 0;
    const { error } = await supabase
      .from("clients")
      .update({ divida: Math.max(0, atual + delta) })
      .eq("id", id);
    if (error) throw error;
  }, "Não foi possível atualizar a caderneta");

  const definirDividaMut = useMutacao<{ id: string; valor: number }>(async ({ id, valor }) => {
    const { error } = await supabase
      .from("clients")
      .update({ divida: Math.max(0, Math.round(valor * 100) / 100) })
      .eq("id", id);
    if (error) throw error;
  }, "Não foi possível atualizar a caderneta");

  const vasilhamesMut = useMutacao<{ id: string; delta: number }>(async ({ id, delta }) => {
    const atual = clientes.find((c) => c.id === id)?.vasilhamesRua ?? 0;
    const { error } = await supabase
      .from("clients")
      .update({ vasilhames_rua: Math.max(0, atual + delta) })
      .eq("id", id);
    if (error) throw error;
  }, "Não foi possível atualizar os vasilhames do cliente");

  const valesMut = useMutacao<{ id: string; delta: number }>(async ({ id, delta }) => {
    const atual = clientes.find((c) => c.id === id)?.valesSaldo ?? 0;
    const { error } = await supabase
      .from("clients")
      .update({ vales_saldo: Math.max(0, atual + delta) })
      .eq("id", id);
    if (error) throw error;
  }, "Não foi possível atualizar o saldo de vales");

  const importarMut = useMutation({
    mutationFn: async (lista: ClienteImportado[]) => {
      if (!userId) throw new Error("Sessão expirada");
      const hoje = new Date().toISOString().slice(0, 10);
      const linhas = lista
        .filter((c) => c.nome?.trim())
        .map((c) => ({
          user_id: userId,
          code: c.codigo?.trim() || null,
          nome: c.nome.trim(),
          telefone: c.telefone?.trim() || "",
          endereco: c.endereco?.trim() || "",
          bairro: c.bairro?.trim() || null,
          consumo_medio_dias: 7,
          cadastrado_em: c.cadastradoEm?.trim() || hoje,
          ultima_compra: c.cadastradoEm?.trim() || hoje,
        }));
      if (linhas.length === 0) return 0;
      const { error } = await supabase.from("clients").insert(linhas);
      if (error) throw error;
      return linhas.length;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(`Falha na importação: ${e.message}`),
  });

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        carregando: isLoading,
        salvar: (c) => salvarMut.mutate(c),
        remover: (id) => removerMut.mutate(id),
        registrarCompra: (id, descricao, valor, data) =>
          compraMut.mutate({ id, descricao, valor, data }),
        ajustarDivida: (id, delta) => dividaMut.mutate({ id, delta }),
        ajustarVasilhames: (id, delta) =>
          vasilhamesMut.mutateAsync({ id, delta }).then(() => undefined),
        ajustarVales: (id, delta) => valesMut.mutateAsync({ id, delta }).then(() => undefined),
        importar: (lista) => importarMut.mutateAsync(lista),
      }}
    >
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const ctx = useContext(ClientesContext);
  if (!ctx) throw new Error("useClientes precisa estar dentro de ClientesProvider");
  return ctx;
}

import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraCliente, type ClienteRow, type CompraRow } from "@/lib/mapeadores";
import type { Cliente } from "@/lib/clientes";

type Ctx = {
  clientes: Cliente[];
  carregando: boolean;
  salvar: (c: Cliente) => void;
  remover: (id: string) => void;
  registrarCompra: (id: string, descricao: string, valor: number, data: string) => void;
  ajustarDivida: (id: string, delta: number) => void;
  /** Ajusta os cascos que o cliente tem na rua (positivo = levou, negativo = devolveu). */
  ajustarVasilhames: (id: string, delta: number) => Promise<void>;
  /** Ajusta o saldo de vales do cliente (positivo = comprou pacote, negativo = resgatou). */
  ajustarVales: (id: string, delta: number) => Promise<void>;
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
      return (linhas as ClienteRow[]).map((l) => paraCliente(l, (compras ?? []) as CompraRow[]));
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

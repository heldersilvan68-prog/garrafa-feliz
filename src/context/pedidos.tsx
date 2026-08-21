import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  paraPedido,
  type ItemPedidoRow,
  type PagamentoPedidoRow,
  type PedidoRow,
} from "@/lib/mapeadores";
import type { FormaPagamento, Pedido, StatusPedido } from "@/lib/pedidos";
import type { Database } from "@/integrations/supabase/types";

type NovoPedido = Omit<Pedido, "id" | "numero" | "criadoEm" | "status"> & {
  /** Status inicial — vendas de balcão já entram como concluídas. */
  status?: StatusPedido;
};

type Ctx = {
  pedidos: Pedido[];
  carregando: boolean;
  criar: (p: NovoPedido) => Promise<Pedido>;
  alterarStatus: (id: string, status: StatusPedido) => void;
  atualizar: (id: string, dados: Partial<Pedido>) => void;
  cancelar: (id: string, motivo: string, observacao?: string) => void;
  darBaixa: (id: string, forma: FormaPagamento) => void;
};

const PedidosContext = createContext<Ctx | null>(null);

export function PedidosProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data: pedidos = [], isLoading } = useQuery({
    queryKey: ["pedidos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [
        { data: linhas, error },
        { data: itens, error: erroItens },
        { data: pagos, error: erroPagos },
      ] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("*"),
        supabase.from("order_payments").select("*"),
      ]);
      if (error) throw error;
      if (erroItens) throw erroItens;
      if (erroPagos) throw erroPagos;
      return (linhas as PedidoRow[]).map((l) =>
        paraPedido(l, (itens ?? []) as ItemPedidoRow[], (pagos ?? []) as PagamentoPedidoRow[]),
      );
    },
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["pedidos"] });

  const useMutacao = <T,>(fn: (v: T) => Promise<void>, erro: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: invalidar,
      onError: (e: Error) => toast.error(`${erro}: ${e.message}`),
    });

  const criarMut = useMutation({
    mutationFn: async (dados: NovoPedido): Promise<Pedido> => {
      if (!userId) throw new Error("Sessão expirada");
      const numero = pedidos.reduce((m, p) => Math.max(m, p.numero), 1000) + 1;
      const { data: criado, error } = await supabase
        .from("orders")
        .insert({
          user_id: userId,
          numero,
          client_id: dados.clienteId || null,
          cliente_nome: dados.clienteNome,
          telefone: dados.telefone,
          endereco: dados.endereco,
          bairro: dados.bairro,
          total: dados.total,
          pagamento: dados.pagamento,
          pago: dados.pago,
          valor_fiado: dados.valorFiado ?? 0,
          troco_para: dados.trocoPara ?? null,
          vazios_recolhidos: dados.vaziosRecolhidos,
          vales_credito: dados.valesCredito ?? 0,
          vales_resgatados: dados.valesResgatados ?? 0,
          ...(dados.status ? { status: dados.status } : {}),
          entregador: dados.entregador,
          observacao: dados.observacao ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;

      if (dados.itens.length > 0) {
        const { error: erroItens } = await supabase.from("order_items").insert(
          dados.itens.map((i) => ({
            user_id: userId,
            order_id: (criado as PedidoRow).id,
            product_id: i.produtoId || null,
            nome: i.nome,
            qtd: i.qtd,
            preco_unit: i.precoUnit,
            retornavel: i.retornavel,
            modo: i.modo,
          })),
        );
        if (erroItens) throw erroItens;
      }

      if (dados.pagamentos.length > 0) {
        const { error: erroPagos } = await supabase.from("order_payments").insert(
          dados.pagamentos.map((x) => ({
            user_id: userId,
            order_id: (criado as PedidoRow).id,
            forma: x.forma,
            valor: x.valor,
          })),
        );
        if (erroPagos) throw erroPagos;
      }

      if (dados.vaziosRecolhidos > 0) {
        await supabase.from("returnable_movements").insert({
          user_id: userId,
          order_id: (criado as PedidoRow).id,
          tipo: "recolhido" as const,
          qtd: dados.vaziosRecolhidos,
        });
      }

      return {
        ...paraPedido(criado as PedidoRow, []),
        itens: dados.itens,
        pagamentos: dados.pagamentos,
      };
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(`Não foi possível criar o pedido: ${e.message}`),
  });

  const statusMut = useMutacao<{ id: string; status: StatusPedido }>(async ({ id, status }) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) throw error;
  }, "Não foi possível alterar o status");

  const atualizarMut = useMutacao<{ id: string; dados: Partial<Pedido> }>(
    async ({ id, dados }) => {
      if (!userId) throw new Error("Sessão expirada");
      const linha: Database["public"]["Tables"]["orders"]["Update"] = {};
      if (dados.clienteNome !== undefined) linha["cliente_nome"] = dados.clienteNome;
      if (dados.telefone !== undefined) linha["telefone"] = dados.telefone;
      if (dados.endereco !== undefined) linha["endereco"] = dados.endereco;
      if (dados.bairro !== undefined) linha["bairro"] = dados.bairro;
      if (dados.total !== undefined) linha["total"] = dados.total;
      if (dados.pagamento !== undefined) linha["pagamento"] = dados.pagamento;
      if (dados.pago !== undefined) linha["pago"] = dados.pago;
      if (dados.valorFiado !== undefined) linha["valor_fiado"] = dados.valorFiado;
      if (dados.trocoPara !== undefined) linha["troco_para"] = dados.trocoPara ?? null;
      if (dados.vaziosRecolhidos !== undefined)
        linha["vazios_recolhidos"] = dados.vaziosRecolhidos;
      if (dados.entregador !== undefined) linha["entregador"] = dados.entregador;
      if (dados.status !== undefined) linha["status"] = dados.status;
      if (dados.observacao !== undefined) linha["observacao"] = dados.observacao ?? null;

      if (Object.keys(linha).length > 0) {
        const { error } = await supabase.from("orders").update(linha).eq("id", id);
        if (error) throw error;
      }

      if (dados.pagamentos) {
        await supabase.from("order_payments").delete().eq("order_id", id);
        if (dados.pagamentos.length > 0) {
          const { error: erroPagos } = await supabase.from("order_payments").insert(
            dados.pagamentos.map((x) => ({
              user_id: userId,
              order_id: id,
              forma: x.forma,
              valor: x.valor,
            })),
          );
          if (erroPagos) throw erroPagos;
        }
      }

      if (dados.itens) {
        const { error: erroDelete } = await supabase
          .from("order_items")
          .delete()
          .eq("order_id", id);
        if (erroDelete) throw erroDelete;
        if (dados.itens.length > 0) {
          const { error: erroInsert } = await supabase.from("order_items").insert(
            dados.itens.map((i) => ({
              user_id: userId,
              order_id: id,
              product_id: i.produtoId || null,
              nome: i.nome,
              qtd: i.qtd,
              preco_unit: i.precoUnit,
              retornavel: i.retornavel,
              modo: i.modo,
            })),
          );
          if (erroInsert) throw erroInsert;
        }
      }
    },
    "Não foi possível atualizar o pedido",
  );

  const cancelarMut = useMutacao<{ id: string; motivo: string; observacao?: string }>(
    async ({ id, motivo, observacao }) => {
      const { error } = await supabase
        .from("orders")
        .update({
          status: "cancelado" as const,
          motivo_cancelamento: motivo,
          obs_cancelamento: observacao?.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    "Não foi possível cancelar o pedido",
  );

  const baixaMut = useMutacao<{ id: string; forma: FormaPagamento }>(async ({ id, forma }) => {
    const { error } = await supabase
      .from("orders")
      .update({
        pago: true,
        pagamento: forma,
        forma_baixa: forma,
        pago_em: new Date().toISOString(),
        valor_fiado: 0,
      })
      .eq("id", id);
    if (error) throw error;
  }, "Não foi possível dar baixa no fiado");

  return (
    <PedidosContext.Provider
      value={{
        pedidos,
        carregando: isLoading,
        criar: (p) => criarMut.mutateAsync(p),
        alterarStatus: (id, status) => statusMut.mutate({ id, status }),
        atualizar: (id, dados) => atualizarMut.mutate({ id, dados }),
        cancelar: (id, motivo, observacao) => cancelarMut.mutate({ id, motivo, observacao }),
        darBaixa: (id, forma) => baixaMut.mutate({ id, forma }),
      }}
    >
      {children}
    </PedidosContext.Provider>
  );
}

export function usePedidos() {
  const ctx = useContext(PedidosContext);
  if (!ctx) throw new Error("usePedidos precisa estar dentro de PedidosProvider");
  return ctx;
}

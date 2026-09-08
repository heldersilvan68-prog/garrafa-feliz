import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Tabelas do banco e quais consultas do app precisam ser recarregadas quando
 * elas mudam. Assim qualquer alteração (venda, baixa de fiado, despesa,
 * movimento de caixa) reflete na hora em todas as telas abertas.
 */
const MAPA: Record<string, string[]> = {
  orders: ["pedidos", "clientes"],
  order_items: ["pedidos"],
  order_payments: ["pedidos"],
  clients: ["clientes"],
  client_purchases: ["clientes"],
  expenses: ["despesas"],
  cash_registers: ["caixa"],
  cash_movements: ["caixa"],
  products: ["produtos"],
  returnable_movements: ["movimentos-vasilhames", "produtos"],
};

/**
 * Assina as mudanças do banco em tempo real e invalida as consultas
 * correspondentes — nenhuma tela precisa de F5 para mostrar o dado novo.
 */
export function useRealtimeSync() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    const canal = supabase.channel(`sync-${userId}`);

    for (const [tabela, chaves] of Object.entries(MAPA)) {
      canal.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabela },
        () => {
          for (const chave of chaves) {
            queryClient.invalidateQueries({ queryKey: [chave] });
          }
        },
      );
    }

    canal.subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, queryClient]);
}

/** Componente utilitário para ativar a sincronização dentro dos provedores. */
export function SincronizacaoRealtime() {
  useRealtimeSync();
  return null;
}

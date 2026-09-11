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
  orders: ["pedidos", "clientes", "caixa"],
  order_items: ["pedidos"],
  order_payments: ["pedidos", "caixa"],
  clients: ["clientes"],
  client_purchases: ["clientes"],
  expenses: ["despesas", "caixa"],
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

    let ativo = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pendentes = new Set<string>();
    const canal = supabase.channel(`sync-global-${userId}`);

    const agendarInvalidacao = (chaves: string[]) => {
      for (const chave of chaves) pendentes.add(chave);
      if (timer) return;
      timer = setTimeout(() => {
        timer = undefined;
        if (!ativo) return;
        const lote = [...pendentes];
        pendentes.clear();
        for (const chave of lote) {
          void queryClient.invalidateQueries({ queryKey: [chave] });
        }
      }, 150);
    };

    for (const [tabela, chaves] of Object.entries(MAPA)) {
      canal.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tabela },
        () => agendarInvalidacao(chaves),
      );
    }

    canal.subscribe();

    return () => {
      ativo = false;
      if (timer) clearTimeout(timer);
      pendentes.clear();
      void supabase.removeChannel(canal);
    };
  }, [userId, queryClient]);
}

/** Componente utilitário para ativar a sincronização dentro dos provedores. */
export function SincronizacaoRealtime() {
  useRealtimeSync();
  return null;
}

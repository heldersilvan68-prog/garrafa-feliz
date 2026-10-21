import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useClientes } from "@/context/clientes";
import { usePedidos } from "@/context/pedidos";
import { comprasDeCancelados } from "@/lib/cliente-insights";

/**
 * Remove do histórico de compras dos clientes os registros de pedidos cancelados
 * (inclui registros antigos sem vínculo direto com o pedido).
 */
export function LimpezaCancelados() {
  const { clientes, carregando: c1 } = useClientes();
  const { pedidos, carregando: c2 } = usePedidos();
  const qc = useQueryClient();
  const rodando = useRef(false);

  useEffect(() => {
    if (c1 || c2 || rodando.current || !clientes.length || !pedidos.length) return;
    const ids = clientes.flatMap((c) =>
      comprasDeCancelados(c.historico, pedidos, c.id).map((h) => h.id),
    );
    if (!ids.length) return;
    rodando.current = true;
    void (async () => {
      for (let i = 0; i < ids.length; i += 100) {
        await supabase.from("client_purchases").delete().in("id", ids.slice(i, i + 100));
      }
      await qc.invalidateQueries({ queryKey: ["clientes"] });
      rodando.current = false;
    })();
  }, [clientes, pedidos, c1, c2, qc]);

  return null;
}

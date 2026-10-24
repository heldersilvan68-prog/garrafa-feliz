import { useEffect, useRef } from "react";
import { useClientes } from "@/context/clientes";
import { usePedidos } from "@/context/pedidos";
import { useEstoque } from "@/context/estoque";
import { expandirComposicao } from "@/lib/erp";
import { saldoVasilhamesPedido } from "@/lib/vasilhames";

const CHAVE = "limpeza-vasilhames-modalidades-v1";

/**
 * Corrige o saldo de vasilhames na rua de pedidos antigos vendidos em
 * modalidade (ex.: Venda Completa): antes, o casco pago na modalidade
 * era contado como empréstimo. Roda uma vez por pedido (marca local).
 */
export function LimpezaVasilhamesModalidades() {
  const { clientes, carregando: c1, ajustarVasilhames } = useClientes();
  const { pedidos, carregando: c2 } = usePedidos();
  const { produtos, carregando: c3 } = useEstoque();
  const rodando = useRef(false);

  useEffect(() => {
    if (c1 || c2 || c3 || rodando.current || !clientes.length || !pedidos.length) return;
    let feitos: string[] = [];
    try {
      feitos = JSON.parse(localStorage.getItem(CHAVE) ?? "[]");
    } catch {
      feitos = [];
    }
    const processados = new Set(feitos);
    const pendentes = pedidos.filter(
      (p) =>
        p.status !== "cancelado" &&
        p.clienteId &&
        !processados.has(p.id) &&
        p.itens.some((i) => (i.composicao?.length ?? 0) > 0),
    );
    if (!pendentes.length) return;
    rodando.current = true;
    void (async () => {
      for (const pedido of pendentes) {
        // Lógica antiga: todo retornável expandido contava como empréstimo.
        const antigo = saldoVasilhamesPedido(
          expandirComposicao(pedido.itens, produtos).map((i) => ({ ...i, modo: "refil" as const })),
          pedido.vaziosRecolhidos,
        );
        const novo = saldoVasilhamesPedido(
          expandirComposicao(pedido.itens, produtos),
          pedido.vaziosRecolhidos,
        );
        const correcao = novo - antigo;
        if (correcao !== 0) await ajustarVasilhames(pedido.clienteId!, correcao);
        processados.add(pedido.id);
      }
      localStorage.setItem(CHAVE, JSON.stringify([...processados]));
      rodando.current = false;
    })();
  }, [clientes, pedidos, produtos, c1, c2, c3, ajustarVasilhames]);

  return null;
}

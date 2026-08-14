import { useMemo } from "react";
import { useEstoque } from "@/context/estoque";
import { usePedidos } from "@/context/pedidos";
import { useDespesas } from "@/context/despesas";
import { useConfiguracoes } from "@/context/configuracoes";
import { calcularResumo } from "@/lib/dashboard";
import type { Faixa } from "@/lib/periodo";

/**
 * Indicadores calculados a partir dos dados reais (pedidos, despesas e produtos).
 * É a única fonte de KPIs do sistema — Dashboard, Financeiro e Relatórios usam este hook.
 */
export function useResumo(faixa: Faixa) {
  const { pedidos, carregando: carregandoPedidos } = usePedidos();
  const { despesas, carregando: carregandoDespesas } = useDespesas();
  const { produtos, carregando: carregandoProdutos } = useEstoque();
  const { config } = useConfiguracoes();

  const resumo = useMemo(
    () =>
      calcularResumo(faixa, pedidos, despesas, produtos, {
        metaVendas: config.metaVendasMensal,
      }),
    [faixa, pedidos, despesas, produtos, config.metaVendasMensal],
  );

  return {
    resumo,
    carregando: carregandoPedidos || carregandoDespesas || carregandoProdutos,
    pedidos,
    despesas,
    produtos,
  };
}

import type { Caixa } from "@/lib/caixa";
import type { Despesa } from "@/lib/despesas";
import { calcularMovimento } from "@/lib/financas";
import type { Pedido } from "@/lib/pedidos";
import { FIM_TUDO, INICIO_TUDO } from "@/lib/periodo";

export type SaldosGerais = {
  /** Dinheiro físico disponível na gaveta. */
  especie: number;
  /** Saldo líquido em PIX/cartões (contas digitais). */
  conta: number;
  /** Espécie + conta. */
  total: number;
  // Componentes (para exibir detalhamento)
  vendasDinheiro: number;
  suprimentos: number;
  sangrias: number;
  saidasDinheiro: number;
  vendasPix: number;
  vendasCartao: number;
  taxasCartao: number;
  saidasConta: number;
};

const arred = (v: number) => Math.round(v * 100) / 100;

/**
 * Saldo acumulado em tempo real por conta (caixa físico x conta digital),
 * calculado pela mesma função financeira usada no Dashboard e no Caixa.
 */
export function calcularSaldos(
  pedidos: Pedido[],
  despesas: Despesa[],
  caixas: Caixa[],
): SaldosGerais {
  const m = calcularMovimento(
    { inicio: INICIO_TUDO, fim: FIM_TUDO },
    pedidos,
    despesas,
    caixas,
  );

  const vendasDinheiro = m.vendasDinheiro + m.recebimentosDinheiro;
  const vendasPix = m.vendasPix + m.recebimentosPix;
  const vendasCartao = m.vendasCartao + m.recebimentosCartao;
  const saidasConta = m.saidasPix + m.saidasCartao;

  const especie = arred(vendasDinheiro + m.suprimentos - m.sangrias - m.saidasDinheiro);
  const conta = arred(vendasPix + vendasCartao - m.taxasCartao - saidasConta);

  return {
    especie,
    conta,
    total: arred(especie + conta),
    vendasDinheiro: arred(vendasDinheiro),
    suprimentos: m.suprimentos,
    sangrias: m.sangrias,
    saidasDinheiro: m.saidasDinheiro,
    vendasPix: arred(vendasPix),
    vendasCartao: arred(vendasCartao),
    taxasCartao: m.taxasCartao,
    saidasConta: arred(saidasConta),
  };
}

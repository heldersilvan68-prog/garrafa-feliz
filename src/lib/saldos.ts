import type { Caixa } from "@/lib/caixa";
import type { Despesa } from "@/lib/despesas";
import { calcularMovimento } from "@/lib/financas";
import type { Pedido } from "@/lib/pedidos";
import { liquidacaoCartao } from "@/lib/liquidacao";
import { FIM_TUDO, INICIO_TUDO, type Faixa } from "@/lib/periodo";

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
  /** Líquido do cartão já liquidado (D+1 útil). */
  cartaoLiquidado: number;
  /** Líquido do cartão aguardando liquidação D+1 útil. */
  cartaoAReceber: number;
};

const arred = (v: number) => Math.round(v * 100) / 100;

/** Faixa que abrange todo o histórico (comportamento padrão). */
export const FAIXA_TUDO: Faixa = { inicio: INICIO_TUDO, fim: FIM_TUDO };

/**
 * Saldo por conta (caixa físico x conta digital), calculado pela mesma
 * função financeira usada no Dashboard e no Caixa. Quando uma faixa é
 * informada, somente as movimentações dentro dela entram no cálculo.
 */
export function calcularSaldos(
  pedidos: Pedido[],
  despesas: Despesa[],
  caixas: Caixa[],
  faixa: Faixa = FAIXA_TUDO,
): SaldosGerais {
  const m = calcularMovimento(faixa, pedidos, despesas, caixas);

  const vendasDinheiro = m.vendasDinheiro + m.recebimentosDinheiro;
  const vendasPix = m.vendasPix + m.recebimentosPix;
  const vendasCartao = m.vendasCartao + m.recebimentosCartao;
  const saidasConta = m.saidasPix + m.saidasCartao;

  const especie = arred(vendasDinheiro + m.suprimentos - m.sangrias - m.saidasDinheiro);
  const cartao = liquidacaoCartao(pedidos, despesas, caixas, undefined, faixa);
  const conta = arred(vendasPix + cartao.liquidado - saidasConta);

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
    cartaoLiquidado: cartao.liquidado,
    cartaoAReceber: cartao.aReceber,
  };
}

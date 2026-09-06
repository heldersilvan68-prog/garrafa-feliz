import type { Caixa } from "@/lib/caixa";
import type { Despesa } from "@/lib/despesas";
import { CATEGORIA_TAXA_CARTAO } from "@/lib/despesas";
import { parcelasDe, type Pedido } from "@/lib/pedidos";

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

/** Formas de despesa que saem da gaveta (dinheiro físico). */
const ehSaidaDinheiro = (forma: string) => /dinheiro/i.test(forma);

/** Formas de despesa que saem das contas digitais (PIX, transferência, cartão). */
const ehSaidaConta = (forma: string) => /pix|transfer|cart/i.test(forma);

const arred = (v: number) => Math.round(v * 100) / 100;

/**
 * Saldo acumulado em tempo real por conta (caixa físico x conta digital).
 * Considera todas as vendas válidas, recebimentos de fiado, movimentos de
 * caixa e despesas pagas — cada uma abatida da conta correspondente à sua
 * forma de pagamento.
 */
export function calcularSaldos(
  pedidos: Pedido[],
  despesas: Despesa[],
  caixas: Caixa[],
): SaldosGerais {
  let vendasDinheiro = 0;
  let vendasPix = 0;
  let vendasCartao = 0;

  for (const p of pedidos) {
    if (p.status === "cancelado") continue;
    for (const x of parcelasDe(p)) {
      if (x.forma === "Dinheiro") vendasDinheiro += x.valor;
      else if (x.forma === "PIX") vendasPix += x.valor;
      else if (x.forma === "Débito" || x.forma === "Crédito") vendasCartao += x.valor;
    }
  }

  // Movimentos manuais de caixa e baixas de fiado.
  let suprimentos = 0;
  let sangrias = 0;
  for (const c of caixas) {
    for (const m of c.movimentos) {
      if (m.tipo === "suprimento") suprimentos += m.valor;
      else if (m.tipo === "sangria") {
        // Sangrias geradas por despesas já entram pelo lançamento da despesa.
        if (m.motivo.trim().toLowerCase().startsWith("despesa:")) continue;
        sangrias += m.valor;
      } else if (m.tipo === "recebimento") {
        // Baixa de fiado: entra na conta indicada no motivo do lançamento.
        if (/pix/i.test(m.motivo)) vendasPix += m.valor;
        else if (/débito|debito|crédito|credito|cart/i.test(m.motivo)) vendasCartao += m.valor;
        else vendasDinheiro += m.valor;
      }
    }
  }

  const pagas = despesas.filter((d) => d.status === "Pago");
  const taxasCartao = pagas
    .filter((d) => d.categoria === CATEGORIA_TAXA_CARTAO)
    .reduce((s, d) => s + d.valor, 0);
  const operacionais = pagas.filter((d) => d.categoria !== CATEGORIA_TAXA_CARTAO);
  const saidasDinheiro = operacionais
    .filter((d) => ehSaidaDinheiro(d.forma))
    .reduce((s, d) => s + d.valor, 0);
  const saidasConta = operacionais
    .filter((d) => ehSaidaConta(d.forma))
    .reduce((s, d) => s + d.valor, 0);

  const especie = arred(vendasDinheiro + suprimentos - sangrias - saidasDinheiro);
  const conta = arred(vendasPix + vendasCartao - taxasCartao - saidasConta);

  return {
    especie,
    conta,
    total: arred(especie + conta),
    vendasDinheiro: arred(vendasDinheiro),
    suprimentos: arred(suprimentos),
    sangrias: arred(sangrias),
    saidasDinheiro: arred(saidasDinheiro),
    vendasPix: arred(vendasPix),
    vendasCartao: arred(vendasCartao),
    taxasCartao: arred(taxasCartao),
    saidasConta: arred(saidasConta),
  };
}

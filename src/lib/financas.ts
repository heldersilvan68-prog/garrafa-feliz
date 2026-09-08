/**
 * Fonte única dos cálculos financeiros do sistema.
 * Dashboard, Fechamento de Caixa, Financeiro e Relatórios usam exatamente
 * estas fórmulas para que os números batam 100% entre as telas.
 */
import type { Caixa, MovimentoCaixa } from "@/lib/caixa";
import type { Despesa } from "@/lib/despesas";
import { CATEGORIA_TAXA_CARTAO } from "@/lib/despesas";
import { parcelasDe, valorFaturado, type FormaPagamento, type Pedido } from "@/lib/pedidos";
import { dentroFaixa, isoLocal, type Faixa } from "@/lib/periodo";

export type ContaMovimento = "dinheiro" | "pix" | "cartao";

/** Classifica a forma de pagamento de uma venda na conta correspondente. */
export const contaDaVenda = (forma: FormaPagamento): ContaMovimento | null =>
  forma === "Dinheiro"
    ? "dinheiro"
    : forma === "PIX"
      ? "pix"
      : forma === "Débito" || forma === "Crédito"
        ? "cartao"
        : null;

/** Classifica a forma de uma despesa na conta de onde o dinheiro sai. */
export const contaDaDespesa = (forma: string): ContaMovimento | null =>
  /dinheiro/i.test(forma)
    ? "dinheiro"
    : /pix|transfer/i.test(forma)
      ? "pix"
      : /cart/i.test(forma)
        ? "cartao"
        : null; // Boleto só afeta o saldo quando efetivamente pago via conta.

/** Conta em que caiu a baixa de fiado, lida do motivo do lançamento. */
export const contaDoRecebimento = (m: MovimentoCaixa): ContaMovimento =>
  /pix/i.test(m.motivo)
    ? "pix"
    : /débito|debito|crédito|credito|cart/i.test(m.motivo)
      ? "cartao"
      : "dinheiro";

/** Sangria criada automaticamente por uma despesa (evita contagem dupla). */
export const sangriaDeDespesa = (m: MovimentoCaixa) =>
  m.tipo === "sangria" && m.motivo.trim().toLowerCase().startsWith("despesa:");

const arred = (v: number) => Math.round(v * 100) / 100;

export type MovimentoFinanceiro = {
  /** Vendas diretas do período por forma de recebimento. */
  vendasDinheiro: number;
  vendasPix: number;
  vendasCartao: number;
  fiadoLancado: number;
  /** Baixas de fiado recebidas no período, por conta. */
  recebimentosDinheiro: number;
  recebimentosPix: number;
  recebimentosCartao: number;
  /** Despesas operacionais pagas no período, por conta (sem taxas de cartão). */
  saidasDinheiro: number;
  saidasPix: number;
  saidasCartao: number;
  saidasTotal: number;
  /** Sangrias avulsas (não geradas por despesa). */
  sangrias: number;
  suprimentos: number;
  /** Taxas de maquininha retidas no período. */
  taxasCartao: number;
  /** Faturamento real do período (exclui pagamentos em Vale). */
  faturamento: number;
  /** Entradas de caixa/PIX/cartão do dia já líquidas das saídas na mesma forma. */
  entradaDinheiro: number;
  entradaPix: number;
  entradaCartao: number;
};

/**
 * Calcula todo o movimento financeiro de um intervalo (padrão do sistema).
 * Regras:
 * - Faturamento: só as vendas emitidas no período, sem a parte paga em Vale
 *   e sem somar novamente as baixas de fiado de vendas antigas.
 * - Entradas por forma: vendas diretas na forma + baixas de fiado na forma
 *   − despesas operacionais pagas naquela mesma forma.
 * - Taxas de maquininha são retenções da adquirente: não saem da gaveta nem
 *   da conta PIX, e por isso não entram nas saídas operacionais.
 */
export function calcularMovimento(
  faixa: Faixa,
  pedidos: Pedido[],
  despesas: Despesa[],
  caixas: Caixa[],
): MovimentoFinanceiro {
  const validos = pedidos.filter((p) => p.status !== "cancelado");
  const doPeriodo = validos.filter((p) => dentroFaixa(p.criadoEm, faixa));

  let vendasDinheiro = 0;
  let vendasPix = 0;
  let vendasCartao = 0;
  let fiadoLancado = 0;

  for (const p of doPeriodo) {
    for (const x of parcelasDe(p)) {
      const conta = contaDaVenda(x.forma);
      if (conta === "dinheiro") vendasDinheiro += x.valor;
      else if (conta === "pix") vendasPix += x.valor;
      else if (conta === "cartao") vendasCartao += x.valor;
      else if (x.forma === "Fiado") fiadoLancado += x.valor;
    }
  }

  let recebimentosDinheiro = 0;
  let recebimentosPix = 0;
  let recebimentosCartao = 0;
  let sangrias = 0;
  let suprimentos = 0;

  for (const c of caixas) {
    for (const m of c.movimentos) {
      if (!dentroFaixa(m.em, faixa)) continue;
      if (m.tipo === "suprimento") suprimentos += m.valor;
      else if (m.tipo === "sangria") {
        if (!sangriaDeDespesa(m)) sangrias += m.valor;
      } else {
        const conta = contaDoRecebimento(m);
        if (conta === "pix") recebimentosPix += m.valor;
        else if (conta === "cartao") recebimentosCartao += m.valor;
        else recebimentosDinheiro += m.valor;
      }
    }
  }

  const pagasNoPeriodo = despesas.filter(
    (d) => d.status === "Pago" && dentroFaixa(d.data, faixa),
  );
  const taxasCartao = pagasNoPeriodo
    .filter((d) => d.categoria === CATEGORIA_TAXA_CARTAO)
    .reduce((s, d) => s + d.valor, 0);
  const operacionais = pagasNoPeriodo.filter((d) => d.categoria !== CATEGORIA_TAXA_CARTAO);
  const porConta = (conta: ContaMovimento) =>
    operacionais.filter((d) => contaDaDespesa(d.forma) === conta).reduce((s, d) => s + d.valor, 0);

  const saidasDinheiro = porConta("dinheiro");
  const saidasPix = porConta("pix");
  const saidasCartao = porConta("cartao");
  const saidasTotal = operacionais.reduce((s, d) => s + d.valor, 0);

  return {
    vendasDinheiro: arred(vendasDinheiro),
    vendasPix: arred(vendasPix),
    vendasCartao: arred(vendasCartao),
    fiadoLancado: arred(fiadoLancado),
    recebimentosDinheiro: arred(recebimentosDinheiro),
    recebimentosPix: arred(recebimentosPix),
    recebimentosCartao: arred(recebimentosCartao),
    saidasDinheiro: arred(saidasDinheiro),
    saidasPix: arred(saidasPix),
    saidasCartao: arred(saidasCartao),
    saidasTotal: arred(saidasTotal),
    sangrias: arred(sangrias),
    suprimentos: arred(suprimentos),
    taxasCartao: arred(taxasCartao),
    faturamento: arred(doPeriodo.reduce((s, p) => s + valorFaturado(p), 0)),
    entradaDinheiro: arred(vendasDinheiro + recebimentosDinheiro - saidasDinheiro),
    entradaPix: arred(vendasPix + recebimentosPix - saidasPix),
    entradaCartao: arred(vendasCartao + recebimentosCartao - saidasCartao),
  };
}

/** Movimento financeiro de um único dia (yyyy-mm-dd no fuso da Bahia). */
export const calcularMovimentoDia = (
  dia: string,
  pedidos: Pedido[],
  despesas: Despesa[],
  caixas: Caixa[],
) => calcularMovimento({ inicio: isoLocal(dia), fim: isoLocal(dia) }, pedidos, despesas, caixas);

/**
 * Lucro líquido padrão do sistema:
 * Faturamento − CMV − Despesas operacionais − Taxas de maquininha.
 */
export const lucroLiquido = (
  faturamento: number,
  cmv: number,
  despesasOperacionais: number,
  taxasCartao: number,
) => arred(faturamento - cmv - despesasOperacionais - taxasCartao);

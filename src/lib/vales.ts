/** Histórico de vales (galões pré-pagos) derivado dos pedidos.
 *  Fonte única: `valesCredito` (pacote comprado) e `valesResgatados` (retirada). */
import { valorPorForma, type Pedido } from "@/lib/pedidos";

export type TipoLancamentoVale = "compra" | "resgate";

export type LancamentoVale = {
  id: string;
  pedidoId: string;
  numero: number;
  data: string; // ISO datetime
  clienteId: string;
  clienteNome: string;
  tipo: TipoLancamentoVale;
  /** Galões do lançamento (sempre positivo). */
  galoes: number;
  /** Valor financeiro do lançamento (R$). */
  valor: number;
  /** Valor por galão. */
  valorUnit: number;
};

export const LABEL_LANCAMENTO_VALE: Record<TipoLancamentoVale, string> = {
  compra: "Pacote comprado",
  resgate: "Vales resgatados",
};

/** Valor do pacote de vales vendido no pedido (itens marcados como pacote). */
const valorPacote = (p: Pedido) =>
  p.itens
    .filter((i) => /pacote de vales/i.test(i.nome))
    .reduce((s, i) => s + i.qtd * i.precoUnit, 0);

/** Todos os lançamentos de vales dos pedidos válidos, do mais recente ao mais antigo. */
export function lancamentosVale(pedidos: Pedido[]): LancamentoVale[] {
  const saida: LancamentoVale[] = [];
  for (const p of pedidos) {
    if (p.status === "cancelado") continue;

    const comprados = Math.max(0, Math.round(p.valesCredito ?? 0));
    if (comprados > 0) {
      const valor = valorPacote(p) || 0;
      saida.push({
        id: `${p.id}-compra`,
        pedidoId: p.id,
        numero: p.numero,
        data: p.criadoEm,
        clienteId: p.clienteId,
        clienteNome: p.clienteNome,
        tipo: "compra",
        galoes: comprados,
        valor,
        valorUnit: comprados > 0 ? valor / comprados : 0,
      });
    }

    const resgatados = Math.max(0, Math.round(p.valesResgatados ?? 0));
    if (resgatados > 0) {
      const valor = valorPorForma(p, "Vale");
      saida.push({
        id: `${p.id}-resgate`,
        pedidoId: p.id,
        numero: p.numero,
        data: p.criadoEm,
        clienteId: p.clienteId,
        clienteNome: p.clienteNome,
        tipo: "resgate",
        galoes: resgatados,
        valor,
        valorUnit: resgatados > 0 ? valor / resgatados : 0,
      });
    }
  }
  return saida.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

/** Totais de galões e valores por tipo de lançamento. */
export function totaisVale(lancamentos: LancamentoVale[]) {
  const somar = (tipo: TipoLancamentoVale) =>
    lancamentos
      .filter((l) => l.tipo === tipo)
      .reduce(
        (acc, l) => ({ galoes: acc.galoes + l.galoes, valor: acc.valor + l.valor }),
        { galoes: 0, valor: 0 },
      );
  const compras = somar("compra");
  const resgates = somar("resgate");
  return {
    compras,
    resgates,
    saldoGaloes: compras.galoes - resgates.galoes,
    ticketMedio: compras.galoes > 0 ? compras.valor / compras.galoes : 0,
  };
}

/** Linha do painel "Vales na rua": um cliente com saldo de vales em aberto. */
export type ValeEmAberto = {
  clienteId: string;
  codigo?: string;
  nome: string;
  telefone: string;
  saldo: number;
  /** Valor médio pago por galão (histórico de pacotes do cliente). */
  valorUnit: number;
  /** Valor em R$ já recebido e ainda não entregue em produto. */
  valorRetido: number;
  ultimaCompra?: string;
  ultimoResgate?: string;
};

/**
 * Vales em aberto por cliente (saldo > 0), com o valor equivalente retido no caixa.
 * O valor por galão vem da média dos pacotes que o próprio cliente comprou.
 */
export function valesEmAberto(
  clientes: { id: string; codigo?: string; nome: string; telefone: string; valesSaldo?: number }[],
  lancamentos: LancamentoVale[],
): ValeEmAberto[] {
  const media = (() => {
    const t = totaisVale(lancamentos);
    return t.ticketMedio;
  })();

  return clientes
    .filter((c) => Math.round(c.valesSaldo ?? 0) > 0)
    .map((c) => {
      const doCliente = lancamentos.filter((l) => l.clienteId === c.id);
      const compras = doCliente.filter((l) => l.tipo === "compra");
      const galoes = compras.reduce((s, l) => s + l.galoes, 0);
      const valor = compras.reduce((s, l) => s + l.valor, 0);
      const valorUnit = galoes > 0 ? valor / galoes : media;
      const saldo = Math.round(c.valesSaldo ?? 0);
      return {
        clienteId: c.id,
        codigo: c.codigo,
        nome: c.nome,
        telefone: c.telefone,
        saldo,
        valorUnit,
        valorRetido: saldo * valorUnit,
        ultimaCompra: compras[0]?.data,
        ultimoResgate: doCliente.find((l) => l.tipo === "resgate")?.data,
      };
    });
}

/** Totais do painel de vales em aberto. */
export const totaisEmAberto = (linhas: ValeEmAberto[]) => ({
  clientes: linhas.length,
  galoes: linhas.reduce((s, l) => s + l.saldo, 0),
  valor: linhas.reduce((s, l) => s + l.valorRetido, 0),
});

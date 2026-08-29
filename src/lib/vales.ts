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

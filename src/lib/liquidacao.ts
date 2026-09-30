/**
 * Regra de liquidação D+1 útil das vendas no cartão: o líquido (vendas −
 * taxas) só entra no saldo digital no próximo dia útil (sem fim de semana
 * e feriados nacionais).
 */
import type { Caixa } from "@/lib/caixa";
import type { Despesa } from "@/lib/despesas";
import { CATEGORIA_TAXA_CARTAO } from "@/lib/despesas";
import { contaDaVenda, contaDoRecebimento } from "@/lib/financas";
import { parcelasDe, type Pedido } from "@/lib/pedidos";
import { isoLocal, isoParaDataLocal, somarDiasIso } from "@/lib/periodo";

const arred = (v: number) => Math.round(v * 100) / 100;

function pascoa(ano: number) {
  const a = ano % 19, b = Math.floor(ano / 100), c = ano % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

const cacheFeriados = new Map<number, Set<string>>();
function feriados(ano: number) {
  let s = cacheFeriados.get(ano);
  if (s) return s;
  const p = pascoa(ano);
  s = new Set([
    ...["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"].map(
      (d) => `${ano}-${d}`,
    ),
    somarDiasIso(p, -48), // Carnaval (segunda)
    somarDiasIso(p, -47), // Carnaval (terça)
    somarDiasIso(p, -2), // Sexta-feira Santa
    somarDiasIso(p, 60), // Corpus Christi
  ]);
  cacheFeriados.set(ano, s);
  return s;
}

export const diaUtil = (dia: string) => {
  const semana = isoParaDataLocal(dia).getUTCDay();
  return semana !== 0 && semana !== 6 && !feriados(Number(dia.slice(0, 4))).has(dia);
};

export const proximoDiaUtil = (dia: string) => {
  let d = somarDiasIso(dia, 1);
  while (!diaUtil(d)) d = somarDiasIso(d, 1);
  return d;
};

/** Líquido do cartão por dia da venda (vendas + baixas no cartão − taxas). */
export function cartaoLiquidoPorDia(pedidos: Pedido[], despesas: Despesa[], caixas: Caixa[]) {
  const mapa = new Map<string, number>();
  const somar = (dia: string, v: number) => mapa.set(dia, (mapa.get(dia) ?? 0) + v);
  for (const p of pedidos) {
    if (p.status === "cancelado") continue;
    for (const x of parcelasDe(p)) if (contaDaVenda(x.forma) === "cartao") somar(isoLocal(p.criadoEm), x.valor);
  }
  for (const c of caixas)
    for (const m of c.movimentos)
      if (m.tipo === "recebimento" && contaDoRecebimento(m) === "cartao") somar(isoLocal(m.em), m.valor);
  for (const d of despesas)
    if (d.status === "Pago" && d.categoria === CATEGORIA_TAXA_CARTAO) somar(isoLocal(d.data), -d.valor);
  return mapa;
}

/** Separa o líquido do cartão já liquidado do que ainda está a receber. */
export function liquidacaoCartao(
  pedidos: Pedido[],
  despesas: Despesa[],
  caixas: Caixa[],
  hoje = isoLocal(new Date()),
) {
  let liquidado = 0;
  let aReceber = 0;
  for (const [dia, valor] of cartaoLiquidoPorDia(pedidos, despesas, caixas)) {
    if (proximoDiaUtil(dia) <= hoje) liquidado += valor;
    else aReceber += valor;
  }
  return { liquidado: arred(liquidado), aReceber: arred(aReceber) };
}

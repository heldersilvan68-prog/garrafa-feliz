import {
  DIA_MS,
  diasRestantes,
  hojeISO,
  isoParaData,
  proximaCompra,
  type Cliente,
  type Compra,
} from "@/lib/clientes";
import { isoLocal, somarDiasIso } from "@/lib/periodo";
import type { Pedido } from "@/lib/pedidos";

export type Periodo = { de: string; ate: string };

export const somaDias = (iso: string, n: number) => somarDiasIso(iso, n);

export const periodoPadrao = (): Periodo => ({
  de: somaDias(hojeISO(), -180),
  ate: hojeISO(),
});

export const comprasNoPeriodo = (c: Cliente, p: Periodo): Compra[] =>
  c.historico.filter((h) => h.data >= p.de && h.data <= p.ate);

export const formatarDataLonga = (iso: string) =>
  isoParaData(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

export const formatarDataHora = (iso: string) => {
  const d = iso.includes("T") ? new Date(iso) : isoParaData(iso);
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const diasSemComprar = (c: Cliente) =>
  Math.max(
    0,
    Math.round((isoParaData(hojeISO()).getTime() - isoParaData(c.ultimaCompra).getTime()) / DIA_MS),
  );

/** Intervalo médio real entre compras do histórico (fallback: consumo médio). */
export const cicloReal = (c: Cliente) => {
  const datas = [...c.historico].map((h) => h.data).sort();
  if (datas.length < 2) return c.consumoMedioDias;
  const gaps: number[] = [];
  for (let i = 1; i < datas.length; i++) {
    gaps.push(
      Math.round(
        (isoParaData(datas[i]!).getTime() - isoParaData(datas[i - 1]!).getTime()) / DIA_MS,
      ),
    );
  }
  return Math.max(1, Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length));
};

export type Confianca = { nivel: "Alta" | "Média" | "Baixa"; percentual: number };

/** Confiança da previsão: mais compras + ciclo regular = maior confiança. */
export const confiancaPrevisao = (c: Cliente): Confianca => {
  const n = c.historico.length;
  const desvio = Math.abs(cicloReal(c) - c.consumoMedioDias) / Math.max(1, c.consumoMedioDias);
  let pct = Math.round((Math.min(n, 6) / 6) * 70 + (1 - Math.min(desvio, 1)) * 30);
  pct = Math.max(20, Math.min(97, pct));
  return {
    percentual: pct,
    nivel: pct >= 75 ? "Alta" : pct >= 50 ? "Média" : "Baixa",
  };
};

export type Churn = {
  risco: "Baixo" | "Médio" | "Alto";
  diasSemComprar: number;
  cicloEsperado: number;
  atrasoDias: number;
};

export const sinaisChurn = (c: Cliente): Churn => {
  const ciclo = cicloReal(c);
  const sem = diasSemComprar(c);
  const atraso = Math.max(0, -diasRestantes(c));
  const razao = sem / Math.max(1, ciclo);
  return {
    risco: razao >= 2 ? "Alto" : razao >= 1.3 ? "Médio" : "Baixo",
    diasSemComprar: sem,
    cicloEsperado: ciclo,
    atrasoDias: atraso,
  };
};

/** Produtos mais frequentes a partir das descrições do histórico. */
export const produtosFrequentes = (compras: Compra[]) => {
  const mapa = new Map<string, { nome: string; vezes: number; valor: number }>();
  for (const h of compras) {
    for (const parte of h.descricao.split("+")) {
      const nome = parte.replace(/^\s*\d+\s*x\s*/i, "").trim();
      if (!nome) continue;
      const atual = mapa.get(nome) ?? { nome, vezes: 0, valor: 0 };
      atual.vezes += 1;
      atual.valor += h.valor / Math.max(1, h.descricao.split("+").length);
      mapa.set(nome, atual);
    }
  }
  return [...mapa.values()].sort((a, b) => b.vezes - a.vezes).slice(0, 4);
};

export const janelaContato = (c: Cliente) => {
  const dias = diasRestantes(c);
  if (dias < 0) return "Hoje, entre 9h e 11h (cliente atrasado)";
  if (dias === 0) return "Hoje, entre 9h e 11h";
  if (dias <= 3) return `Em ${dias} dia(s), pela manhã (9h às 11h)`;
  return `A partir de ${formatarDataLonga(somaDias(proximaCompra(c), -2))}, pela manhã`;
};

export const mensagemSugerida = (c: Cliente, produto?: string) =>
  `Olá ${c.nome}! Pelo seu histórico, ${produto ? `o ${produto}` : "seu pedido"} deve estar acabando por aí. ` +
  `Posso separar a mesma quantidade da última compra e entregar ${diasRestantes(c) <= 0 ? "hoje" : "essa semana"}?`;

export const linkWhatsAppSugerido = (c: Cliente, produto?: string) =>
  `https://wa.me/${c.telefone}?text=${encodeURIComponent(mensagemSugerida(c, produto))}`;

export const pedidosDoCliente = (pedidos: Pedido[], c: Cliente) =>
  pedidos.filter((p) => p.clienteId === c.id || p.clienteNome === c.nome);

export const demonstrativoDebito = (c: Cliente, compras: Compra[], saldo: number) => {
  const linhas = compras
    .slice(0, 12)
    .map(
      (h) =>
        `• ${formatarDataLonga(h.data)} — ${h.descricao}: ${h.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
    );
  const texto = [
    `Demonstrativo de débito — ${c.nome}`,
    ...linhas,
    `Saldo em aberto (fiado): ${saldo.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`,
  ].join("\n");
  return `https://wa.me/${c.telefone}?text=${encodeURIComponent(texto)}`;
};

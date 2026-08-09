/** Utilitários de relatórios: exportação (CSV / impressão) e rankings.
 *  Toda a lógica de período vive em @/lib/periodo (fonte única). */
import type { Pedido } from "@/lib/pedidos";

export {
  PERIODOS,
  faixaPeriodo,
  dentroFaixa,
  rotuloFaixa,
  type Faixa,
  type PeriodoId,
} from "@/lib/periodo";

/** Produtos mais vendidos no conjunto de pedidos. */
export function maisVendidos(pedidos: Pedido[]) {
  const mapa = new Map<string, { nome: string; qtd: number; valor: number }>();
  for (const p of pedidos) {
    for (const i of p.itens) {
      const atual = mapa.get(i.nome) ?? { nome: i.nome, qtd: 0, valor: 0 };
      atual.qtd += i.qtd;
      atual.valor += i.qtd * i.precoUnit;
      mapa.set(i.nome, atual);
    }
  }
  return [...mapa.values()].sort((a, b) => b.qtd - a.qtd);
}

const escapar = (v: string | number) => {
  const s = String(v ?? "");
  return /[";\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

/** Gera e baixa um CSV compatível com Excel PT-BR (separador ";"). */
export function baixarCSV(nome: string, colunas: string[], linhas: (string | number)[][]) {
  const conteudo = [colunas, ...linhas].map((l) => l.map(escapar).join(";")).join("\r\n");
  const blob = new Blob([`\uFEFF${conteudo}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nome}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Abre a caixa de impressão do navegador (permite salvar em PDF). */
export const imprimir = () => window.print();

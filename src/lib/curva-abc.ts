import type { LinhaRanking } from "@/lib/desempenho";

export type ClasseABC = "A" | "B" | "C";
export type LinhaABC = LinhaRanking & { posicao: number; classe: ClasseABC; participacao: number; acumulado: number };
export const LIMITES_ABC = { A: 80, B: 95 } as const;

/** O item que cruza o limite permanece na classe que está completando. */
export function calcularCurvaABC(ranking: LinhaRanking[]) {
  const ordenados = ranking.filter(l => Number.isFinite(l.vendas) && l.vendas > 0)
    .sort((a, b) => b.vendas - a.vendas || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
  const total = ordenados.reduce((s, l) => s + l.vendas, 0);
  let soma = 0;
  const linhas: LinhaABC[] = ordenados.map((l, i) => {
    const anterior = total > 0 ? soma / total * 100 : 0;
    const classe: ClasseABC = anterior < LIMITES_ABC.A - 1e-9 ? "A" : anterior < LIMITES_ABC.B - 1e-9 ? "B" : "C";
    soma += l.vendas;
    return { ...l, posicao: i + 1, classe, participacao: l.vendas / total * 100, acumulado: i === ordenados.length - 1 ? 100 : soma / total * 100 };
  });
  const classes = (["A", "B", "C"] as const).map(classe => {
    const membros = linhas.filter(l => l.classe === classe);
    const faturamento = membros.reduce((s, l) => s + l.vendas, 0);
    return { classe, quantidade: membros.length, faturamento, participacao: total > 0 ? faturamento / total * 100 : 0 };
  });
  return { linhas, classes, total };
}

export type CurvaABC = ReturnType<typeof calcularCurvaABC>;
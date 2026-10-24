import { describe, expect, it } from "vitest";
import { expandirComposicao, type Produto } from "@/lib/erp";
import { saldoVasilhamesPedido } from "@/lib/vasilhames";

const produtos = [
  { id: "agua", retornavel: true },
  { id: "vasilhame", retornavel: true },
] as unknown as Produto[];

describe("saldo de vasilhames por modalidade", () => {
  it("venda completa (modalidade com casco pago) não gera empréstimo", () => {
    const itens = [
      { produtoId: "agua", qtd: 1, modo: "refil" as const, composicao: [{ produtoId: "vasilhame", qtd: 1 }] },
    ];
    expect(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 0)).toBe(0);
  });

  it("troca de refil sem devolução do vazio gera empréstimo", () => {
    const itens = [{ produtoId: "agua", qtd: 1, modo: "refil" as const, retornavel: true }];
    expect(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 0)).toBe(1);
  });

  it("troca de refil com vazio devolvido fica quitada", () => {
    const itens = [{ produtoId: "agua", qtd: 1, modo: "refil" as const, retornavel: true }];
    expect(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 1)).toBe(0);
  });

  it("devolução excedente em venda completa abate empréstimos antigos", () => {
    const itens = [
      { produtoId: "agua", qtd: 1, modo: "refil" as const, composicao: [{ produtoId: "vasilhame", qtd: 1 }] },
    ];
    expect(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 2)).toBe(-2);
  });

  it("venda de casco avulso não gera empréstimo", () => {
    const itens = [{ produtoId: "vasilhame", qtd: 1, modo: "casco" as const, retornavel: true }];
    expect(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 0)).toBe(0);
  });
});

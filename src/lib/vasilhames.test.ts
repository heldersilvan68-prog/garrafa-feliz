import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { expandirComposicao, type Produto } from "@/lib/erp";
import { calcularChegadaCarga, saldoVasilhamesPedido } from "@/lib/vasilhames";

const produtos = [
  { id: "agua", retornavel: true },
  { id: "vasilhame", retornavel: true },
] as unknown as Produto[];

describe("avarias na chegada da carga", () => {
  it("Quebra na Fonte reduz só patrimônio e não recebe os quebrados", () => {
    assert.deepEqual(calcularChegadaCarga(10, 2, 0, "Quebra na Fonte"), {
      recebidos: 8, quebraCarga: 2, quebraCheio: 0, deltaCheio: 0, deltaVazio: 0, deltaPatrimonio: -2,
    });
  });
  it("Quebra no Transporte/Carga reduz só patrimônio e não recebe os quebrados", () => {
    assert.deepEqual(calcularChegadaCarga(10, 2, 0, "Quebra no Transporte/Carga"), {
      recebidos: 8, quebraCarga: 2, quebraCheio: 0, deltaCheio: 0, deltaVazio: 0, deltaPatrimonio: -2,
    });
  });
  it("Quebra Interna no Depósito reduz patrimônio e cheios, sem abater carga na fonte", () => {
    assert.deepEqual(calcularChegadaCarga(10, 2, 0, "Quebra Interna no Depósito"), {
      recebidos: 10, quebraCarga: 0, quebraCheio: 2, deltaCheio: -2, deltaVazio: 0, deltaPatrimonio: -2,
    });
  });
  it("avaria sem carga na fonte não consome vazios nem cheios do depósito", () => {
    assert.deepEqual(calcularChegadaCarga(0, 2, 0, "Quebra na Fonte"), {
      recebidos: 0, quebraCarga: 0, quebraCheio: 0, deltaCheio: 0, deltaVazio: 0, deltaPatrimonio: -2,
    });
  });
  it("avaria interna sem carga dá baixa de cheios, nunca de vazios", () => {
    assert.deepEqual(calcularChegadaCarga(0, 2, 0, "Quebra Interna no Depósito"), {
      recebidos: 0, quebraCarga: 0, quebraCheio: 2, deltaCheio: -2, deltaVazio: 0, deltaPatrimonio: -2,
    });
  });
});

describe("saldo de vasilhames por modalidade", () => {
  it("venda completa (modalidade com casco pago) não gera empréstimo", () => {
    const itens = [
      { produtoId: "agua", qtd: 1, modo: "refil" as const, composicao: [{ produtoId: "vasilhame", qtd: 1 }] },
    ];
    assert.equal(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 0), 0);
  });

  it("troca de refil sem devolução do vazio gera empréstimo", () => {
    const itens = [{ produtoId: "agua", qtd: 1, modo: "refil" as const, retornavel: true }];
    assert.equal(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 0), 1);
  });

  it("troca de refil com vazio devolvido fica quitada", () => {
    const itens = [{ produtoId: "agua", qtd: 1, modo: "refil" as const, retornavel: true }];
    assert.equal(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 1), 0);
  });

  it("devolução excedente em venda completa abate empréstimos antigos", () => {
    const itens = [
      { produtoId: "agua", qtd: 1, modo: "refil" as const, composicao: [{ produtoId: "vasilhame", qtd: 1 }] },
    ];
    assert.equal(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 2), -2);
  });

  it("venda de casco avulso não gera empréstimo", () => {
    const itens = [{ produtoId: "vasilhame", qtd: 1, modo: "casco" as const, retornavel: true }];
    assert.equal(saldoVasilhamesPedido(expandirComposicao(itens, produtos), 0), 0);
  });
});

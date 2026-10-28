import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ajustarPagamentosVale, quantidadeValesResgatados } from "@/lib/vales";
import type { ItemPedido } from "@/lib/pedidos";

const agua: ItemPedido = { produtoId: "agua", nome: "Água", qtd: 1, precoUnit: 12, retornavel: true, modo: "refil" };

describe("baixa de vales independente do preço", () => {
  it("vale de R$ 9,50 resgata uma água lançada a R$ 12", () => {
    const pagamentos = ajustarPagamentosVale(12, [{ forma: "Vale", valor: 9.5 }]);
    assert.deepEqual(pagamentos, [{ forma: "Vale", valor: 12 }]);
    assert.equal(quantidadeValesResgatados([agua], pagamentos), 1);
  });
  it("valor de R$ 12 no vale não muda a quantidade resgatada", () => {
    assert.equal(quantidadeValesResgatados([agua], ajustarPagamentosVale(12, [{ forma: "Vale", valor: 12 }])), 1);
  });
  it("vale acima do total não gera troco ou crédito fictício", () => {
    assert.deepEqual(ajustarPagamentosVale(9.5, [{ forma: "Vale", valor: 12 }]), [{ forma: "Vale", valor: 9.5 }]);
  });
  it("selecionar Vale sem digitar valor cobre a venda e baixa pela quantidade", () => {
    const pagamentos = ajustarPagamentosVale(24, [{ forma: "Vale", valor: 0 }]);
    assert.equal(quantidadeValesResgatados([{ ...agua, qtd: 2 }], pagamentos), 2);
  });
  it("mantém pagamentos reais na venda mista e vale cobre só o restante", () => {
    assert.deepEqual(ajustarPagamentosVale(12, [{ forma: "PIX", valor: 2.5 }, { forma: "Vale", valor: 12 }]), [{ forma: "PIX", valor: 2.5 }, { forma: "Vale", valor: 9.5 }]);
  });
  it("sem Vale não resgata nenhum e mantém pagamento", () => {
    const pagamentos = ajustarPagamentosVale(12, [{ forma: "Dinheiro", valor: 12 }]);
    assert.equal(quantidadeValesResgatados([agua], pagamentos), 0);
  });
  it("editar de uma para duas águas altera o saldo em um vale, não em reais", () => {
    const antes = quantidadeValesResgatados([agua], ajustarPagamentosVale(12, [{ forma: "Vale", valor: 9.5 }]));
    const depois = quantidadeValesResgatados([{ ...agua, qtd: 2 }], ajustarPagamentosVale(24, [{ forma: "Vale", valor: 9.5 }]));
    assert.equal(antes - depois, -1);
  });
});
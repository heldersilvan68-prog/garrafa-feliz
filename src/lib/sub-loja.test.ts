import { describe, it } from "node:test";
import assert from "node:assert/strict";
const expect = (actual: unknown) => ({
  toBe: (expected: unknown) => assert.equal(actual, expected),
});
import { analisarSubLoja, calcularCmvItem, type DespesaSubLoja } from "@/lib/sub-loja";
import type { Pedido } from "@/lib/pedidos";
import type { Produto } from "@/lib/erp";

const produto = (id: string, subLoja: boolean, precoCusto = 4): Produto => ({
  id, nome: id, categoria: "Teste", precoCusto, precoVenda: 10,
  estoqueMinimo: 0, retornavel: false, estoqueCheio: 0, estoqueVazio: 0,
  custoCasco: 0, custoEnvase: 0, unidadesPorFardo: 1, precoCustoFardo: 0,
  precoFardo: 0, margemDesejada: 0, precoVendaCasco: 0, descontoCompleta: 0,
  promoQtd: 0, promoPreco: 0, patrimonioCascos: 0, subLoja,
});

function venda(overrides: Partial<Pedido> = {}): Pedido {
  return {
    id: "pedido-1", numero: 42, clienteId: "c1", clienteNome: "Maria",
    telefone: "", endereco: "", enderecoEntrega: "", bairro: "",
    itens: [
      { produtoId: "sub", nome: "Produto da Sub-Loja", qtd: 2, precoUnit: 20, retornavel: false, modo: "refil", subLoja: true, cmv: 10 },
      { produtoId: "principal", nome: "Produto principal", qtd: 1, precoUnit: 60, retornavel: false, modo: "refil", subLoja: false },
    ],
    pagamentos: [{ forma: "PIX", valor: 70 }, { forma: "Dinheiro", valor: 30 }],
    total: 100, pagamento: "PIX", pago: true, valorFiado: 0, desconto: 0,
    valesCredito: 0, valesResgatados: 0, vaziosRecolhidos: 0,
    entregador: "Balcão", status: "concluido", criadoEm: "2026-11-23T15:00:00Z",
    ...overrides,
  };
}

const faixa = { inicio: "2026-11-01", fim: "2026-11-30" };
const produtos = [produto("sub", true), produto("principal", false)];

describe("Sub-Loja", () => {
  it("rateia receita e cada pagamento somente pela participação dos itens da Sub-Loja", () => {
    const resumo = analisarSubLoja(faixa, [venda()], produtos, []);
    expect(resumo.faturamento).toBe(40);
    expect(resumo.pix).toBe(28);
    expect(resumo.dinheiro).toBe(12);
    expect(resumo.cmv).toBe(10);
    expect(resumo.lucroBruto).toBe(30);
    expect(resumo.linhas[0]?.produtos).toBe("2× Produto da Sub-Loja");
  });

  it("desconta somente despesas exclusivas do período no lucro líquido", () => {
    const despesas: DespesaSubLoja[] = [
      { id: "1", descricao: "Embalagens", categoria: "Insumos", valor: 8, data: "2026-11-23", criadoEm: "" },
      { id: "2", descricao: "Outro mês", categoria: "Insumos", valor: 100, data: "2026-10-23", criadoEm: "" },
    ];
    const resumo = analisarSubLoja(faixa, [venda()], produtos, despesas);
    expect(resumo.despesas).toBe(8);
    expect(resumo.lucroLiquido).toBe(22);
  });

  it("ignora vendas canceladas e preserva o vínculo histórico mesmo se o produto mudar", () => {
    const cancelada = venda({ id: "cancelada", status: "cancelado" });
    const resumo = analisarSubLoja(faixa, [cancelada], produtos, []);
    expect(resumo.faturamento).toBe(0);
    const historico = venda();
    historico.itens[0]!.subLoja = false;
    const alterado = analisarSubLoja(faixa, [historico], produtos, []);
    expect(alterado.faturamento).toBe(0);
  });

  it("calcula o CMV de uma modalidade pela composição completa", () => {
    const item = venda().itens[0]!;
    item.cmv = undefined;
    item.qtd = 2;
    item.composicao = [{ produtoId: "principal", qtd: 3 }];
    expect(calcularCmvItem(item, produtos)).toBe(32);
  });
});

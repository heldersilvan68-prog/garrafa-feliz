/// <reference types="bun" />
import { describe, expect, test } from "bun:test";
import { analisarDesempenho, estimarEquilibrio, simularResultado } from "./desempenho";
import type { Pedido } from "./pedidos";
import type { Produto } from "./erp";
import type { Despesa } from "./despesas";
import { CATEGORIA_COMPRA_MERCADORIA, CATEGORIA_TAXA_CARTAO } from "./despesas";

const produto = { id: "agua", nome: "Água", precoCusto: 6, retornavel: true, estoqueCheio: 10, unidadesPorFardo: 1 } as Produto;
const pedido: Pedido = { id: "p1", numero: 1, clienteId: "c1", clienteNome: "Cliente", telefone: "", enderecoEntrega: "", endereco: "", bairro: "", valorFiado: 0, valesCredito: 0, valesResgatados: 0, entregador: "Helder", total: 20, desconto: 0, pagamento: "PIX", pagamentos: [{ forma: "PIX", valor: 20 }], pago: true, status: "concluido", criadoEm: "2026-10-10T15:00:00Z", itens: [{ produtoId: "agua", nome: "Água", qtd: 1, precoUnit: 20, retornavel: true, modo: "refil" }], vaziosRecolhidos: 1 };
const despesa = (categoria: string, valor: number, status: "Pago" | "Pendente" = "Pago", data = "2026-10-10") => ({ id: categoria, categoria, valor, status, data, descricao: categoria } as Despesa);
const faixa = { inicio: "2026-10-01", fim: "2026-10-19" };
describe("desempenho empresarial", () => {
  test("resultado exclui compras e não desconta taxas duas vezes", () => {
    const d = analisarDesempenho(faixa, [pedido], [despesa(CATEGORIA_COMPRA_MERCADORIA, 100), despesa(CATEGORIA_TAXA_CARTAO, 1), despesa("Aluguel", 3), despesa("Outros", 50, "Pendente")], [produto]);
    expect(d.opReais).toBe(3); expect(d.resumo.lucroLiquido).toBe(10);
  });
  test("categoria antiga de compra de mercadoria também é excluída", () => {
    const d = analisarDesempenho(faixa, [pedido], [despesa("Compra de Mercadoria", 100)], [produto]);
    expect(d.opReais).toBe(0); expect(d.resumo.lucroLiquido).toBe(14);
  });
  test("só vendas concluídas e em rota entram nos indicadores", () => {
    const d = analisarDesempenho(faixa, [pedido, { ...pedido, id: "2", status: "pendente" }, { ...pedido, id: "3", status: "cancelado" }, { ...pedido, id: "4", status: "em-rota" }], [], [produto]);
    expect(d.resumo.vendas).toBe(40); expect(d.selecionados.length).toBe(2);
  });
  test("período exclui vendas e despesas fora da faixa", () => {
    const d = analisarDesempenho(faixa, [pedido, { ...pedido, criadoEm: "2026-09-10T15:00:00Z" }], [despesa("Aluguel", 99, "Pago", "2026-11-01")], [produto]);
    expect(d.resumo.vendas).toBe(20); expect(d.opReais).toBe(0);
  });
  test("composição soma o custo do pai e do insumo e rankings reconciliam a receita", () => {
    const p = { ...pedido, itens: [{ ...pedido.itens[0], composicao: [{ produtoId: "casco", qtd: 1 }] }] };
    const d = analisarDesempenho(faixa, [p], [], [produto, { ...produto, id: "casco", precoCusto: 4 }]);
    expect(d.resumo.custoProduto).toBe(10); expect(d.produtos.reduce((s, i) => s + i.vendas, 0)).toBe(20); expect(d.estoque.find(e => e.produto.id === "casco")?.vendido).toBe(1);
  });
  test("equilíbrio estimado usa margem após CMV e taxas", () => {
    expect(estimarEquilibrio(1000, 400, 100, 200).equilibrio).toBe(400);
    expect(estimarEquilibrio(100, 100, 0, 200).equilibrio).toBeNull();
  });
  test("simulação aplica preço ao faturamento e volume ao CMV", () => {
    expect(simularResultado(1000, 400, 100, 200, 10, 20, -10).lucro).toBeCloseTo(568);
  });
});
import { describe, it as test } from "node:test";
import assert from "node:assert/strict";
import { resumoParaAssistente } from "./assistente";
import type { Pedido } from "./pedidos";
import type { Produto } from "./erp";
import type { Despesa } from "./despesas";

const agua = { id: "agua", nome: "Água 20L", precoCusto: 6, retornavel: true, estoqueCheio: 10, unidadesPorFardo: 1 } as Produto;
const base: Pedido = { id: "p1", numero: 1, clienteId: "c1", clienteNome: "Cliente", telefone: "", enderecoEntrega: "", endereco: "", bairro: "", valorFiado: 0, valesCredito: 0, valesResgatados: 0, entregador: "Helder", total: 20, desconto: 0, pagamento: "PIX", pagamentos: [{ forma: "PIX", valor: 20 }], pago: true, status: "concluido", criadoEm: "2026-10-10T15:00:00Z", itens: [{ produtoId: "agua", nome: "Água 20L", qtd: 2, precoUnit: 10, retornavel: true, modo: "refil" }], vaziosRecolhidos: 2 };
const faixa = { inicio: "2026-10-01", fim: "2026-10-31" };

describe("dados do assistente", () => {
  test("águas vendidas no mês e lucro batem com o cálculo do Desempenho", () => {
    const r = resumoParaAssistente(faixa, [base, { ...base, id: "p2", status: "cancelado" }], [{ id: "d", categoria: "Aluguel", valor: 3, status: "Pago", data: "2026-10-05", descricao: "" } as Despesa], [agua], ["Helder"]);
    assert.equal(r.produtos[0]?.quantidade_unidades, 2);
    assert.equal(r.totais.faturamento, 20);
    assert.equal(r.totais.lucro_liquido, 5);
  });
  test("entregador excluído não aparece no ranking", () => {
    const r = resumoParaAssistente(faixa, [base, { ...base, id: "p3", entregador: "Antigo" }], [], [agua], ["Helder"]);
    assert.deepEqual(r.entregadores.map((e) => e.nome), ["Helder"]);
  });
});

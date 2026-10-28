import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calcularCurvaABC } from "@/lib/curva-abc";
import { analisarDesempenho, type LinhaRanking } from "@/lib/desempenho";
import type { Pedido } from "@/lib/pedidos";
import type { Produto } from "@/lib/erp";

const linha = (id: string, vendas: number): LinhaRanking => ({ id, nome: id, vendas, custo: 0, pedidos: 1, qtd: 1 });
describe("curvas ABC", () => {
  it("A completa 80%, B completa 95% e C representa os 5% finais", () => {
    const c = calcularCurvaABC([linha("c", 5), linha("a", 80), linha("b", 15)]);
    assert.deepEqual(c.linhas.map(l => [l.id, l.classe, l.acumulado]), [["a", "A", 80], ["b", "B", 95], ["c", "C", 100]]);
    assert.equal(c.classes.reduce((s, l) => s + l.faturamento, 0), 100);
  });
  it("o líder que ultrapassa 80% continua na classe A", () => {
    assert.deepEqual(calcularCurvaABC([linha("a", 96), linha("b", 4)]).linhas.map(l => l.classe), ["A", "C"]);
  });
  it("o item que cruza 80% completa A sem fracionar cliente ou produto", () => {
    assert.deepEqual(calcularCurvaABC([linha("a", 60), linha("b", 25), linha("c", 10), linha("d", 5)]).linhas.map(l => l.classe), ["A", "A", "B", "C"]);
  });
  it("sem faturamento não cria classificação ou percentuais inválidos", () => {
    const c = calcularCurvaABC([linha("zero", 0), linha("negativo", -1)]);
    assert.equal(c.total, 0); assert.deepEqual(c.linhas, []);
    assert.ok(c.classes.every(l => l.participacao === 0));
  });
  it("clientes e produtos usam vendas realizadas, período, descontos e excluem resgate de Vale", () => {
    const p: Pedido = { id: "1", numero: 1, clienteId: "cliente", clienteNome: "Cliente", telefone: "", endereco: "", enderecoEntrega: "", bairro: "", valorFiado: 0, valesCredito: 0, valesResgatados: 0, entregador: "Balcão", total: 90, desconto: 10, pagamento: "PIX", pagamentos: [{ forma: "PIX", valor: 70 }, { forma: "Vale", valor: 20 }], pago: true, status: "concluido", criadoEm: "2026-10-10T15:00:00Z", vaziosRecolhidos: 0, itens: [{ produtoId: "agua", nome: "Água", qtd: 1, precoUnit: 100, retornavel: true, modo: "refil", composicao: [{ produtoId: "casco", qtd: 1 }] }] };
    const produtos = [{ id: "agua", nome: "Água", precoCusto: 6 }, { id: "casco", nome: "Casco", precoCusto: 4 }] as Produto[];
    const d = analisarDesempenho({ inicio: "2026-10-01", fim: "2026-10-31" }, [p, { ...p, id: "2", status: "cancelado" }, { ...p, id: "3", status: "pendente" }, { ...p, id: "4", criadoEm: "2026-09-10T15:00:00Z" }], [], produtos);
    assert.equal(calcularCurvaABC(d.clientes).total, 70);
    assert.equal(calcularCurvaABC(d.produtos).total, 70);
    assert.equal(calcularCurvaABC(d.produtos).linhas[0]?.custo, 10);
  });
});
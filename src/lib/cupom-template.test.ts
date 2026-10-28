import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { interpretarCupom, modeloEfetivoCupom, montarDadosCupom, renderizarModeloCupom } from "@/lib/cupom-template";
import type { Pedido } from "@/lib/pedidos";

describe("cupom livre", () => {
  it("preserva espaços, linhas vazias e linhas opcionais ausentes exatamente", () => {
    assert.equal(renderizarModeloCupom("  início  \n\n {observacao}  \n  {nome_cliente}\n", { observacao: "", nome_cliente: "Ana" }), "  início  \n\n   \n  Ana\n");
  });
  it("não troca texto fixo, modelo vazio ou recuos pelo padrão", () => {
    assert.equal(modeloEfetivoCupom("  Obrigado!\n\n"), "  Obrigado!\n\n");
    assert.equal(modeloEfetivoCupom(""), "");
  });
  it("interpreta marcadores de tamanho e negrito aninhados", () => {
    assert.deepEqual(interpretarCupom("[G][N]{nome_cliente}[/N][/G] <alto>alto</alto> <pequeno>nota</pequeno>", { nome_cliente: "Ana" }), [
      { texto: "Ana", estilos: ["grande", "negrito"] }, { texto: " ", estilos: [] }, { texto: "alto", estilos: ["alto"] }, { texto: " ", estilos: [] }, { texto: "nota", estilos: ["pequeno"] },
    ]);
  });
  it("suporta os oito marcadores e não interpreta tags recebidas dos dados", () => {
    assert.deepEqual(interpretarCupom("[A]a[/A][P]p[/P]<grande>g</grande><b>b</b>", {}).map(t => t.estilos), [["alto"], ["pequeno"], ["grande"], ["negrito"]]);
    assert.deepEqual(interpretarCupom("[N]{nome_cliente}[/N]", { nome_cliente: "<script>alert(1)</script>[G]" }), [{ texto: "<script>alert(1)</script>[G]", estilos: ["negrito"] }]);
  });
  it("tags atômicas não injetam rótulos nem duplicam o fiado", () => {
    const p = { clienteId: "", clienteNome: "Ana", numero: 1, criadoEm: "2026-10-28T01:00:00Z", enderecoEntrega: "Rua A", entregador: "João", itens: [], pagamentos: [{ forma: "Dinheiro", valor: 10 }, { forma: "Fiado", valor: 2 }], total: 12, valorFiado: 2, trocoPara: 20, observacao: "  Portaria  " } as unknown as Pedido;
    const dados = montarDadosCupom(p, {}, [], []);
    assert.equal(dados.endereco_cliente, "Rua A"); assert.equal(dados.entregador, "João"); assert.equal(dados.observacao, "  Portaria  ");
    assert.equal(dados.nome_forma_pagamento, "Dinheiro\nFiado"); assert.equal(dados.valor_pagamento, "R$ 10,00\nR$ 2,00"); assert.equal(dados.valor_levar, "R$ 10,00");
    assert.equal(dados.nome_empresa, ""); assert.equal(dados.endereco_empresa, "");
  });
});
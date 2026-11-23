import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { botaoFechaSemConfirmar, selecionarBotaoConfirmacao } from "@/hooks/use-enter-confirma";

const botao = (textContent: string, disabled = false, cancelamento = false) => ({
  textContent,
  disabled,
  hasAttribute: (nome: string) => cancelamento && nome === "data-enter-cancel",
});

describe("seleção do botão acionado por Enter", () => {
  it("não cancela a venda quando Criar pedido e Imprimir estão desabilitados", () => {
    const botoes = [botao("Cancelar", false, true), botao("Imprimir", true), botao("Criar pedido", true)];
    assert.equal(selecionarBotaoConfirmacao(botoes), undefined);
  });

  it("não usa Voltar quando a confirmação de exclusão está desabilitada", () => {
    const botoes = [botao("Voltar"), botao("Excluir definitivamente", true)];
    assert.equal(selecionarBotaoConfirmacao(botoes), undefined);
  });

  it("não aciona um botão semanticamente marcado como fechamento", () => {
    assert.equal(selecionarBotaoConfirmacao([botao("Dispensar", false, true)]), undefined);
  });

  it("não recua para Imprimir quando Criar pedido está desabilitado", () => {
    const imprimir = botao("Imprimir");
    const botoes = [botao("Cancelar", false, true), imprimir, botao("Criar pedido", true)];
    assert.equal(selecionarBotaoConfirmacao(botoes), undefined);
  });

  it("confirma a ação principal habilitada", () => {
    const criar = botao("Criar pedido");
    assert.equal(selecionarBotaoConfirmacao([botao("Cancelar"), botao("Imprimir"), criar]), criar);
  });

  it("não confirma se o rodapé estiver vazio", () => {
    assert.equal(selecionarBotaoConfirmacao([]), undefined);
  });

  it("respeita a confirmação marcada explicitamente sem usar outra ação", () => {
    const principal = { ...botao("Salvar", true), hasAttribute: (nome: string) => nome === "data-enter-confirm" };
    assert.equal(selecionarBotaoConfirmacao([principal, botao("Imprimir")]), undefined);
  });

  it("bloqueia Enter em Cancelar, Voltar e X/Close focados, mas permite confirmação de cancelamento", () => {
    for (const rotulo of ["Cancelar", " Voltar ", "Close", "Fechar"]) {
      assert.equal(botaoFechaSemConfirmar(botao(rotulo)), true);
    }
    assert.equal(botaoFechaSemConfirmar(botao("Confirmar cancelamento")), false);
  });
});

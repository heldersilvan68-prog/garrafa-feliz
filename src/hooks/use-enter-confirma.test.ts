import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { selecionarBotaoConfirmacao } from "@/hooks/use-enter-confirma";

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

  it("mantém Enter na ação de confirmação habilitada", () => {
    const imprimir = botao("Imprimir");
    const botoes = [botao("Cancelar", false, true), imprimir, botao("Criar pedido", true)];
    assert.equal(selecionarBotaoConfirmacao(botoes), imprimir);
  });
});

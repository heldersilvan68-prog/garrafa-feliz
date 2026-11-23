import { useEffect } from "react";

type BotaoRodape = Pick<HTMLButtonElement, "disabled" | "textContent" | "hasAttribute">;

const rotulosQueFecham = new Set(["cancelar", "voltar", "fechar", "close"]);

export function botaoFechaSemConfirmar(botao: Pick<BotaoRodape, "textContent" | "hasAttribute">) {
  const rotulo = botao.textContent?.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR") ?? "";
  return botao.hasAttribute("data-enter-cancel") || rotulosQueFecham.has(rotulo);
}

/** Enter só pode confirmar: se a ação principal estiver bloqueada, nunca recua para cancelar/fechar. */
export function selecionarBotaoConfirmacao<T extends BotaoRodape>(botoes: T[]) {
  const principal = botoes.find((botao) => botao.hasAttribute("data-enter-confirm")) ?? botoes[botoes.length - 1];
  if (!principal || principal.disabled || botaoFechaSemConfirmar(principal)) return undefined;
  return principal;
}

/** Regra global: Enter confirma a janela aberta (botão principal do rodapé). */
export function useEnterConfirma() {
  useEffect(() => {
    // Intercepta antes dos handlers locais e da ativação nativa de botões focados.
    const bloquearFechamento = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || !(e.target instanceof Element)) return;
      const botao = e.target.closest<HTMLElement>("button,[role=button],[data-enter-cancel]");
      if (!botao || !botaoFechaSemConfirmar(botao)) return;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented || e.isComposing || e.repeat || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo) {
        const tag = alvo.tagName;
        if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A" || tag === "SELECT" || alvo.isContentEditable) return;
        if (alvo.closest("[role=combobox][aria-expanded=true],[role=listbox],[role=menu],[cmdk-root]")) return;
        // Dentro de formulário com botão de envio, o navegador já confirma.
        const form = alvo.closest("form");
        if (form) {
          const submit = form.querySelector<HTMLButtonElement | HTMLInputElement>("button[type=submit],input[type=submit]");
          if (submit) {
            if (submit.disabled) e.preventDefault();
            return;
          }
        }
      }
      const janelas = Array.from(document.querySelectorAll<HTMLElement>('[role=dialog][data-state=open],[role=alertdialog][data-state=open]'));
      const janela = janelas[janelas.length - 1];
      if (!janela || (alvo && alvo !== document.body && !janela.contains(alvo))) return;
      const rodapes = janela.querySelectorAll<HTMLElement>("[data-dialog-footer]");
      const rodape = rodapes[rodapes.length - 1];
      if (!rodape) return;
      const principal = selecionarBotaoConfirmacao(Array.from(rodape.querySelectorAll<HTMLButtonElement>("button")));
      e.preventDefault();
      principal?.click();
    };
    document.addEventListener("keydown", bloquearFechamento, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", bloquearFechamento, true);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
}

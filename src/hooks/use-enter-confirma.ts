import { useEffect } from "react";

type BotaoRodape = Pick<HTMLButtonElement, "disabled" | "textContent" | "hasAttribute">;

const rotulosQueFecham = new Set(["cancelar", "voltar", "fechar"]);

/** Enter só pode confirmar: se a ação principal estiver bloqueada, nunca recua para cancelar/fechar. */
export function selecionarBotaoConfirmacao<T extends BotaoRodape>(botoes: T[]) {
  const habilitados = botoes.filter((botao) => !botao.disabled);
  const principal = habilitados[habilitados.length - 1];
  if (!principal) return undefined;
  const rotulo = principal.textContent?.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR") ?? "";
  if (principal.hasAttribute("data-enter-cancel") || rotulosQueFecham.has(rotulo)) return undefined;
  return principal;
}

/** Regra global: Enter confirma a janela aberta (botão principal do rodapé). */
export function useEnterConfirma() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" || e.defaultPrevented || e.isComposing || e.shiftKey || e.altKey || e.ctrlKey || e.metaKey) return;
      const alvo = e.target as HTMLElement | null;
      if (alvo) {
        const tag = alvo.tagName;
        if (tag === "TEXTAREA" || tag === "BUTTON" || tag === "A" || tag === "SELECT" || alvo.isContentEditable) return;
        if (alvo.closest("[role=combobox][aria-expanded=true],[role=listbox],[role=menu],[cmdk-root]")) return;
        // Dentro de formulário com botão de envio, o navegador já confirma.
        const form = alvo.closest("form");
        if (form && form.querySelector("button[type=submit]:not([disabled]),input[type=submit]")) return;
      }
      const janelas = Array.from(document.querySelectorAll<HTMLElement>('[role=dialog][data-state=open],[role=alertdialog][data-state=open]'));
      const janela = janelas[janelas.length - 1];
      if (!janela || (alvo && alvo !== document.body && !janela.contains(alvo))) return;
      const rodapes = janela.querySelectorAll<HTMLElement>("[data-dialog-footer]");
      const rodape = rodapes[rodapes.length - 1];
      if (!rodape) return;
      const principal = selecionarBotaoConfirmacao(Array.from(rodape.querySelectorAll<HTMLButtonElement>("button")));
      if (!principal) return;
      e.preventDefault();
      principal.click();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
}

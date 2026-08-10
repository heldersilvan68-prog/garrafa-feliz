import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Campo "outlined" padrão do sistema: o rótulo fica sobreposto interrompendo a
 * borda superior (fieldset + legend), com fundo claro e cantos arredondados.
 * Envolve qualquer Input, Textarea ou Select do design system.
 */
export function Campo({
  label,
  htmlFor,
  dica,
  acao,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor?: string;
  dica?: ReactNode;
  /** Conteúdo opcional à direita do rótulo (ex.: botão "+ Novo"). */
  acao?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <fieldset className="min-w-0 rounded-xl border border-input bg-background px-3 pb-2 pt-0.5 shadow-sm transition-colors focus-within:border-ring">
        <legend className="ml-0.5 flex items-center gap-2 px-1 text-xs font-medium text-muted-foreground">
          <label htmlFor={htmlFor}>{label}</label>
          {acao}
        </legend>
        <div
          className={cn(
            "min-w-0",
            "[&_input]:h-8 [&_input]:w-full [&_input]:rounded-none [&_input]:border-0 [&_input]:bg-transparent [&_input]:px-0 [&_input]:shadow-none [&_input]:focus-visible:ring-0",
            "[&_textarea]:min-h-16 [&_textarea]:w-full [&_textarea]:border-0 [&_textarea]:bg-transparent [&_textarea]:px-0 [&_textarea]:shadow-none [&_textarea]:focus-visible:ring-0",
            "[&_button[role=combobox]]:h-8 [&_button[role=combobox]]:border-0 [&_button[role=combobox]]:bg-transparent [&_button[role=combobox]]:px-0 [&_button[role=combobox]]:shadow-none [&_button[role=combobox]]:focus:ring-0",
          )}
        >
          {children}
        </div>
      </fieldset>
      {dica ? <p className="px-1 text-xs text-muted-foreground">{dica}</p> : null}
    </div>
  );
}

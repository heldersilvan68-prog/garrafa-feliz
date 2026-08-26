import { useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange" | "type"> & {
  valor: number;
  onValor: (n: number) => void;
};

/** Formata um número para exibição em Real: R$ 1.234,56 */
const formatar = (n: number) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Converte texto digitado (aceita vírgula ou ponto) em número. */
const parse = (t: string): number => {
  const limpo = t.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(limpo);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Campo de moeda padrão: sempre exibe o valor com prefixo "R$" fixo
 * e duas casas decimais (R$ 16,00 | R$ 3,50). Editável, com máscara
 * automática no blur e seleção total no foco.
 */
export function InputMoeda({ valor, onValor, className, ...rest }: Props) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  // Sincroniza o texto externo quando não está em edição.
  useEffect(() => {
    if (!editando) setTexto(formatar(valor));
  }, [valor, editando]);

  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-2.5 text-sm font-medium text-muted-foreground">
        R$
      </span>
      <Input
        {...rest}
        ref={ref}
        type="text"
        inputMode="decimal"
        className={`pl-9 tabular-nums ${className ?? ""}`}
        value={editando ? texto : formatar(valor)}
        onFocus={(e) => {
          setEditando(true);
          setTexto(formatar(valor));
          // Seleciona tudo para facilitar a edição rápida.
          requestAnimationFrame(() => e.currentTarget.select());
          rest.onFocus?.(e);
        }}
        onChange={(e) => {
          const t = e.target.value;
          setTexto(t);
          onValor(parse(t));
        }}
        onBlur={(e) => {
          setEditando(false);
          setTexto(formatar(valor));
          rest.onBlur?.(e);
        }}
      />
    </div>
  );
}

import { useState, type ComponentPropsWithoutRef } from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<ComponentPropsWithoutRef<typeof Input>, "value" | "onChange" | "type"> & {
  valor: number;
  onValor: (n: number) => void;
  /** Aceita casas decimais (preços). */
  decimal?: boolean;
};

/**
 * Campo numérico padrão do sistema:
 * - limpa o campo no foco quando o valor é 0;
 * - remove zeros à esquerda (converte "034" em 34);
 * - volta a 0 com segurança quando o usuário deixa vazio.
 */
export function InputNumero({ valor, onValor, decimal = false, ...rest }: Props) {
  const [texto, setTexto] = useState<string | null>(null);
  const exibido = texto ?? String(valor ?? 0);

  return (
    <Input
      {...rest}
      type="number"
      inputMode={decimal ? "decimal" : "numeric"}
      step={decimal ? "0.01" : "1"}
      value={exibido}
      onFocus={(e) => {
        if (Number(exibido) === 0) setTexto("");
        e.currentTarget.select();
        rest.onFocus?.(e);
      }}
      onChange={(e) => {
        const t = e.target.value;
        setTexto(t);
        const n = decimal ? parseFloat(t) : parseInt(t, 10);
        onValor(Number.isFinite(n) ? n : 0);
      }}
      onBlur={(e) => {
        setTexto(null);
        rest.onBlur?.(e);
      }}
    />
  );
}

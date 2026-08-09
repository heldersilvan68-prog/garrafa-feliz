export type TipoEntregador = "entregador" | "auxiliar";

export const TIPOS_ENTREGADOR: { valor: TipoEntregador; label: string }[] = [
  { valor: "entregador", label: "Entregador / Motoboy" },
  { valor: "auxiliar", label: "Auxiliar" },
];

export type Entregador = {
  id: string;
  nome: string;
  telefone: string;
  documento?: string;
  tipo: TipoEntregador;
  ativo: boolean;
  observacoes?: string;
};

/** Opção fixa para vendas retiradas no balcão (não é um cadastro). */
export const BALCAO = "Balcão (retirada)";

export const tipoLabel = (t: TipoEntregador) =>
  TIPOS_ENTREGADOR.find((x) => x.valor === t)?.label ?? t;

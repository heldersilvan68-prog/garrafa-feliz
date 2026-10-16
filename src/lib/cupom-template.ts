import { brl, type Produto } from "@/lib/erp";
import { TIMEZONE } from "@/lib/periodo";
import { BALCAO } from "@/lib/entregadores";
import { parcelasDe, rotuloItemPedido, totalItemPedido, type Pedido } from "@/lib/pedidos";
import { mascaraTelefone, type Cliente } from "@/lib/clientes";

/** Modelo bruto padrão do cupom (texto puro com tags dinâmicas). */
export const MODELO_CUPOM_PADRAO = `================================================
            {nome_empresa}
       {endereco_empresa}
       Telefone: {telefone_empresa}
       Comprovante do Pedido nº {numero_pedido}
            {data_hora}
------------------------------------------------
Cliente: {nome_cliente}
{entregador}
{endereco_cliente}
================================================
ITEM                                       TOTAL
{lista_itens}
================================================
Forma de Pagamento    - {forma_pagamento}
{troco}
{levar}
TOTAL                 - {total_pedido}
================================================
{observacao}

______________________________
Assinatura do cliente

Obrigado pela preferência!
Água boa é água da P.K`;

/**
 * Modelo efetivo a usar: se o modelo salvo estiver vazio ou não contiver
 * nenhuma tag dinâmica (texto fixo legado), cai no padrão com tags.
 */
export function modeloEfetivoCupom(modeloSalvo?: string): string {
  const modelo = modeloSalvo?.trim();
  if (!modelo) return MODELO_CUPOM_PADRAO;
  return /\{[a-z_]+\}/.test(modelo) ? modelo : MODELO_CUPOM_PADRAO;
}

/** Tags dinâmicas disponíveis no modelo do cupom. */
export const TAGS_CUPOM: { tag: string; descricao: string }[] = [
  { tag: "{nome_empresa}", descricao: "Nome da distribuidora" },
  { tag: "{endereco_empresa}", descricao: "Endereço da distribuidora" },
  { tag: "{telefone_empresa}", descricao: "Telefone / WhatsApp" },
  { tag: "{numero_pedido}", descricao: "Número do pedido" },
  { tag: "{data_hora}", descricao: "Data e hora da venda" },
  { tag: "{nome_cliente}", descricao: "Nome do cliente" },
  { tag: "{endereco_cliente}", descricao: "Endereço de entrega" },
  { tag: "{entregador}", descricao: "Entregador (oculto no balcão)" },
  { tag: "{lista_itens}", descricao: "Itens: quantidade, produto e valor" },
  { tag: "{forma_pagamento}", descricao: "Parcelas e fiado" },
  { tag: "{troco}", descricao: "Troco para (quando houver)" },
  { tag: "{levar}", descricao: "Troco a levar (quando houver)" },
  { tag: "{total_pedido}", descricao: "Total do pedido" },
  { tag: "{observacao}", descricao: "Observações (quando houver)" },
];

export type DadosCupom = Record<string, string>;

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Monta o mapa de substituição de um pedido real. */
export function montarDadosCupom(
  pedido: Pedido,
  config: { nomeFantasia?: string; endereco?: string; whatsapp?: string },
  clientes: Cliente[],
  produtos: Produto[],
): DadosCupom {
  const produtosPorId = new Map(produtos.map((p) => [p.id, p]));
  const cliente = pedido.clienteId ? clientes.find((c) => c.id === pedido.clienteId) : undefined;
  const balcao = !pedido.entregador || pedido.entregador === BALCAO;

  const enderecoCompleto =
    pedido.enderecoEntrega?.trim() ||
    [pedido.endereco?.trim() || cliente?.endereco?.trim(), pedido.bairro?.trim() || cliente?.bairro?.trim()]
      .filter(Boolean)
      .join(", ");

  const itens = pedido.itens
    .map((i) => {
      const nome = rotuloItemPedido(i, produtosPorId.get(i.produtoId));
      const unit =
        i.embalagem === "fardo" && i.precoEmbalagem !== undefined
          ? `${brl(i.precoEmbalagem)} / ${i.rotuloEmbalagem || "Fardo"}`
          : `${brl(i.precoUnit)} / un.`;
      return `${nome}  ${brl(totalItemPedido(i))}\n   ${unit}`;
    })
    .join("\n");

  const pagamento = parcelasDe(pedido)
    .map((x) => `${x.forma}  ${brl(x.valor)}`)
    .concat(pedido.valorFiado > 0 ? [`Em fiado  ${brl(pedido.valorFiado)}`] : [])
    .join("\n");

  const troco = pedido.trocoPara ? pedido.trocoPara - pedido.total : 0;

  return {
    nome_empresa: config.nomeFantasia?.trim() || "PK DISTRIBUIDORA",
    endereco_empresa: config.endereco?.trim() || "AV LUIZ VIANA FILHO 285",
    telefone_empresa: config.whatsapp?.trim() ? mascaraTelefone(config.whatsapp) : "(75) 99872-3270",
    numero_pedido: String(pedido.numero),
    data_hora: dataHora(pedido.criadoEm),
    nome_cliente: pedido.clienteNome || "Consumidor Final / Balcão",
    endereco_cliente: enderecoCompleto
      ? `Endereço: ${enderecoCompleto}`
      : balcao
        ? "Entrega: Retirada no Balcão"
        : "",
    entregador: balcao ? "" : `Entregador: ${pedido.entregador}`,
    lista_itens: itens,
    forma_pagamento: pagamento,
    troco: pedido.trocoPara ? `Troco para  ${brl(pedido.trocoPara)}` : "",
    levar: troco > 0 ? `Levar  ${brl(troco)}` : "",
    total_pedido: brl(pedido.total),
    observacao: pedido.observacao?.trim() ? `Obs.: ${pedido.observacao.trim()}` : "",
  };
}

/** Dados fictícios para a pré-visualização ao vivo do editor. */
export function dadosExemploCupom(config: {
  nomeFantasia?: string;
  endereco?: string;
  whatsapp?: string;
}): DadosCupom {
  return {
    nome_empresa: config.nomeFantasia?.trim() || "PK DISTRIBUIDORA",
    endereco_empresa: config.endereco?.trim() || "AV LUIZ VIANA FILHO 285",
    telefone_empresa: config.whatsapp?.trim() ? mascaraTelefone(config.whatsapp) : "(75) 99872-3270",
    numero_pedido: "1234",
    data_hora: "15/10/2026 22:09",
    nome_cliente: "Maria Exemplo",
    endereco_cliente: "Endereço: Rua das Flores, 100, Centro",
    entregador: "Entregador: João",
    lista_itens: `1 un. × Água Mineral 20L  ${brl(11)}\n   ${brl(11)} / un.\n1 un. × Água Mineral 20L (Completo)  ${brl(35)}\n   ${brl(35)} / un.`,
    forma_pagamento: `PIX  ${brl(46)}`,
    troco: `Troco para  ${brl(50)}`,
    levar: `Levar  ${brl(4)}`,
    total_pedido: brl(46),
    observacao: "Obs.: Deixar na portaria",
  };
}

/**
 * Substitui as tags do modelo pelos dados. Linhas que ficam vazias por causa
 * de uma tag opcional ausente (ex.: {troco} sem troco) são removidas.
 */
export function renderizarModeloCupom(modelo: string, dados: DadosCupom): string {
  return modelo
    .split("\n")
    .flatMap((linha) => {
      const soTag = /^\s*\{([a-z_]+)\}\s*$/.exec(linha);
      const resultado = linha.replace(/\{([a-z_]+)\}/g, (_, chave: string) => dados[chave] ?? "");
      // Linha que era só uma tag opcional e ficou vazia: some sem deixar buraco.
      if (soTag && !resultado.trim()) return [];
      return [resultado.replace(/\s+$/g, "")];
    })
    .join("\n");
}

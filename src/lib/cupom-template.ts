import { brl, type Produto } from "@/lib/erp";
import { TIMEZONE } from "@/lib/periodo";
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
Forma de Pagamento    - {nome_forma_pagamento}
Valor pago            - {valor_pagamento}
Troco para            - {valor_troco}
Levar                 - {valor_levar}
TOTAL                 - {total_pedido}
================================================
{observacao}

______________________________
Assinatura do cliente

Obrigado pela preferência!
Água boa é água da P.K`;

/**
 * Usa o padrão somente quando não existe modelo salvo; texto literal e vazio são válidos.
 */
export function modeloEfetivoCupom(modeloSalvo?: string): string {
  return modeloSalvo ?? MODELO_CUPOM_PADRAO;
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
  { tag: "{entregador}", descricao: "Nome do entregador" },
  { tag: "{lista_itens}", descricao: "Itens: quantidade, produto e valor" },
  { tag: "{nome_forma_pagamento}", descricao: "Nomes das formas, um por linha" },
  { tag: "{valor_pagamento}", descricao: "Valores das formas, na mesma ordem" },
  { tag: "{valor_troco}", descricao: "Valor informado em Troco para" },
  { tag: "{valor_levar}", descricao: "Troco a levar, sobre a parcela em dinheiro" },
  { tag: "{forma_pagamento}", descricao: "Compatibilidade: formas e valores" },
  { tag: "{troco}", descricao: "Compatibilidade: valor de Troco para" },
  { tag: "{levar}", descricao: "Compatibilidade: valor do troco a levar" },
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

  const enderecoCompleto =
    pedido.enderecoEntrega?.trim() ||
    [pedido.endereco?.trim() || cliente?.endereco?.trim(), pedido.bairro?.trim() || cliente?.bairro?.trim()]
      .filter(Boolean)
      .join(", ");

  const itens = pedido.itens
    .map((i) => {
      const nome = rotuloItemPedido(i, produtosPorId.get(i.produtoId));
      return `${nome}  ${brl(totalItemPedido(i))}`;
    })
    .join("\n");

  const parcelas = parcelasDe(pedido);
  const pagamento = parcelas.map((x) => `${x.forma}  ${brl(x.valor)}`).join("\n");
  const dinheiro = parcelas.filter(x => x.forma === "Dinheiro").reduce((s, x) => s + x.valor, 0);
  const troco = dinheiro > 0 && pedido.trocoPara ? Math.max(0, pedido.trocoPara - dinheiro) : 0;

  return {
    nome_empresa: config.nomeFantasia ?? "",
    endereco_empresa: config.endereco ?? "",
    telefone_empresa: config.whatsapp ? mascaraTelefone(config.whatsapp) : "",
    numero_pedido: String(pedido.numero),
    data_hora: dataHora(pedido.criadoEm),
    nome_cliente: pedido.clienteNome ?? "",
    endereco_cliente: enderecoCompleto,
    entregador: pedido.entregador ?? "",
    lista_itens: itens,
    forma_pagamento: pagamento,
    nome_forma_pagamento: parcelas.map(x => x.forma).join("\n"),
    valor_pagamento: parcelas.map(x => brl(x.valor)).join("\n"),
    valor_troco: pedido.trocoPara ? brl(pedido.trocoPara) : "",
    valor_levar: troco > 0 ? brl(troco) : "",
    troco: pedido.trocoPara ? brl(pedido.trocoPara) : "",
    levar: troco > 0 ? brl(troco) : "",
    total_pedido: brl(pedido.total),
    observacao: pedido.observacao ?? "",
  };
}

/** Dados fictícios para a pré-visualização ao vivo do editor. */
export function dadosExemploCupom(config: {
  nomeFantasia?: string;
  endereco?: string;
  whatsapp?: string;
}): DadosCupom {
  return {
    nome_empresa: config.nomeFantasia ?? "",
    endereco_empresa: config.endereco ?? "",
    telefone_empresa: config.whatsapp ? mascaraTelefone(config.whatsapp) : "",
    numero_pedido: "1234",
    data_hora: "15/10/2026 22:09",
    nome_cliente: "Maria Exemplo",
    endereco_cliente: "Rua das Flores, 100, Centro",
    entregador: "João",
    lista_itens: `1 un. × Água Mineral 20L  ${brl(11)}\n1 un. × Água Mineral 20L (Completo)  ${brl(35)}`,
    forma_pagamento: `PIX  ${brl(46)}`,
    nome_forma_pagamento: "Dinheiro",
    valor_pagamento: brl(46),
    valor_troco: brl(50),
    valor_levar: brl(4),
    troco: brl(50),
    levar: brl(4),
    total_pedido: brl(46),
    observacao: "Deixar na portaria",
  };
}

/**
 * Substituição literal de dados conhecidos sem tocar em espaços ou quebras.
 */
export function renderizarModeloCupom(modelo: string, dados: DadosCupom): string {
  return modelo.replace(/\{([a-z_]+)\}/g, (tag, chave: string) => dados[chave] ?? tag);
}

export type EstiloCupom = "grande" | "alto" | "negrito" | "pequeno";
export type TrechoCupom = { texto: string; estilos: EstiloCupom[] };
const aliases: Record<string, EstiloCupom> = { G: "grande", A: "alto", N: "negrito", P: "pequeno", grande: "grande", alto: "alto", b: "negrito", pequeno: "pequeno" };

/** Interpreta só os marcadores permitidos do modelo; dados nunca viram HTML ou marcadores. */
export function interpretarCupom(modelo: string, dados: DadosCupom): TrechoCupom[] {
  const trechos: TrechoCupom[] = [];
  const pilha: { nome: string; estilo: EstiloCupom }[] = [];
  const tokens = /\[(\/?)(G|A|N|P)\]|<(\/?)(grande|alto|b|pequeno)>|\{([a-z_]+)\}/g;
  let inicio = 0;
  const adicionar = (texto: string) => { if (texto) trechos.push({ texto, estilos: pilha.map(p => p.estilo) }); };
  for (const match of modelo.matchAll(tokens)) {
    adicionar(modelo.slice(inicio, match.index));
    const tagDados = match[5];
    if (tagDados) adicionar(dados[tagDados] ?? match[0]);
    else {
      const nome = match[2] ?? match[4];
      const fechamento = match[1] === "/" || match[3] === "/";
      const estilo = nome ? aliases[nome] : undefined;
      if (nome && estilo && !fechamento) pilha.push({ nome, estilo });
      else if (fechamento && pilha.at(-1)?.nome === nome) pilha.pop();
      else adicionar(match[0]);
    }
    inicio = match.index + match[0].length;
  }
  adicionar(modelo.slice(inicio));
  return trechos;
}

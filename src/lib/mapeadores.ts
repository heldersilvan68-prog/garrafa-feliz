import type { Categoria, Produto } from "@/lib/erp";
import type { Cliente, Compra } from "@/lib/clientes";
import type { FormaPagamento, ItemPedido, Pedido, StatusPedido } from "@/lib/pedidos";
import type { Caixa, MovimentoCaixa, TipoMovimento } from "@/lib/caixa";
import type { CategoriaDespesa, Despesa, FormaDespesa, StatusDespesa } from "@/lib/despesas";
import type { ModoVenda, MovimentoVasilhame, TipoMovVasilhame } from "@/lib/vasilhames";
import type { Database } from "@/integrations/supabase/types";

type Tabelas = Database["public"]["Tables"];

export type ProdutoRow = Tabelas["products"]["Row"];
export type ClienteRow = Tabelas["clients"]["Row"];
export type CompraRow = Tabelas["client_purchases"]["Row"];
export type PedidoRow = Tabelas["orders"]["Row"];
export type ItemPedidoRow = Tabelas["order_items"]["Row"];
export type PagamentoPedidoRow = Tabelas["order_payments"]["Row"];
export type CaixaRow = Tabelas["cash_registers"]["Row"];
export type MovimentoRow = Tabelas["cash_movements"]["Row"];
export type DespesaRow = Tabelas["expenses"]["Row"];
export type VasilhameRow = Tabelas["returnable_movements"]["Row"];

const num = (v: number | string | null | undefined) => Number(v ?? 0);

export const paraProduto = (r: ProdutoRow): Produto => ({
  id: r.id,
  nome: r.nome,
  categoria: r.categoria as Categoria,
  marca: r.marca ?? undefined,
  unidade: r.unidade ?? undefined,
  precoCusto: num(r.preco_custo),
  precoVenda: num(r.preco_venda),
  estoqueMinimo: r.estoque_minimo,
  retornavel: r.retornavel,
  estoqueCheio: r.estoque_cheio,
  estoqueVazio: r.estoque_vazio,
  custoCasco: num(r.custo_casco),
  custoEnvase: num(r.custo_envase),
});

export const paraCompra = (r: CompraRow): Compra => ({
  id: r.id,
  data: r.data,
  descricao: r.descricao,
  valor: num(r.valor),
});

export const paraCliente = (r: ClienteRow, compras: CompraRow[]): Cliente => ({
  id: r.id,
  codigo: r.code ?? undefined,
  nome: r.nome,
  telefone: r.telefone,
  endereco: r.endereco,
  bairro: r.bairro ?? undefined,
  documento: r.documento ?? undefined,
  cadastradoEm: r.cadastrado_em ?? undefined,
  divida: num(r.divida),
  vasilhamesRua: r.vasilhames_rua ?? 0,
  consumoMedioDias: r.consumo_medio_dias,
  ultimaCompra: r.ultima_compra ?? r.cadastrado_em ?? new Date().toISOString().slice(0, 10),
  historico: compras
    .filter((c) => c.client_id === r.id)
    .sort((a, b) => (a.data < b.data ? 1 : -1))
    .map(paraCompra),
});

export const paraItemPedido = (r: ItemPedidoRow): ItemPedido => ({
  produtoId: r.product_id ?? "",
  nome: r.nome,
  qtd: r.qtd,
  precoUnit: num(r.preco_unit),
  retornavel: r.retornavel,
  modo: (r.modo as ModoVenda | null) ?? "refil",
});

export const paraPedido = (
  r: PedidoRow,
  itens: ItemPedidoRow[],
  pagamentos: PagamentoPedidoRow[] = [],
): Pedido => ({
  id: r.id,
  numero: r.numero,
  clienteId: r.client_id ?? "",
  clienteNome: r.cliente_nome,
  telefone: r.telefone,
  endereco: r.endereco,
  bairro: r.bairro,
  itens: itens.filter((i) => i.order_id === r.id).map(paraItemPedido),
  pagamentos: pagamentos
    .filter((p) => p.order_id === r.id)
    .map((p) => ({ forma: p.forma as FormaPagamento, valor: num(p.valor) })),
  total: num(r.total),
  pagamento: r.pagamento as FormaPagamento,
  pago: r.pago,
  valorFiado: num(r.valor_fiado),
  trocoPara: r.troco_para === null ? undefined : num(r.troco_para),
  vaziosRecolhidos: r.vazios_recolhidos,
  entregador: r.entregador,
  status: r.status as StatusPedido,
  criadoEm: r.created_at,
  observacao: r.observacao ?? undefined,
  motivoCancelamento: r.motivo_cancelamento ?? undefined,
  formaBaixa: (r.forma_baixa as FormaPagamento | null) ?? undefined,
  pagoEm: r.pago_em ?? undefined,
  obsCancelamento: r.obs_cancelamento ?? undefined,
});

export const paraMovimentoVasilhame = (r: VasilhameRow): MovimentoVasilhame => ({
  id: r.id,
  produtoId: r.product_id ?? undefined,
  clienteId: r.client_id ?? undefined,
  tipo: r.tipo as TipoMovVasilhame,
  qtd: r.qtd,
  motivo: r.motivo ?? undefined,
  usuario: r.usuario ?? undefined,
  deltaCheio: r.delta_cheio ?? 0,
  deltaVazio: r.delta_vazio ?? 0,
  deltaPatrimonio: r.delta_patrimonio ?? 0,
  em: r.created_at,
});

export const paraMovimento = (r: MovimentoRow): MovimentoCaixa => ({
  id: r.id,
  tipo: r.tipo as TipoMovimento,
  valor: num(r.valor),
  motivo: r.motivo,
  em: r.created_at,
});

export const paraCaixa = (r: CaixaRow, movimentos: MovimentoRow[]): Caixa => ({
  id: r.id,
  dia: r.dia,
  trocoInicial: num(r.troco_inicial),
  abertoEm: r.aberto_em,
  fechadoEm: r.fechado_em ?? undefined,
  contado: r.contado === null ? undefined : num(r.contado),
  diferenca: r.diferenca === null ? undefined : num(r.diferenca),
  movimentos: movimentos
    .filter((m) => m.cash_register_id === r.id)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .map(paraMovimento),
});

export const paraDespesa = (r: DespesaRow): Despesa => ({
  id: r.id,
  descricao: r.descricao,
  categoria: r.categoria as CategoriaDespesa,
  valor: num(r.valor),
  data: r.data,
  forma: r.forma as FormaDespesa,
  status: r.status as StatusDespesa,
  observacoes: r.observacoes ?? undefined,
  criadoEm: r.created_at,
});

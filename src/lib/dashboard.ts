import type { Produto } from "@/lib/erp";
import type { Cliente } from "@/lib/clientes";
import type { Despesa } from "@/lib/despesas";
import { CORES_CATEGORIA } from "@/lib/despesas";
import { fiadoEmAberto, valorFaturado, valorPorForma, type Pedido } from "@/lib/pedidos";
import {
  INICIO_TUDO,
  dentroFaixa,
  faixaAnterior,
  faixaDeUmDia,
  isoLocal,
  horaLocal,
  somarDiasIso,
  type Faixa,
} from "@/lib/periodo";

export { PERIODOS, faixaPeriodo, isoLocal, type Faixa, type PeriodoId } from "@/lib/periodo";

export type ResumoPeriodo = {
  vendas: number;
  vendasVariacao: number;
  despesas: number;
  despesasVariacao: number;
  /** Despesas ainda pendentes (provisões "a vencer") lançadas no período. */
  despesasPrevistas: number;
  lucroLiquido: number;

  margemBruta: number;
  pedidos: number;
  entregasHoje: number;
  pendentes: number;
  lucroBruto: number;
  custoProduto: number;
  fiado: number;
  compras: number;
  vasilhamesNaRua: number;
  metaVendas: number;
  /** Unidades vendidas hoje agrupadas por produto. */
  volumeHoje: { nome: string; qtd: number }[];
  volumeHojeTotal: number;
  pagamentos: { metodo: string; valor: number }[];
  tendencia: { x: number; v: number }[];
  vendasDia: { rotulo: string; valor: number }[];
  vendasMes: { rotulo: string; valor: number }[];
};

const METODOS = ["PIX", "Dinheiro", "Débito", "Crédito"] as const;

const diaDoPedido = (p: Pedido) => isoLocal(p.criadoEm);

const naFaixa = (iso: string, f: Faixa) => dentroFaixa(iso, f);

const variacao = (atual: number, anterior: number) =>
  anterior > 0 ? ((atual - anterior) / anterior) * 100 : atual > 0 ? 100 : 0;

const validos = (pedidos: Pedido[]) => pedidos.filter((p) => p.status !== "cancelado");

const custo = (p: Pedido, produtos: Produto[]) =>
  p.itens.reduce((s, i) => {
    const prod = produtos.find((x) => x.id === i.produtoId);
    return s + (prod?.precoCusto ?? 0) * i.qtd;
  }, 0);

const rotuloDia = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Calcula todos os indicadores do intervalo a partir dos dados reais do banco. */
export type OpcoesResumo = {
  /** Meta de vendas cadastrada em Configurações. */
  metaVendas?: number;
  hoje?: Date;
};

/** Categorias de despesa que representam compra de mercadoria/estoque. */
const ehCompra = (categoria: string) =>
  /compra|mercadoria|estoque|fornecedor|reposi|insumo|nota/i.test(categoria);

export function calcularResumo(
  faixa: Faixa,
  pedidos: Pedido[],
  despesas: Despesa[],
  produtos: Produto[],
  opcoes: OpcoesResumo = {},
): ResumoPeriodo {
  const hoje = opcoes.hoje ?? new Date();
  const anterior = faixaAnterior(faixa);
  const hojeIso = isoLocal(hoje);

  const ativos = validos(pedidos);
  const doPeriodo = ativos.filter((p) => naFaixa(diaDoPedido(p), faixa));
  const doAnterior = ativos.filter((p) => naFaixa(diaDoPedido(p), anterior));

  // Vendas em Vale não somam faturamento novo (dinheiro entrou na compra do pacote).
  const vendas = doPeriodo.reduce((s, p) => s + valorFaturado(p), 0);
  const vendasAnt = doAnterior.reduce((s, p) => s + valorFaturado(p), 0);
  const custoProduto = doPeriodo.reduce((s, p) => s + custo(p, produtos), 0);

  const pagas = despesas.filter((d) => d.status === "Pago");
  const despesasPeriodo = pagas
    .filter((d) => naFaixa(d.data, faixa))
    .reduce((s, d) => s + d.valor, 0);
  const despesasAnt = pagas
    .filter((d) => naFaixa(d.data, anterior))
    .reduce((s, d) => s + d.valor, 0);
  // Provisões: despesas pendentes ("a vencer") lançadas no período.
  const despesasPrevistas = despesas
    .filter((d) => d.status === "Pendente" && naFaixa(d.data, faixa))
    .reduce((s, d) => s + d.valor, 0);

  const lucroBruto = vendas - custoProduto;
  const lucroLiquido = lucroBruto - despesasPeriodo;

  const fiado = doPeriodo
    .filter(fiadoEmAberto)
    .reduce((s, p) => s + (p.valorFiado > 0 ? p.valorFiado : p.total), 0);

  const pagamentos = METODOS.map((metodo) => ({
    metodo,
    valor: doPeriodo.reduce((s, p) => {
      // Fiado quitado entra pela forma efetiva da baixa.
      if (p.pago && p.formaBaixa === metodo) {
        s += valorPorForma(p, "Fiado") || (p.pagamento === "Fiado" ? p.total : 0);
      }
      return s + valorPorForma(p, metodo);
    }, 0),
  }));

  // Compras = exclusivamente as despesas de mercadoria/reposição pagas no período.
  // Ajustes de quantidade física no estoque NÃO entram aqui.
  const compras = pagas
    .filter((d) => naFaixa(d.data, faixa) && ehCompra(d.categoria))
    .reduce((s, d) => s + d.valor, 0);

  const vendidosRetornaveis = ativos.reduce(
    (s, p) => s + p.itens.filter((i) => i.retornavel).reduce((t, i) => t + i.qtd, 0),
    0,
  );
  const recolhidos = ativos.reduce((s, p) => s + p.vaziosRecolhidos, 0);
  const vasilhamesNaRua = Math.max(0, vendidosRetornaveis - recolhidos);

  // Volume vendido hoje: unidades por produto nos pedidos do dia atual.
  const mapaVolume = new Map<string, number>();
  for (const p of ativos.filter((x) => diaDoPedido(x) === hojeIso)) {
    for (const i of p.itens) {
      mapaVolume.set(i.nome, (mapaVolume.get(i.nome) ?? 0) + i.qtd);
    }
  }
  const volumeHoje = [...mapaVolume.entries()]
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd);
  const volumeHojeTotal = volumeHoje.reduce((s, v) => s + v.qtd, 0);

  // Séries reais
  let vendasDia: { rotulo: string; valor: number }[] = [];
  if (faixaDeUmDia(faixa)) {
    vendasDia = Array.from({ length: 8 }, (_, i) => {
      const h = 8 + i * 2;
      const valor = doPeriodo
        .filter((p) => {
          const hora = horaLocal(p.criadoEm);
          return hora >= h && hora < h + 2;
        })
        .reduce((s, p) => s + valorFaturado(p), 0);
      return { rotulo: `${String(h).padStart(2, "0")}h`, valor };
    });
  } else {
    const dias: string[] = [];
    let cursorIso =
      faixa.inicio === INICIO_TUDO ? somarDiasIso(hojeIso, -13) : faixa.inicio;
    while (cursorIso <= faixa.fim && cursorIso <= hojeIso) {
      dias.push(cursorIso);
      cursorIso = somarDiasIso(cursorIso, 1);
    }
    vendasDia = dias.map((iso) => ({
      rotulo: rotuloDia(iso),
      valor: ativos
        .filter((p) => diaDoPedido(p) === iso)
        .reduce((s, p) => s + valorFaturado(p), 0),
    }));
  }

  const vendasMes = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - (5 - i), 1);
    const prefixo = isoLocal(d).slice(0, 7);
    return {
      rotulo: MESES[d.getMonth()],
      valor: ativos
        .filter((p) => diaDoPedido(p).startsWith(prefixo))
        .reduce((s, p) => s + valorFaturado(p), 0),
    };
  });

  return {
    vendas,
    vendasVariacao: variacao(vendas, vendasAnt),
    despesas: despesasPeriodo,
    despesasVariacao: variacao(despesasPeriodo, despesasAnt),
    despesasPrevistas,

    lucroLiquido,
    margemBruta: vendas > 0 ? (lucroBruto / vendas) * 100 : 0,
    pedidos: doPeriodo.length,
    entregasHoje: ativos.filter((p) => p.status === "concluido" && diaDoPedido(p) === hojeIso)
      .length,
    pendentes: ativos.filter((p) => p.status === "pendente" || p.status === "em-rota").length,
    lucroBruto,
    custoProduto,
    fiado,
    compras,
    vasilhamesNaRua,
    metaVendas: opcoes.metaVendas ?? 0,
    volumeHoje,
    volumeHojeTotal,
    pagamentos,
    tendencia: vendasDia.map((d, x) => ({ x, v: d.valor })),
    vendasDia,
    vendasMes,
  };
}

export function despesasPorCategoria(despesas: Despesa[], faixa: Faixa) {
  const mapa = new Map<string, number>();
  for (const d of despesas.filter((d) => naFaixa(d.data, faixa))) {
    mapa.set(d.categoria, (mapa.get(d.categoria) ?? 0) + d.valor);
  }
  return [...mapa.entries()]
    .map(([categoria, valor]) => ({
      categoria,
      valor,
      cor: CORES_CATEGORIA[categoria as keyof typeof CORES_CATEGORIA] ?? "var(--color-primary)",
    }))
    .sort((a, b) => b.valor - a.valor);
}

export function coberturaProdutos(produtos: Produto[], pedidos: Pedido[], hoje = new Date()) {
  const prefixo = isoLocal(hoje).slice(0, 7);
  const doMes = validos(pedidos).filter((p) => diaDoPedido(p).startsWith(prefixo));
  const dias = hoje.getDate();
  return produtos.map((prod) => {
    const vendidosMes = doMes.reduce(
      (s, p) => s + p.itens.filter((i) => i.produtoId === prod.id).reduce((t, i) => t + i.qtd, 0),
      0,
    );
    const mediaDia = vendidosMes / Math.max(1, dias);
    return {
      id: prod.id,
      nome: prod.nome,
      vendidosMes,
      mediaDia: Math.round(mediaDia * 10) / 10,
      emEstoque: prod.estoqueCheio,
      cobertura: mediaDia > 0 ? prod.estoqueCheio / mediaDia : Infinity,
    };
  });
}

export function clientesParaCobrar(pedidos: Pedido[], clientes: Cliente[]) {
  const abertos = validos(pedidos).filter(fiadoEmAberto);
  const mapa = new Map<
    string,
    { id: string; nome: string; valor: number; dias: number; telefone: string }
  >();
  for (const p of abertos) {
    const chave = p.clienteId || p.clienteNome;
    const dias = Math.max(
      0,
      Math.floor((Date.now() - new Date(p.criadoEm).getTime()) / 86_400_000),
    );
    const atual = mapa.get(chave);
    const telefone = p.telefone || clientes.find((c) => c.id === p.clienteId)?.telefone || "";
    mapa.set(chave, {
      id: chave,
      nome: p.clienteNome || "Cliente sem nome",
      valor: (atual?.valor ?? 0) + p.total,
      dias: Math.max(atual?.dias ?? 0, dias),
      telefone,
    });
  }
  return [...mapa.values()].sort((a, b) => b.valor - a.valor);
}

export function contasAPagar(despesas: Despesa[]) {
  return despesas
    .filter((d) => d.status === "Pendente")
    .sort((a, b) => a.data.localeCompare(b.data))
    .map((d) => ({
      id: d.id,
      descricao: d.descricao || d.categoria,
      valor: d.valor,
      vencimento: rotuloDia(d.data),
      status: d.data <= isoLocal(new Date()) ? "Urgente" : "A vencer",
    }));
}

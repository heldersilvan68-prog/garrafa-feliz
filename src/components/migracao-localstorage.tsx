import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Cliente } from "@/lib/clientes";
import type { Produto } from "@/lib/erp";
import type { Despesa } from "@/lib/despesas";
import type { Pedido } from "@/lib/pedidos";
import type { Caixa, PagamentoComissao, RegraComissao, Vale } from "@/lib/caixa";

const CHAVES = {
  produtos: "erp-agua-produtos-v1",
  clientes: "erp-agua-clientes-v1",
  pedidos: "erp-agua-pedidos-v1",
  caixa: "erp-agua-caixa-v1",
  despesas: "erp-agua-despesas-v1",
};

const MARCA = "erp-agua-migrado-cloud-v1";

const ler = <T,>(chave: string): T | null => {
  try {
    const raw = localStorage.getItem(chave);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};

type EstadoCaixa = {
  caixas?: Caixa[];
  regras?: RegraComissao[];
  vales?: Vale[];
  pagamentos?: PagamentoComissao[];
};

/**
 * Envia, uma única vez por usuário, os dados que ficaram salvos no navegador
 * (localStorage) para o banco na nuvem. Nada é semeado: se não houver dados
 * locais, o painel começa zerado e passa a refletir apenas o uso real.
 */
async function migrar(userId: string) {
  const produtosLocais = ler<Produto[]>(CHAVES.produtos);
  const clientesLocais = ler<Cliente[]>(CHAVES.clientes);
  const pedidosLocais = ler<Pedido[]>(CHAVES.pedidos) ?? [];
  const despesasLocais = ler<Despesa[]>(CHAVES.despesas) ?? [];
  const caixaLocal = ler<EstadoCaixa>(CHAVES.caixa) ?? {};

  const produtos = produtosLocais ?? [];
  const clientes = clientesLocais ?? [];


  const mapaProduto = new Map<string, string>();
  const mapaCliente = new Map<string, string>();
  let importados = 0;

  // Produtos
  if (produtos.length > 0) {
    const { data: produtosCriados, error: erroProdutos } = await supabase
      .from("products")
      .insert(
        produtos.map((p) => ({
          user_id: userId,
          legacy_id: p.id,
          nome: p.nome,
          categoria: p.categoria,
          preco_custo: p.precoCusto,
          preco_venda: p.precoVenda,
          estoque_minimo: p.estoqueMinimo,
          retornavel: p.retornavel,
          estoque_cheio: p.estoqueCheio,
          estoque_vazio: p.estoqueVazio,
        })),
      )
      .select("id, legacy_id");
    if (erroProdutos) throw erroProdutos;
    for (const p of produtosCriados ?? []) if (p.legacy_id) mapaProduto.set(p.legacy_id, p.id);
  }

  // Clientes
  if (clientes.length > 0) {
    const { data: clientesCriados, error: erroClientes } = await supabase
      .from("clients")
      .insert(
        clientes.map((c) => ({
          user_id: userId,
          legacy_id: c.id,
          nome: c.nome,
          telefone: c.telefone,
          endereco: c.endereco,
          bairro: c.bairro ?? null,
          documento: c.documento ?? null,
          divida: c.divida ?? 0,
          consumo_medio_dias: c.consumoMedioDias,
          ultima_compra: c.ultimaCompra,
        })),
      )
      .select("id, legacy_id");
    if (erroClientes) throw erroClientes;
    for (const c of clientesCriados ?? []) if (c.legacy_id) mapaCliente.set(c.legacy_id, c.id);
  }


  // Histórico de compras dos clientes
  const historico = clientes.flatMap((c) =>
    (c.historico ?? []).map((h) => ({
      user_id: userId,
      client_id: mapaCliente.get(c.id)!,
      data: h.data,
      descricao: h.descricao,
      valor: h.valor,
    })),
  );
  if (historico.length > 0) {
    const { error } = await supabase.from("client_purchases").insert(historico);
    if (error) throw error;
  }

  // Caixas + movimentos
  const mapaCaixa = new Map<string, string>();
  for (const caixa of caixaLocal.caixas ?? []) {
    const { data: criado, error } = await supabase
      .from("cash_registers")
      .insert({
        user_id: userId,
        legacy_id: caixa.id,
        dia: caixa.dia,
        troco_inicial: caixa.trocoInicial,
        aberto_em: caixa.abertoEm,
        fechado_em: caixa.fechadoEm ?? null,
        contado: caixa.contado ?? null,
        diferenca: caixa.diferenca ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    mapaCaixa.set(caixa.id, criado.id);
    importados++;

    if (caixa.movimentos?.length) {
      const { error: erroMov } = await supabase.from("cash_movements").insert(
        caixa.movimentos.map((m) => ({
          user_id: userId,
          cash_register_id: criado.id,
          tipo: m.tipo,
          valor: m.valor,
          motivo: m.motivo,
          created_at: m.em,
        })),
      );
      if (erroMov) throw erroMov;
    }
  }

  // Pedidos + itens
  for (const pedido of pedidosLocais) {
    const { data: criado, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        legacy_id: pedido.id,
        numero: pedido.numero,
        client_id: mapaCliente.get(pedido.clienteId) ?? null,
        cliente_nome: pedido.clienteNome,
        telefone: pedido.telefone,
        endereco: pedido.endereco,
        bairro: pedido.bairro,
        total: pedido.total,
        pagamento: pedido.pagamento,
        pago: pedido.pago,
        troco_para: pedido.trocoPara ?? null,
        vazios_recolhidos: pedido.vaziosRecolhidos,
        entregador: pedido.entregador,
        status: pedido.status,
        observacao: pedido.observacao ?? null,
        motivo_cancelamento: pedido.motivoCancelamento ?? null,
        obs_cancelamento: pedido.obsCancelamento ?? null,
        forma_baixa: pedido.formaBaixa ?? null,
        pago_em: pedido.pagoEm ?? null,
        created_at: pedido.criadoEm,
      })
      .select("id")
      .single();
    if (error) throw error;
    importados++;

    if (pedido.itens?.length) {
      const { error: erroItens } = await supabase.from("order_items").insert(
        pedido.itens.map((i) => ({
          user_id: userId,
          order_id: criado.id,
          product_id: mapaProduto.get(i.produtoId) ?? null,
          nome: i.nome,
          qtd: i.qtd,
          preco_unit: i.precoUnit,
          retornavel: i.retornavel,
        })),
      );
      if (erroItens) throw erroItens;
    }

    if (pedido.vaziosRecolhidos > 0) {
      const { error: erroVazios } = await supabase.from("returnable_movements").insert({
        user_id: userId,
        order_id: criado.id,
        tipo: "recolhido" as const,
        qtd: pedido.vaziosRecolhidos,
        created_at: pedido.criadoEm,
      });
      if (erroVazios) throw erroVazios;
    }
  }

  // Comissões
  if (caixaLocal.regras?.length) {
    const { error } = await supabase.from("commission_rules").upsert(
      caixaLocal.regras.map((r) => ({
        user_id: userId,
        entregador: r.entregador,
        por_unidade: r.porUnidade,
        percentual: r.percentual,
      })),
      { onConflict: "user_id,entregador" },
    );
    if (error) throw error;
  }
  if (caixaLocal.vales?.length) {
    const { error } = await supabase.from("commission_advances").insert(
      caixaLocal.vales.map((v) => ({
        user_id: userId,
        entregador: v.entregador,
        valor: v.valor,
        motivo: v.motivo,
        created_at: v.em,
      })),
    );
    if (error) throw error;
    importados += caixaLocal.vales.length;
  }
  if (caixaLocal.pagamentos?.length) {
    const { error } = await supabase.from("commission_payments").insert(
      caixaLocal.pagamentos.map((p) => ({
        user_id: userId,
        entregador: p.entregador,
        valor: p.valor,
        created_at: p.em,
      })),
    );
    if (error) throw error;
    importados += caixaLocal.pagamentos.length;
  }

  // Despesas
  if (despesasLocais.length > 0) {
    const { data: categorias } = await supabase.from("expense_categories").select("id, nome");
    const { error } = await supabase.from("expenses").insert(
      despesasLocais.map((d) => ({
        user_id: userId,
        legacy_id: d.id,
        descricao: d.descricao,
        categoria: d.categoria,
        category_id: categorias?.find((c) => c.nome === d.categoria)?.id ?? null,
        valor: d.valor,
        data: d.data,
        forma: d.forma,
        status: d.status,
        observacoes: d.observacoes ?? null,
        created_at: d.criadoEm,
      })),
    );
    if (error) throw error;
    importados += despesasLocais.length;
  }

  return importados;
}

export function MigracaoLocalStorage() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const rodou = useRef(false);

  useEffect(() => {
    if (!userId || rodou.current) return;
    rodou.current = true;

    const marca = `${MARCA}:${userId}`;
    if (localStorage.getItem(marca)) return;

    (async () => {
      const { count, error } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true });
      if (error) return;
      if ((count ?? 0) > 0) {
        localStorage.setItem(marca, "ja-tinha-dados");
        return;
      }

      const aviso = toast.loading("Migrando seus dados para a nuvem...");
      try {
        const importados = await migrar(userId);
        localStorage.setItem(marca, new Date().toISOString());
        await queryClient.invalidateQueries();
        toast.success(
          importados > 0
            ? "Dados migrados para a nuvem com sucesso!"
            : "Catálogo inicial criado na nuvem!",
          { id: aviso },
        );
      } catch (e) {
        toast.error(`Falha ao migrar os dados: ${(e as Error).message}`, { id: aviso });
      }
    })();
  }, [userId, queryClient]);

  return null;
}

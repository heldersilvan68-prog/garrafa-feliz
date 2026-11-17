import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const sessionText = process.env.LOVABLE_BROWSER_SUPABASE_SESSION_JSON;
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

describe("exclusão definitiva de vendas (dados isolados)", { skip: !sessionText || !url || !key }, () => {
  async function preparar(status: "concluido" | "cancelado" = "concluido") {
    if (!sessionText || !url || !key) throw new Error("Sessão de teste indisponível");
    const session = JSON.parse(sessionText);
    const db = createClient<Database>(url, key, { global: { headers: { Authorization: `Bearer ${session.access_token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    const user_id = session.user.id as string;
    const tag = crypto.randomUUID();
    const client = await db.from("clients").insert({ user_id, nome: `Teste exclusão ${tag}`, vales_saldo: status === "cancelado" ? 3 : 2, saldo_credito: status === "cancelado" ? 10 : 5, vasilhames_rua: status === "cancelado" ? 0 : 1 }).select().single();
    if (client.error) throw client.error;
    const product = await db.from("products").insert({ user_id, nome: `Teste exclusão ${tag}`, categoria: "Teste", retornavel: true, estoque_cheio: status === "cancelado" ? 10 : 9, estoque_vazio: 4, patrimonio_cascos: 14 }).select().single();
    if (product.error) throw product.error;
    const order = await db.from("orders").insert({ user_id, numero: Math.floor(Math.random() * 100000000) + 100000000, cliente_nome: client.data.nome, client_id: client.data.id, status, pagamento: "Vale", pago: true, total: 12, vales_resgatados: 1, credito_usado: 5, entregador: "Balcão" }).select().single();
    if (order.error) throw order.error;
    for (const result of await Promise.all([
      db.from("order_items").insert({ user_id, order_id: order.data.id, product_id: product.data.id, nome: product.data.nome, qtd: 1, preco_unit: 12, retornavel: true, modo: "refil" }),
      db.from("order_payments").insert({ user_id, order_id: order.data.id, forma: "Vale", valor: 12 }),
      db.from("client_purchases").insert({ user_id, order_id: order.data.id, client_id: client.data.id, descricao: "Teste isolado", data: "2026-11-17", valor: 12 }),
      db.from("returnable_movements").insert({ user_id, order_id: order.data.id, product_id: product.data.id, tipo: "recolhido", qtd: 1, delta_cheio: status === "cancelado" ? 0 : -1 }),
    ])) if (result.error) throw result.error;
    return { db, order: order.data, product: product.data, client: client.data,
      async limpar() {
        await db.from("returnable_movements").delete().eq("order_id", order.data.id);
        await db.from("client_purchases").delete().eq("order_id", order.data.id);
        await db.from("orders").delete().eq("id", order.data.id);
        await db.from("clients").delete().eq("id", client.data.id);
        await db.from("products").delete().eq("id", product.data.id);
      } };
  }
  it("remove venda e históricos e devolve um vale mesmo com preço lançado de R$ 12", async () => {
    const f = await preparar();
    try {
      const result = await f.db.rpc("excluir_venda_definitiva", { _order_id: f.order.id, _numero: f.order.numero });
      assert.equal(result.error, null);
      const orderRows = await f.db.from("orders").select("id").eq("id", f.order.id);
      assert.equal(orderRows.error, null);
      assert.equal(orderRows.data?.length, 0);
      for (const table of ["order_items", "order_payments", "client_purchases", "returnable_movements"] as const) {
        const rows = await f.db.from(table).select("id").eq("order_id", f.order.id);
        assert.equal(rows.error, null);
        assert.equal(rows.data?.length, 0, table);
      }
      const c = await f.db.from("clients").select().eq("id", f.client.id).single();
      assert.equal(c.data?.vales_saldo, 3);
      assert.equal(Number(c.data?.saldo_credito), 10);
      assert.equal(c.data?.vasilhames_rua, 0);
      const p = await f.db.from("products").select().eq("id", f.product.id).single();
      assert.equal(p.data?.estoque_cheio, 10);
    } finally { await f.limpar(); }
  });
  it("não estorna novamente uma venda já cancelada", async () => {
    const f = await preparar("cancelado");
    try {
      const result = await f.db.rpc("excluir_venda_definitiva", { _order_id: f.order.id, _numero: f.order.numero });
      assert.equal(result.error, null);
      const p = await f.db.from("products").select().eq("id", f.product.id).single();
      const c = await f.db.from("clients").select().eq("id", f.client.id).single();
      assert.equal(p.data?.estoque_cheio, 10);
      assert.equal(c.data?.vales_saldo, 3);
      assert.equal(Number(c.data?.saldo_credito), 10);
    } finally { await f.limpar(); }
  });
  it("recusa número errado sem excluir ou alterar os saldos", async () => {
    const f = await preparar();
    try {
      const result = await f.db.rpc("excluir_venda_definitiva", { _order_id: f.order.id, _numero: 0 });
      assert.ok(result.error);
      const o = await f.db.from("orders").select("id").eq("id", f.order.id).single();
      assert.equal(o.data?.id, f.order.id);
      const c = await f.db.from("clients").select("vales_saldo").eq("id", f.client.id).single();
      assert.equal(c.data?.vales_saldo, 2);
    } finally { await f.limpar(); }
  });
});
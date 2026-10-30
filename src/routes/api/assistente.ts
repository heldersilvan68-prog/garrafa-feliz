import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const SYSTEM = (hoje: string) => `Você é a "Fonte", assistente de gestão de uma distribuidora de água e gás na Bahia.
Hoje é ${hoje} (fuso America/Bahia). Responda sempre em português do Brasil, de forma direta e objetiva, em Markdown (negrito, listas e tabelas curtas quando ajudarem).

Regras:
- Use SEMPRE as ferramentas para buscar os dados reais antes de responder qualquer número. Nunca invente valores.
- "Este mês" = do dia 1 do mês atual até hoje. "Esta semana" = de domingo até hoje. "Hoje" = só hoje. "Mês passado" = mês anterior completo.
- Para vendas, lucro, produtos vendidos, entregadores, melhores dias/meses, despesas e formas de pagamento, use analisar_periodo.
- Para cadastros e listas (clientes com fiado, estoque, vasilhames na rua, pedidos específicos, despesas individuais), use consultar_registros.
- Valores em R$ com duas casas (ex.: R$ 1.234,50). Explique de forma simples quando citar lucro: lucro líquido = faturamento − custo das mercadorias − taxas de cartão − despesas.
- Ao final, quando fizer sentido, dê uma sugestão prática curta para o negócio.`;

const Corpo = z.object({
  threadId: z.string().uuid(),
  messages: z.array(z.any()).min(1).max(200),
});

function criarCliente(token: string) {
  return import("@supabase/supabase-js").then(({ createClient }) => {
    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    return createClient<import("@/integrations/supabase/types").Database>(url, key, {
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
  });
}

const json = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });

export const Route = createFileRoute("/api/assistente")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return json(500, "IA não configurada.");
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
        if (token.split(".").length !== 3) return json(401, "Faça login novamente.");
        const supabase = await criarCliente(token);
        const { data: claims, error: erroAuth } = await supabase.auth.getClaims(token);
        const userId = claims?.claims?.sub;
        if (erroAuth || !userId) return json(401, "Faça login novamente.");

        const parsed = Corpo.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json(400, "Requisição inválida.");
        const { threadId } = parsed.data;

        const { data: thread } = await supabase
          .from("ai_threads")
          .select("id, titulo")
          .eq("id", threadId)
          .maybeSingle();
        if (!thread) return json(404, "Conversa não encontrada.");

        const ai = await import("ai");
        const { createOpenAI } = await import("@ai-sdk/openai");
        const { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } =
          await import("@/server/ai/run-id");
        const messages = parsed.data.messages as import("ai").UIMessage[];

        // Salva a pergunta do usuário antes de responder.
        const ultima = messages[messages.length - 1];
        if (ultima?.role === "user") {
          const { error } = await supabase.from("ai_messages").upsert(
            { thread_id: threadId, user_id: userId, message_id: ultima.id, role: "user", parts: ultima.parts as never },
            { onConflict: "thread_id,message_id" },
          );
          if (error) return json(500, "Não foi possível salvar a mensagem.");
          const texto = ultima.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join(" ")
            .trim();
          await supabase
            .from("ai_threads")
            .update({
              updated_at: new Date().toISOString(),
              ...(thread.titulo === "Nova conversa" && texto ? { titulo: texto.slice(0, 60) } : {}),
            })
            .eq("id", threadId);
        }

        // Dados carregados uma única vez por pergunta (RLS restringe à empresa do usuário).
        let cache: Promise<Awaited<ReturnType<typeof carregar>>> | null = null;
        async function carregar() {
          const { buscarTodos } = await import("@/lib/supabase-paginado");
          const m = await import("@/lib/mapeadores");
          const [pedidos, itens, pagos, produtos, despesas, equipe] = await Promise.all([
            buscarTodos<import("@/lib/mapeadores").PedidoRow>((de, ate) =>
              supabase.from("orders").select("*").order("created_at", { ascending: false }).range(de, ate),
            ),
            buscarTodos<import("@/lib/mapeadores").ItemPedidoRow>((de, ate) =>
              supabase.from("order_items").select("*").range(de, ate),
            ),
            buscarTodos<import("@/lib/mapeadores").PagamentoPedidoRow>((de, ate) =>
              supabase.from("order_payments").select("*").range(de, ate),
            ),
            buscarTodos<import("@/lib/mapeadores").ProdutoRow>((de, ate) =>
              supabase.from("products").select("*").range(de, ate),
            ),
            buscarTodos<import("@/lib/mapeadores").DespesaRow>((de, ate) =>
              supabase.from("expenses").select("*").range(de, ate),
            ),
            buscarTodos<{ nome: string }>((de, ate) => supabase.from("deliverers").select("nome").range(de, ate)),
          ]);
          return {
            pedidos: m.mapearPedidos(pedidos, itens, pagos),
            produtos: produtos.map(m.paraProduto),
            despesas: despesas.map(m.paraDespesa),
            equipe: equipe.map((e) => e.nome),
          };
        }
        const dados = () => (cache ??= carregar());

        const Data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
        const tools = {
          analisar_periodo: ai.tool({
            description:
              "Analisa vendas, faturamento, lucro, CMV, despesas, produtos vendidos (quantidades), entregadores, clientes, melhores dias/meses, formas de pagamento e estoque num período.",
            inputSchema: z.object({ inicio: Data.describe("Data inicial yyyy-mm-dd"), fim: Data.describe("Data final yyyy-mm-dd") }),
            execute: async ({ inicio, fim }) => {
              const d = await dados();
              const { resumoParaAssistente } = await import("@/lib/assistente");
              return resumoParaAssistente({ inicio, fim }, d.pedidos, d.despesas, d.produtos, d.equipe);
            },
          }),
          consultar_registros: ai.tool({
            description:
              "Consulta registros: clientes (dívida/fiado, créditos, vasilhames na rua, última compra), produtos (estoque, preços, custos), entregadores, despesas (com status e categoria) ou pedidos individuais de um período.",
            inputSchema: z.object({
              tipo: z.enum(["clientes", "produtos", "entregadores", "despesas", "pedidos"]),
              busca: z.string().nullable().describe("Texto para filtrar por nome/descrição, ou null"),
              inicio: Data.nullable().describe("Data inicial para despesas/pedidos, ou null"),
              fim: Data.nullable().describe("Data final para despesas/pedidos, ou null"),
              limite: z.number().int().min(1).max(100).nullable(),
            }),
            execute: async ({ tipo, busca, inicio, fim, limite }) => {
              const n = limite ?? 30;
              const q = busca?.trim() ? `%${busca.trim()}%` : null;
              if (tipo === "clientes") {
                let c = supabase
                  .from("clients")
                  .select("code, nome, telefone, bairro, divida, saldo_credito, vales_saldo, vasilhames_rua, ultima_compra, limite_fiado")
                  .order("divida", { ascending: false })
                  .limit(n);
                if (q) c = c.ilike("nome", q);
                const { data, error } = await c;
                return error ? { erro: error.message } : data;
              }
              if (tipo === "produtos") {
                const d = await dados();
                const { rotuloQuantidadeProduto } = await import("@/lib/erp");
                return d.produtos
                  .filter((p) => !q || p.nome.toLowerCase().includes(busca!.trim().toLowerCase()))
                  .slice(0, n)
                  .map((p) => ({
                    nome: p.nome,
                    categoria: p.categoria,
                    preco_venda: p.precoVenda,
                    preco_custo: p.precoCusto,
                    estoque_cheio: rotuloQuantidadeProduto(p.estoqueCheio, p),
                    estoque_vazio: p.estoqueVazio,
                    estoque_minimo: p.estoqueMinimo,
                    retornavel: p.retornavel,
                  }));
              }
              if (tipo === "entregadores") {
                const { data, error } = await supabase.from("deliverers").select("nome, tipo, ativo, telefone").limit(n);
                return error ? { erro: error.message } : data;
              }
              if (tipo === "despesas") {
                let c = supabase
                  .from("expenses")
                  .select("data, descricao, categoria, valor, status, forma")
                  .order("data", { ascending: false })
                  .limit(n);
                if (inicio) c = c.gte("data", inicio);
                if (fim) c = c.lte("data", fim);
                if (q) c = c.ilike("descricao", q);
                const { data, error } = await c;
                return error ? { erro: error.message } : data;
              }
              let c = supabase
                .from("orders")
                .select("numero, created_at, cliente_nome, entregador, status, total, pagamento, pago, valor_fiado, bairro")
                .order("created_at", { ascending: false })
                .limit(n);
              if (inicio) c = c.gte("created_at", `${inicio}T00:00:00-03:00`);
              if (fim) c = c.lte("created_at", `${fim}T23:59:59.999-03:00`);
              if (q) c = c.ilike("cliente_nome", q);
              const { data, error } = await c;
              return error ? { erro: error.message } : data;
            },
          }),
        };

        const { isoLocal } = await import("@/lib/periodo");
        const diaSemana = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Bahia", weekday: "long" }).format(new Date());
        const runIdFetch = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
        const provider = createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey,
          headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
          fetch: runIdFetch.fetch,
        });
        const result = ai.streamText({
          model: provider.responses("openai/gpt-6-astra"),
          instructions: SYSTEM(`${isoLocal(new Date())} (${diaSemana})`),
          messages: await ai.convertToModelMessages(messages),
          tools,
          stopWhen: ai.isStepCount(8),
          abortSignal: request.signal,
          providerOptions: {
            openai: {
              forceReasoning: true,
              reasoningEffort: "low",
              reasoningSummary: "auto",
              store: false,
              include: ["reasoning.encrypted_content"],
            },
          },
        });

        return withLovableAiGatewayRunIdHeader(
          result.toUIMessageStreamResponse({
            originalMessages: messages,
            sendReasoning: true,
            generateMessageId: () => crypto.randomUUID(),
            onError: (e) => {
              const err = e as { statusCode?: number; message?: string };
              if (err?.statusCode === 429) return "Muitas perguntas seguidas. Aguarde um instante e tente de novo.";
              if (err?.statusCode === 402) return "Os créditos de IA acabaram. Adicione créditos para continuar.";
              console.error("[assistente]", e);
              return "Não consegui responder agora. Tente novamente.";
            },
            onFinish: async ({ responseMessage }) => {
              if (!responseMessage?.parts?.length) return;
              const { error } = await supabase.from("ai_messages").upsert(
                {
                  thread_id: threadId,
                  user_id: userId,
                  message_id: responseMessage.id,
                  role: "assistant",
                  parts: responseMessage.parts as never,
                },
                { onConflict: "thread_id,message_id" },
              );
              if (error) console.error("[assistente] falha ao salvar resposta", error);
            },
          }),
          runIdFetch,
        );
      },
    },
  },
});

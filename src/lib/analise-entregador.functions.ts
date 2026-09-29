import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Metricas = z.object({
  entregas: z.number(),
  faturamento: z.number(),
  lucro: z.number(),
  produtos: z.array(
    z.object({ nome: z.string(), qtd: z.number(), quantidadeFormatada: z.string(), valor: z.number() }),
  ),
  porDia: z.array(z.object({ dia: z.string(), entregas: z.number(), faturamento: z.number() })),
});

export const analisarEntregador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        entregador: z.string().min(1).max(120),
        periodo: z.string().max(80),
        periodoAnterior: z.string().max(80),
        atual: Metricas,
        anterior: Metricas,
        mediaEquipe: z.object({ entregas: z.number(), faturamento: z.number(), lucro: z.number() }),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Chave de IA não configurada.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText } = await import("ai");
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    let erro: unknown = null;
    const result = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system:
        "Você é um analista de operações de uma distribuidora de água e gás na Bahia. Responda em português do Brasil, em Markdown simples (títulos ###, listas), no máximo ~350 palavras. Estruture: ### Resumo, ### Tendências, ### Produtos, ### Oportunidades de melhoria (ações práticas e específicas). Use os números fornecidos; valores em R$. Não invente dados.",
      prompt: `Analise o desempenho do entregador a seguir.\n\n${JSON.stringify(data, null, 2)}`,
      onError: ({ error }) => {
        erro = error;
      },
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
    const texto = await result.text;
    if (erro || !texto) {
      const e = erro as { statusCode?: number; message?: string } | null;
      if (e?.statusCode === 429) throw new Error("Muitas solicitações. Tente novamente em instantes.");
      if (e?.statusCode === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
      throw new Error(e?.message || "A IA não retornou análise.");
    }
    return { texto };
  });

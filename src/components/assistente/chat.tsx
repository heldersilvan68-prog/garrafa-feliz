import { useEffect, useMemo, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/assistente-fonte.png";

const SUGESTOES = [
  "Quantas águas vendi este mês e quanto de lucro me deu?",
  "Qual entregador mais vendeu esta semana?",
  "Qual foi meu melhor dia de vendas este mês?",
  "Quais clientes estão devendo mais no fiado?",
];

const NOMES_FERRAMENTA: Record<string, string> = {
  analisar_periodo: "Analisando vendas e resultados",
  consultar_registros: "Consultando cadastros",
};

export function ChatAssistente({ threadId, iniciais }: { threadId: string; iniciais: UIMessage[] }) {
  const queryClient = useQueryClient();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/assistente",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );
  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: iniciais,
    transport,
    onError: (e) => {
      let msg = e.message;
      try {
        msg = JSON.parse(e.message).error ?? msg;
      } catch {
        /* texto simples */
      }
      toast.error(msg || "Falha de conexão com o assistente.");
    },
    onFinish: () => {
      void queryClient.invalidateQueries({ queryKey: ["ai-threads"] });
    },
  });
  const ocupado = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!ocupado) textareaRef.current?.focus();
  }, [ocupado, threadId]);

  const enviar = (texto: string) => {
    const t = texto.trim();
    if (!t || ocupado) return;
    void sendMessage({ text: t });
    setTimeout(() => queryClient.invalidateQueries({ queryKey: ["ai-threads"] }), 1500);
  };

  const ultima = messages[messages.length - 1];
  const aguardando =
    ocupado && (ultima?.role === "user" || !ultima?.parts.some((p) => p.type === "text" && p.text));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.length === 0 ? (
            <ConversationEmptyState
              icon={<img src={logo} alt="Fonte" width={72} height={72} className="size-18" />}
              title="Olá! Sou a Fonte, sua assistente de gestão."
              description="Pergunte qualquer coisa sobre vendas, lucro, entregadores, clientes, estoque ou despesas."
            >
              <div className="flex flex-col items-center gap-3">
                <img src={logo} alt="Fonte" width={72} height={72} className="size-18" />
                <div className="space-y-1 text-center">
                  <h3 className="text-base font-semibold">Olá! Sou a Fonte, sua assistente de gestão.</h3>
                  <p className="text-sm text-muted-foreground">
                    Pergunte qualquer coisa sobre vendas, lucro, entregadores, clientes, estoque ou despesas.
                  </p>
                </div>
                <div className="mt-2 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                  {SUGESTOES.map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      className="h-auto whitespace-normal py-2 text-left text-sm font-normal"
                      onClick={() => enviar(s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </ConversationEmptyState>
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                <MessageContent
                  className={
                    m.role === "user"
                      ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                      : "w-full"
                  }
                >
                  {m.parts.map((p, i) => {
                    if (p.type === "text")
                      return m.role === "user" ? (
                        <p key={i} className="whitespace-pre-wrap">
                          {p.text}
                        </p>
                      ) : (
                        <MessageResponse key={i}>{p.text}</MessageResponse>
                      );
                    if (p.type.startsWith("tool-")) {
                      const tp = p as Extract<typeof p, { type: `tool-${string}` }> & {
                        state: never;
                        input?: unknown;
                        output?: unknown;
                        errorText?: string;
                      };
                      const nome = p.type.slice(5);
                      return (
                        <Tool key={i} defaultOpen={false}>
                          <ToolHeader type={tp.type} state={tp.state} title={NOMES_FERRAMENTA[nome] ?? nome} />
                          <ToolContent>
                            <ToolInput input={tp.input} />
                            <ToolOutput
                              output={
                                tp.output === undefined ? undefined : (
                                  <pre className="max-h-64 overflow-auto p-3 text-xs">
                                    {JSON.stringify(tp.output, null, 2).slice(0, 4000)}
                                  </pre>
                                )
                              }
                              errorText={tp.errorText}
                            />
                          </ToolContent>
                        </Tool>
                      );
                    }
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {aguardando && (
            <div className="flex items-center gap-2 text-sm">
              <img src={logo} alt="" width={24} height={24} className="size-6" />
              <Shimmer>Consultando os dados da empresa...</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl px-2 pb-2 pt-2">
        <PromptInput onSubmit={(msg) => enviar(msg.text ?? "")}>
          <PromptInputTextarea
            ref={textareaRef}
            placeholder="Ex.: quantas águas vendi este mês e quanto lucrei?"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}

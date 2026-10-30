import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import type { UIMessage } from "ai";
import { History } from "lucide-react";
import { ChatAssistente } from "@/components/assistente/chat";
import { ListaConversas } from "@/components/assistente/conversas";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/assistente-fonte.png";

export const Route = createFileRoute("/_authenticated/assistente/$threadId")({
  head: () => ({
    meta: [
      { title: "Conversa com a assistente | AquaERP" },
      { name: "description", content: "Pergunte à IA sobre vendas, lucro, entregadores e clientes da empresa." },
      { property: "og:title", content: "Conversa com a assistente | AquaERP" },
      { property: "og:description", content: "Respostas com os dados reais da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaginaConversa,
});

function PaginaConversa() {
  const { threadId } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ai-messages", threadId],
    staleTime: Infinity,
    gcTime: 0,
    queryFn: async () => {
      const { data: t } = await supabase.from("ai_threads").select("id").eq("id", threadId).maybeSingle();
      if (!t) return null;
      const { data, error } = await supabase
        .from("ai_messages")
        .select("message_id, role, parts")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map(
        (m) => ({ id: m.message_id, role: m.role, parts: m.parts }) as unknown as UIMessage,
      );
    },
  });

  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-[480px] gap-4">
      <aside className="hidden w-64 shrink-0 rounded-lg border bg-card p-3 md:block">
        <ListaConversas ativa={threadId} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col rounded-lg border bg-card">
        <header className="flex items-center gap-2 border-b px-3 py-2">
          <img src={logo} alt="" width={28} height={28} className="size-7" />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold">Fonte · Assistente IA</h1>
            <p className="truncate text-xs text-muted-foreground">Respostas com os dados reais da empresa</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 md:hidden">
                <History className="size-4" /> Conversas
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-3">
              <SheetHeader className="p-0 pb-2">
                <SheetTitle>Conversas</SheetTitle>
              </SheetHeader>
              <ListaConversas ativa={threadId} />
            </SheetContent>
          </Sheet>
        </header>
        <div className="min-h-0 flex-1">
          {isLoading ? (
            <div className="p-6 text-sm">
              <Shimmer>Carregando conversa...</Shimmer>
            </div>
          ) : error || !data ? (
            <div className="p-6 text-sm text-muted-foreground">
              Conversa não encontrada.{" "}
              <Link to="/assistente" className="underline">
                Abrir assistente
              </Link>
            </div>
          ) : (
            <ChatAssistente key={threadId} threadId={threadId} iniciais={data} />
          )}
        </div>
      </section>
    </div>
  );
}

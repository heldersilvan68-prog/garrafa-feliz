import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export type Conversa = { id: string; titulo: string; updated_at: string };

export const conversasQuery = {
  queryKey: ["ai-threads"],
  queryFn: async (): Promise<Conversa[]> => {
    const { data, error } = await supabase
      .from("ai_threads")
      .select("id, titulo, updated_at")
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    return data ?? [];
  },
};

export async function criarConversa(): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Faça login novamente.");
  const { data, error } = await supabase
    .from("ai_threads")
    .insert({ user_id: u.user.id })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export function ListaConversas({ ativa }: { ativa: string }) {
  const { data: conversas = [] } = useQuery(conversasQuery);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const nova = async () => {
    try {
      const id = await criarConversa();
      await qc.invalidateQueries({ queryKey: ["ai-threads"] });
      void navigate({ to: "/assistente/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("ai_threads").delete().eq("id", id);
    if (error) return toast.error("Não foi possível excluir a conversa.");
    await qc.invalidateQueries({ queryKey: ["ai-threads"] });
    if (id === ativa) {
      const outra = conversas.find((c) => c.id !== id);
      if (outra) void navigate({ to: "/assistente/$threadId", params: { threadId: outra.id } });
      else void navigate({ to: "/assistente" });
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <Button onClick={nova} className="w-full justify-start gap-2">
        <MessageSquarePlus className="size-4" /> Nova conversa
      </Button>
      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto">
        {conversas.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1 rounded-md pr-1 text-sm hover:bg-accent",
              c.id === ativa && "bg-accent font-medium",
            )}
          >
            <Link
              to="/assistente/$threadId"
              params={{ threadId: c.id }}
              className="min-w-0 flex-1 truncate px-2 py-2"
            >
              {c.titulo}
            </Link>
            <button
              type="button"
              aria-label="Excluir conversa"
              onClick={() => excluir(c.id)}
              className="rounded p-1 text-muted-foreground opacity-60 hover:text-destructive group-hover:opacity-100"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

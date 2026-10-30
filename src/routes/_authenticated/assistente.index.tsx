import { useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { conversasQuery, criarConversa } from "@/components/assistente/conversas";
import { Shimmer } from "@/components/ai-elements/shimmer";

export const Route = createFileRoute("/_authenticated/assistente/")({
  head: () => ({
    meta: [
      { title: "Assistente IA — Pergunte sobre sua empresa | AquaERP" },
      { name: "description", content: "Converse com a IA sobre vendas, lucro, entregadores, clientes e estoque da sua empresa." },
      { property: "og:title", content: "Assistente IA | AquaERP" },
      { property: "og:description", content: "Perguntas e respostas sobre os dados reais da empresa." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AbrirAssistente,
});

function AbrirAssistente() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const iniciado = useRef(false);
  useEffect(() => {
    if (iniciado.current) return;
    iniciado.current = true;
    (async () => {
      const lista = await qc.fetchQuery(conversasQuery);
      const id = lista[0]?.id ?? (await criarConversa());
      await qc.invalidateQueries({ queryKey: ["ai-threads"] });
      void navigate({ to: "/assistente/$threadId", params: { threadId: id }, replace: true });
    })().catch((e) => toast.error((e as Error).message));
  }, [navigate, qc]);
  return (
    <div className="p-8 text-sm">
      <Shimmer>Abrindo o assistente...</Shimmer>
    </div>
  );
}

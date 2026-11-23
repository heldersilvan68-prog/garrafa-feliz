import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Database } from "@/integrations/supabase/types";
import type { DespesaSubLoja, FechamentoSubLoja, ResumoSubLoja } from "@/lib/sub-loja";

type NovaDespesa = Pick<DespesaSubLoja, "descricao" | "valor" | "categoria" | "data">;
type NovoFechamento = Omit<FechamentoSubLoja, "id" | "fechadoEm">;

type SubLojaContexto = {
  despesas: DespesaSubLoja[];
  fechamentos: FechamentoSubLoja[];
  carregando: boolean;
  adicionarDespesa: (dados: NovaDespesa) => Promise<void>;
  removerDespesa: (id: string) => Promise<void>;
  fecharDia: (resumo: ResumoSubLoja, dia: string) => Promise<void>;
};

const Contexto = createContext<SubLojaContexto | null>(null);
type DespesaRow = Database["public"]["Tables"]["sub_loja_expenses"]["Row"];
type FechamentoRow = Database["public"]["Tables"]["sub_loja_closings"]["Row"];
const numero = (valor: number | string | null) => Number(valor ?? 0);

export function SubLojaProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const despesasQuery = useQuery({
    queryKey: ["sub-loja-despesas", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_loja_expenses")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return (data as DespesaRow[]).map((linha): DespesaSubLoja => ({
        id: linha.id,
        descricao: linha.descricao,
        valor: numero(linha.valor),
        categoria: linha.categoria,
        data: linha.data,
        criadoEm: linha.created_at,
      }));
    },
  });
  const fechamentosQuery = useQuery({
    queryKey: ["sub-loja-fechamentos", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sub_loja_closings")
        .select("*")
        .order("dia", { ascending: false });
      if (error) throw error;
      return (data as FechamentoRow[]).map((linha): FechamentoSubLoja => ({
        id: linha.id,
        dia: linha.dia,
        faturamento: numero(linha.faturamento),
        pix: numero(linha.pix),
        dinheiro: numero(linha.dinheiro),
        debito: numero(linha.debito),
        credito: numero(linha.credito),
        fiado: numero(linha.fiado),
        vale: numero(linha.vale),
        cmv: numero(linha.cmv),
        despesas: numero(linha.despesas),
        lucroBruto: numero(linha.lucro_bruto),
        lucroLiquido: numero(linha.lucro_liquido),
        pedidos: linha.pedidos,
        quantidadeItens: numero(linha.quantidade_itens),
        fechadoEm: linha.fechado_em,
      }));
    },
  });

  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: ["sub-loja-despesas"] });
    void queryClient.invalidateQueries({ queryKey: ["sub-loja-fechamentos"] });
  };
  const erro = (e: Error, mensagem: string) => toast.error(`${mensagem}: ${e.message}`);
  const adicionar = useMutation({
    mutationFn: async (dados: NovaDespesa) => {
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase.from("sub_loja_expenses").insert({ user_id: userId, ...dados });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Despesa da Sub-Loja registrada.");
    },
    onError: (e: Error) => erro(e, "Não foi possível registrar a despesa"),
  });
  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sub_loja_expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Despesa da Sub-Loja excluída.");
    },
    onError: (e: Error) => erro(e, "Não foi possível excluir a despesa"),
  });
  const fechar = useMutation({
    mutationFn: async ({ resumo, dia }: { resumo: ResumoSubLoja; dia: string }) => {
      if (!userId) throw new Error("Sessão expirada");
      const dados: NovoFechamento = {
        dia,
        faturamento: resumo.faturamento,
        pix: resumo.pix,
        dinheiro: resumo.dinheiro,
        debito: resumo.debito,
        credito: resumo.credito,
        fiado: resumo.fiado,
        vale: resumo.vale,
        cmv: resumo.cmv,
        despesas: resumo.despesas,
        lucroBruto: resumo.lucroBruto,
        lucroLiquido: resumo.lucroLiquido,
        pedidos: resumo.pedidos,
        quantidadeItens: resumo.quantidadeItens,
      };
      const { error } = await supabase.from("sub_loja_closings").insert({
        user_id: userId,
        dia: dados.dia,
        faturamento: dados.faturamento,
        pix: dados.pix,
        dinheiro: dados.dinheiro,
        debito: dados.debito,
        credito: dados.credito,
        fiado: dados.fiado,
        vale: dados.vale,
        cmv: dados.cmv,
        despesas: dados.despesas,
        lucro_bruto: dados.lucroBruto,
        lucro_liquido: dados.lucroLiquido,
        pedidos: dados.pedidos,
        quantidade_itens: dados.quantidadeItens,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success("Fechamento da Sub-Loja salvo. O caixa principal não foi alterado.");
    },
    onError: (e: Error) => erro(e, "Não foi possível fechar este dia"),
  });

  const valor = useMemo<SubLojaContexto>(() => ({
    despesas: despesasQuery.data ?? [],
    fechamentos: fechamentosQuery.data ?? [],
    carregando: despesasQuery.isLoading || fechamentosQuery.isLoading,
    adicionarDespesa: (dados) => adicionar.mutateAsync(dados),
    removerDespesa: (id) => remover.mutateAsync(id),
    fecharDia: (resumo, dia) => fechar.mutateAsync({ resumo, dia }),
  }), [despesasQuery.data, despesasQuery.isLoading, fechamentosQuery.data, fechamentosQuery.isLoading, adicionar.mutateAsync, remover.mutateAsync, fechar.mutateAsync]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useSubLoja() {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error("useSubLoja precisa estar dentro de SubLojaProvider");
  return contexto;
}

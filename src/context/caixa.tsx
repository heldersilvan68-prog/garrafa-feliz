import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { paraCaixa, type CaixaRow, type MovimentoRow } from "@/lib/mapeadores";
import {
  hojeISO,
  type Caixa,
  type PagamentoComissao,
  type RegraComissao,
  type TipoMovimento,
  type Vale,
} from "@/lib/caixa";

type Ctx = {
  caixas: Caixa[];
  regras: RegraComissao[];
  vales: Vale[];
  pagamentos: PagamentoComissao[];
  carregando: boolean;
  caixaAberto?: Caixa;
  abrirCaixa: (trocoInicial: number) => void;
  fecharCaixa: (dados: FechamentoCaixa) => void;
  registrarMovimento: (tipo: TipoMovimento, valor: number, motivo: string) => void;
  salvarRegra: (regra: RegraComissao) => void;
  registrarVale: (entregador: string, valor: number, motivo: string) => void;
  pagarComissao: (entregador: string, valor: number) => void;
};

export type FechamentoCaixa = {
  contado: number;
  esperado: number;
  contadoPix: number;
  esperadoPix: number;
  contadoCartao: number;
  esperadoCartao: number;
};

const CaixaContext = createContext<Ctx | null>(null);

export function CaixaProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["caixa", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [caixas, movimentos, regras, vales, pagamentos] = await Promise.all([
        supabase.from("cash_registers").select("*").order("aberto_em", { ascending: false }),
        supabase.from("cash_movements").select("*"),
        supabase.from("commission_rules").select("*").order("entregador"),
        supabase.from("commission_advances").select("*").order("created_at", { ascending: false }),
        supabase.from("commission_payments").select("*").order("created_at", { ascending: false }),
      ]);
      for (const r of [caixas, movimentos, regras, vales, pagamentos]) {
        if (r.error) throw r.error;
      }
      return {
        caixas: ((caixas.data ?? []) as CaixaRow[]).map((c) =>
          paraCaixa(c, (movimentos.data ?? []) as MovimentoRow[]),
        ),
        regras: (regras.data ?? []).map((r) => ({
          entregador: r.entregador,
          porUnidade: Number(r.por_unidade),
          percentual: Number(r.percentual),
        })) as RegraComissao[],
        vales: (vales.data ?? []).map((v) => ({
          id: v.id,
          entregador: v.entregador,
          valor: Number(v.valor),
          motivo: v.motivo,
          em: v.created_at,
        })) as Vale[],
        pagamentos: (pagamentos.data ?? []).map((p) => ({
          id: p.id,
          entregador: p.entregador,
          valor: Number(p.valor),
          em: p.created_at,
        })) as PagamentoComissao[],
      };
    },
  });

  const caixas = data?.caixas ?? [];
  const caixaAberto = caixas.find((c) => !c.fechadoEm);
  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["caixa"] });

  const useMutacao = <T,>(fn: (v: T) => Promise<void>, erro: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: invalidar,
      onError: (e: Error) => toast.error(`${erro}: ${e.message}`),
    });

  const abrirMut = useMutacao<number>(async (trocoInicial) => {
    if (!userId) throw new Error("Sessão expirada");
    const { error } = await supabase.from("cash_registers").insert({
      user_id: userId,
      dia: hojeISO(),
      troco_inicial: trocoInicial,
    });
    if (error) throw error;
  }, "Não foi possível abrir o caixa");

  const fecharMut = useMutacao<FechamentoCaixa>(
    async ({ contado, esperado, contadoPix, esperadoPix, contadoCartao, esperadoCartao }) => {
      if (!caixaAberto) throw new Error("Nenhum caixa aberto");
      const { error } = await supabase
        .from("cash_registers")
        .update({
          contado,
          diferenca: contado - esperado,
          contado_pix: contadoPix,
          diferenca_pix: contadoPix - esperadoPix,
          contado_cartao: contadoCartao,
          diferenca_cartao: contadoCartao - esperadoCartao,
          fechado_em: new Date().toISOString(),
        })
        .eq("id", caixaAberto.id);
      if (error) throw error;
    },
    "Não foi possível fechar o caixa",
  );

  const movimentoMut = useMutacao<{ tipo: TipoMovimento; valor: number; motivo: string }>(
    async ({ tipo, valor, motivo }) => {
      if (!userId) throw new Error("Sessão expirada");
      if (!caixaAberto) throw new Error("Abra o caixa antes de registrar movimentos");
      const { error } = await supabase.from("cash_movements").insert({
        user_id: userId,
        cash_register_id: caixaAberto.id,
        tipo,
        valor,
        motivo,
      });
      if (error) throw error;
    },
    "Não foi possível registrar o movimento",
  );

  const regraMut = useMutacao<RegraComissao>(async (regra) => {
    if (!userId) throw new Error("Sessão expirada");
    const { error } = await supabase.from("commission_rules").upsert(
      {
        user_id: userId,
        entregador: regra.entregador,
        por_unidade: regra.porUnidade,
        percentual: regra.percentual,
      },
      { onConflict: "user_id,entregador" },
    );
    if (error) throw error;
  }, "Não foi possível salvar a regra de comissão");

  const valeMut = useMutacao<{ entregador: string; valor: number; motivo: string }>(
    async (vale) => {
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase.from("commission_advances").insert({
        user_id: userId,
        ...vale,
      });
      if (error) throw error;
    },
    "Não foi possível registrar o vale",
  );

  const pagamentoMut = useMutacao<{ entregador: string; valor: number }>(async (pagamento) => {
    if (!userId) throw new Error("Sessão expirada");
    const { error } = await supabase
      .from("commission_payments")
      .insert({ user_id: userId, ...pagamento });
    if (error) throw error;
  }, "Não foi possível registrar o pagamento");

  return (
    <CaixaContext.Provider
      value={{
        caixas,
        regras: data?.regras ?? [],
        vales: data?.vales ?? [],
        pagamentos: data?.pagamentos ?? [],
        carregando: isLoading,
        caixaAberto,
        abrirCaixa: (trocoInicial) => abrirMut.mutate(trocoInicial),
        fecharCaixa: (dados) => fecharMut.mutate(dados),
        registrarMovimento: (tipo, valor, motivo) => movimentoMut.mutate({ tipo, valor, motivo }),
        salvarRegra: (regra) => regraMut.mutate(regra),
        registrarVale: (entregador, valor, motivo) =>
          valeMut.mutate({ entregador, valor, motivo }),
        pagarComissao: (entregador, valor) => pagamentoMut.mutate({ entregador, valor }),
      }}
    >
      {children}
    </CaixaContext.Provider>
  );
}

export function useCaixa() {
  const ctx = useContext(CaixaContext);
  if (!ctx) throw new Error("useCaixa precisa estar dentro de CaixaProvider");
  return ctx;
}

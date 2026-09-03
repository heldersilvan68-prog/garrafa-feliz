import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type FormaPagamentoConfig = {
  id: string;
  nome: string;
  tipo: string;
  /** Taxa da maquininha/administradora em % sobre o valor recebido. */
  taxa: number;
  ativo: boolean;
};

export type Empresa = {
  nomeFantasia: string;
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  whatsapp: string;
};

export type LarguraPapel = "80mm" | "58mm" | "A4";
export type TamanhoFonte = "pequeno" | "medio" | "grande";
export type ModoImpressora = "termica" | "navegador";

/** Preferências do cupom / comprovante impresso. */
export type ConfigImpressao = {
  largura: LarguraPapel;
  altaDensidade: boolean;
  tamanhoFonte: TamanhoFonte;
  modoImpressora: ModoImpressora;
  mostrarLogo: boolean;
  mostrarEnderecoEmpresa: boolean;
  mostrarCliente: boolean;
  mostrarObservacoes: boolean;
  mostrarRodape: boolean;
  mostrarAssinatura: boolean;
};

export const IMPRESSAO_PADRAO: ConfigImpressao = {
  largura: "80mm",
  altaDensidade: true,
  tamanhoFonte: "medio",
  modoImpressora: "termica",
  mostrarLogo: true,
  mostrarEnderecoEmpresa: true,
  mostrarCliente: true,
  mostrarObservacoes: true,
  mostrarRodape: true,
  mostrarAssinatura: true,
};

export type Configuracoes = Empresa & {
  metaVendasMensal: number;
  /** Horário limite para fechar o caixa (HH:mm). Vazio = sem alerta. */
  horarioLimiteCaixa: string;
  impressao: ConfigImpressao;
};

export const CONFIG_PADRAO: Configuracoes = {
  metaVendasMensal: 0,
  horarioLimiteCaixa: "18:00",
  nomeFantasia: "",
  razaoSocial: "",
  cnpj: "",
  endereco: "",
  whatsapp: "",
  impressao: IMPRESSAO_PADRAO,
};


export const TIPOS_PAGAMENTO = ["Dinheiro", "PIX", "Cartão", "Fiado"] as const;

const FORMAS_PADRAO: { nome: string; tipo: string; taxa: number }[] = [
  { nome: "Dinheiro", tipo: "Dinheiro", taxa: 0 },
  { nome: "PIX", tipo: "PIX", taxa: 0 },
  { nome: "Cartão de Débito", tipo: "Cartão", taxa: 1.5 },
  { nome: "Cartão de Crédito", tipo: "Cartão", taxa: 3.5 },
  { nome: "Fiado/Faturado", tipo: "Fiado", taxa: 0 },
];

/** Formas aceitas pelo banco (enum payment_method). */
const METODOS_BASE = ["PIX", "Dinheiro", "Débito", "Crédito", "Fiado"] as const;

type Ctx = {
  config: Configuracoes;
  formas: FormaPagamentoConfig[];
  /** Métodos habilitados nas Configurações, para os seletores de Vendas/Caixa. */
  metodosAtivos: string[];
  /** Taxa (%) cadastrada em Configurações para o método informado. */
  taxaDe: (metodo: string) => number;
  categoriasCliente: { id: string; nome: string }[];
  carregando: boolean;
  salvarConfig: (c: Partial<Configuracoes>) => Promise<void>;
  salvarForma: (f: Omit<FormaPagamentoConfig, "id"> & { id?: string }) => Promise<void>;
  removerForma: (id: string) => Promise<void>;
  criarCategoriaCliente: (nome: string) => Promise<void>;
  renomearCategoriaCliente: (id: string, nome: string) => Promise<void>;
  removerCategoriaCliente: (id: string) => Promise<void>;
  semearFormasPadrao: () => Promise<void>;
};

const ConfiguracoesContext = createContext<Ctx | null>(null);

export function ConfiguracoesProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["configuracoes", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [settings, formas, categorias] = await Promise.all([
        supabase.from("app_settings").select("*").maybeSingle(),
        supabase.from("payment_methods").select("*").order("nome"),
        supabase.from("client_categories").select("id, nome").order("nome"),
      ]);
      if (settings.error) throw settings.error;
      if (formas.error) throw formas.error;
      if (categorias.error) throw categorias.error;
      const s = settings.data;
      return {
        config: s
          ? {
              metaVendasMensal: Number(s.meta_vendas_mensal ?? 0),
              horarioLimiteCaixa: s.horario_limite_caixa ?? "18:00",
              nomeFantasia: s.nome_fantasia ?? "",
              razaoSocial: s.razao_social ?? "",
              cnpj: s.cnpj ?? "",
              endereco: s.endereco ?? "",
              whatsapp: s.whatsapp ?? "",
              impressao: {
                ...IMPRESSAO_PADRAO,
                ...((s.impressao as unknown as Partial<ConfigImpressao> | null) ?? {}),
              },

            }
          : CONFIG_PADRAO,
        formas: (formas.data ?? []).map((f) => ({
          id: f.id,
          nome: f.nome,
          tipo: f.tipo,
          taxa: Number(f.taxa),
          ativo: f.ativo,
        })) as FormaPagamentoConfig[],
        categoriasCliente: (categorias.data ?? []) as { id: string; nome: string }[],
      };
    },
  });

  const invalidar = () => queryClient.invalidateQueries({ queryKey: ["configuracoes"] });

  const acao = <T,>(fn: (v: T) => Promise<void>, erro: string, ok?: string) =>
    useMutation({
      mutationFn: fn,
      onSuccess: () => {
        invalidar();
        if (ok) toast.success(ok);
      },
      onError: (e: Error) => toast.error(`${erro}: ${e.message}`),
    });

  const config = data?.config ?? CONFIG_PADRAO;

  const configMut = acao<Partial<Configuracoes>>(
    async (patch) => {
      if (!userId) throw new Error("Sessão expirada");
      const novo = { ...config, ...patch };
      const { error } = await supabase.from("app_settings").upsert(
        {
          user_id: userId,
          meta_vendas_mensal: novo.metaVendasMensal,
          horario_limite_caixa: novo.horarioLimiteCaixa || null,
          nome_fantasia: novo.nomeFantasia,
          razao_social: novo.razaoSocial,
          cnpj: novo.cnpj,
          endereco: novo.endereco,
          whatsapp: novo.whatsapp,
          impressao: (novo.impressao ?? IMPRESSAO_PADRAO) as unknown as never,

        },
        { onConflict: "user_id" },
      );
      if (error) throw error;
    },
    "Não foi possível salvar",
    "Configurações salvas!",
  );

  const formaMut = acao<Omit<FormaPagamentoConfig, "id"> & { id?: string }>(
    async (f) => {
      if (!userId) throw new Error("Sessão expirada");
      const nome = f.nome.trim();
      if (!nome) throw new Error("Informe o nome da forma de pagamento");
      const linha = { nome, tipo: f.tipo, taxa: f.taxa, ativo: f.ativo };
      const { error } = f.id
        ? await supabase.from("payment_methods").update(linha).eq("id", f.id)
        : await supabase.from("payment_methods").insert({ user_id: userId, ...linha });
      if (error) throw error;
    },
    "Não foi possível salvar a forma de pagamento",
    "Forma de pagamento salva!",
  );

  const removerFormaMut = acao<string>(
    async (id) => {
      const { error } = await supabase.from("payment_methods").delete().eq("id", id);
      if (error) throw error;
    },
    "Não foi possível excluir",
    "Forma de pagamento excluída.",
  );

  const semearMut = acao<void>(
    async () => {
      if (!userId) throw new Error("Sessão expirada");
      const { error } = await supabase.from("payment_methods").upsert(
        FORMAS_PADRAO.map((f) => ({ user_id: userId, ...f, ativo: true })),
        { onConflict: "user_id,nome" },
      );
      if (error) throw error;
    },
    "Não foi possível criar as formas padrão",
    "Formas de pagamento padrão criadas!",
  );

  const criarCatMut = acao<string>(
    async (nome) => {
      if (!userId) throw new Error("Sessão expirada");
      const limpo = nome.trim();
      if (!limpo) throw new Error("Informe o nome da categoria");
      const { error } = await supabase
        .from("client_categories")
        .insert({ user_id: userId, nome: limpo });
      if (error) throw error;
    },
    "Não foi possível criar a categoria",
    "Categoria criada!",
  );

  const renomearCatMut = acao<{ id: string; nome: string }>(
    async ({ id, nome }) => {
      const limpo = nome.trim();
      if (!limpo) throw new Error("Informe o nome da categoria");
      const { error } = await supabase
        .from("client_categories")
        .update({ nome: limpo })
        .eq("id", id);
      if (error) throw error;
    },
    "Não foi possível renomear",
    "Categoria atualizada!",
  );

  const removerCatMut = acao<string>(
    async (id) => {
      const { error } = await supabase.from("client_categories").delete().eq("id", id);
      if (error) throw error;
    },
    "Não foi possível excluir",
    "Categoria excluída.",
  );

  const formas = data?.formas ?? [];
  const ativas = formas.filter((f) => f.ativo);

  /** Casa um método do enum com a forma cadastrada (por nome ou por tipo). */
  const formaDoMetodo = (metodo: string) => {
    const alvo = metodo.toLowerCase();
    return (
      ativas.find((f) => f.nome.toLowerCase() === alvo) ??
      ativas.find((f) => f.nome.toLowerCase().includes(alvo)) ??
      ativas.find((f) => f.tipo.toLowerCase() === alvo) ??
      ((alvo === "débito" || alvo === "crédito") &&
      ativas.some((f) => f.tipo.toLowerCase() === "cartão")
        ? ativas.find((f) => f.tipo.toLowerCase() === "cartão")
        : undefined)
    );
  };

  // Sem formas cadastradas, todos os métodos ficam disponíveis.
  const metodosAtivos =
    ativas.length === 0
      ? [...METODOS_BASE]
      : METODOS_BASE.filter((m) => !!formaDoMetodo(m)).map((m) => m as string);

  const taxaDe = (metodo: string) => formaDoMetodo(metodo)?.taxa ?? 0;

  return (
    <ConfiguracoesContext.Provider
      value={{
        config,
        formas,
        metodosAtivos: metodosAtivos.length > 0 ? metodosAtivos : [...METODOS_BASE],
        taxaDe,
        categoriasCliente: data?.categoriasCliente ?? [],
        carregando: isLoading,
        salvarConfig: (c) => configMut.mutateAsync(c).then(() => undefined),
        salvarForma: (f) => formaMut.mutateAsync(f).then(() => undefined),
        removerForma: (id) => removerFormaMut.mutateAsync(id).then(() => undefined),
        criarCategoriaCliente: (nome) => criarCatMut.mutateAsync(nome).then(() => undefined),
        renomearCategoriaCliente: (id, nome) =>
          renomearCatMut.mutateAsync({ id, nome }).then(() => undefined),
        removerCategoriaCliente: (id) => removerCatMut.mutateAsync(id).then(() => undefined),
        semearFormasPadrao: () => semearMut.mutateAsync().then(() => undefined),
      }}
    >
      {children}
    </ConfiguracoesContext.Provider>
  );
}

export function useConfiguracoes() {
  const ctx = useContext(ConfiguracoesContext);
  if (!ctx) throw new Error("useConfiguracoes precisa estar dentro de ConfiguracoesProvider");
  return ctx;
}

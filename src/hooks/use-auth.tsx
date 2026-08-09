import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Ctx = {
  session: Session | null;
  user: User | null;
  userId: string | undefined;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<{ error: string | null }>;
  cadastrar: (
    email: string,
    senha: string,
    nome: string,
  ) => Promise<{ error: string | null; confirmar: boolean }>;
  sair: () => Promise<void>;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    let ativo = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      setCarregando(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, novaSessao) => {
      setSession(novaSessao);
      setCarregando(false);
      if (event === "SIGNED_OUT") queryClient.clear();
      if (event === "SIGNED_IN" || event === "USER_UPDATED") queryClient.invalidateQueries();
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  const entrar = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    return { error: error?.message ?? null };
  };

  const cadastrar = async (email: string, senha: string, nome: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome: nome.trim() },
      },
    });
    return { error: error?.message ?? null, confirmar: !error && !data.session };
  };

  const sair = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userId: session?.user?.id,
        carregando,
        entrar,
        cadastrar,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de AuthProvider");
  return ctx;
}

import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Droplets, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar — AquaERP" },
      {
        name: "description",
        content:
          "Acesse o painel da distribuidora: vendas, estoque, caixa, clientes e financeiro em um só lugar.",
      },
      { property: "og:title", content: "Entrar — AquaERP" },
      {
        property: "og:description",
        content: "Acesse o painel da distribuidora: vendas, estoque, caixa, clientes e financeiro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "Informe um e-mail válido." }).max(255),
  senha: z.string().min(6, { message: "A senha deve ter ao menos 6 caracteres." }).max(72),
});

const cadastroSchema = loginSchema.extend({
  nome: z
    .string()
    .trim()
    .min(2, { message: "Informe seu nome." })
    .max(100, { message: "Nome muito longo." }),
});

function AuthPage() {
  const { session, carregando, entrar, cadastrar } = useAuth();
  const navigate = useNavigate();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/", replace: true });
  }, [session, navigate]);

  const submeter = async (modo: "login" | "cadastro") => {
    const schema = modo === "login" ? loginSchema : cadastroSchema;
    const parsed = schema.safeParse({ email, senha, nome });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados informados.");
      return;
    }

    setEnviando(true);
    if (modo === "login") {
      const { error } = await entrar(email, senha);
      setEnviando(false);
      if (error) {
        toast.error(
          error.toLowerCase().includes("invalid")
            ? "E-mail ou senha incorretos."
            : `Não foi possível entrar: ${error}`,
        );
        return;
      }
      toast.success("Bem-vindo de volta!");
      return;
    }

    const { error, confirmar } = await cadastrar(email, senha, nome);
    setEnviando(false);
    if (error) {
      toast.error(
        error.toLowerCase().includes("already")
          ? "Este e-mail já está cadastrado. Faça login."
          : `Não foi possível cadastrar: ${error}`,
      );
      return;
    }
    if (confirmar) {
      toast.success("Conta criada! Confirme o e-mail para acessar o painel.");
      return;
    }
    toast.success("Conta criada com sucesso!");
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Droplets className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">AquaERP</h1>
            <p className="text-sm text-muted-foreground">Distribuidora de Bebidas</p>
          </div>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Acesse sua operação</CardTitle>
            <CardDescription>
              Entre com seu e-mail e senha ou crie uma conta para começar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="cadastro">Criar conta</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-email">E-mail</Label>
                  <Input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@distribuidora.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="login-senha">Senha</Label>
                  <Input
                    id="login-senha"
                    type="password"
                    autoComplete="current-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && submeter("login")}
                  />
                </div>
                <Button
                  className="mt-2"
                  disabled={enviando || carregando}
                  onClick={() => submeter("login")}
                >
                  {enviando && <Loader2 className="animate-spin" />} Entrar
                </Button>
              </TabsContent>

              <TabsContent value="cadastro" className="mt-4 flex flex-col gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cad-nome">Seu nome</Label>
                  <Input
                    id="cad-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome do responsável"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cad-email">E-mail</Label>
                  <Input
                    id="cad-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="voce@distribuidora.com"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="cad-senha">Senha</Label>
                  <Input
                    id="cad-senha"
                    type="password"
                    autoComplete="new-password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                  />
                </div>
                <Button
                  className="mt-2"
                  disabled={enviando || carregando}
                  onClick={() => submeter("cadastro")}
                >
                  {enviando && <Loader2 className="animate-spin" />} Criar conta
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

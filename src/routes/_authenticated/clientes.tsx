import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CalendarClock,
  MessageCircle,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClienteDetalhes } from "@/components/cliente-detalhes";
import { ClienteDialog } from "@/components/cliente-dialog";
import { useClientes } from "@/context/clientes";
import { usePedidos } from "@/context/pedidos";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import {
  diasRestantes,
  formatarData,
  hojeISO,
  linkWhatsApp,
  proximaCompra,
  rotuloCliente,
  STATUS_LABEL,
  statusRecompra,
  type Cliente,
  type StatusRecompra,
} from "@/lib/clientes";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({
    meta: [
      { title: "Clientes e Próxima Compra — AquaERP" },
      {
        name: "description",
        content:
          "Cadastro de clientes com consumo médio, previsão da próxima compra e lembretes de recompra por WhatsApp.",
      },
      { property: "og:title", content: "Clientes e Próxima Compra — AquaERP" },
      {
        property: "og:description",
        content: "Previsão de recompra e lembretes automáticos por WhatsApp.",
      },
    ],
  }),
  component: ClientesPage,
});

const TABS: { id: "todos" | "lembrar" | "atrasado" | "ok"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "lembrar", label: "Lembrar hoje" },
  { id: "atrasado", label: "Atrasados" },
  { id: "ok", label: "Em dia" },
];

const badgeVariant = (s: StatusRecompra) =>
  s === "atrasado" ? "destructive" : s === "ok" ? "outline" : "secondary";

function StatusBadge({ status }: { status: StatusRecompra }) {
  return (
    <Badge
      variant={badgeVariant(status)}
      className={
        status === "hoje"
          ? "bg-warning/25 text-warning-foreground"
          : status === "em-breve"
            ? "bg-primary/10 text-primary"
            : undefined
      }
    >
      {STATUS_LABEL[status]}
    </Badge>
  );
}

function WhatsAppButton({ cliente }: { cliente: Cliente }) {
  return (
    <Button
      asChild
      size="icon"
      className="shrink-0 bg-success text-success-foreground hover:bg-success/90"
      aria-label={`Lembrar ${cliente.nome} pelo WhatsApp`}
    >
      <a href={linkWhatsApp(cliente)} target="_blank" rel="noreferrer">
        <MessageCircle className="size-4" />
      </a>
    </Button>
  );
}

function ClientesPage() {
  const { clientes, remover, registrarCompra } = useClientes();
  const { pedidos } = usePedidos();
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<(typeof TABS)[number]["id"]>("todos");
  const [detalhe, setDetalhe] = useState<string | null>(null);

  // Ativos = pelo menos 1 pedido válido nos últimos 30 dias corridos.
  const base = useMemo(() => {
    const limite = Date.now() - 30 * 86_400_000;
    const comPedido = new Set(
      pedidos
        .filter((p) => p.status !== "cancelado" && new Date(p.criadoEm).getTime() >= limite)
        .map((p) => p.clienteId),
    );
    const ativos = clientes.filter(
      (c) =>
        comPedido.has(c.id) ||
        c.historico.some((h) => new Date(`${h.data}T00:00:00`).getTime() >= limite),
    ).length;
    const total = clientes.length;
    const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
    return { total, ativos, inativos: total - ativos, pct };
  }, [clientes, pedidos]);

  const dadosPizza = [
    { nome: "Ativos", valor: base.ativos, cor: "var(--color-success)" },
    { nome: "Inativos", valor: base.inativos, cor: "var(--color-destructive)" },
  ];

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return clientes
      .filter(
        (c) => !q || c.nome.toLowerCase().includes(q) || (c.codigo ?? "").toLowerCase().includes(q),
      )
      .filter((c) => {
        const s = statusRecompra(c);
        if (aba === "todos") return true;
        if (aba === "lembrar") return s === "hoje" || s === "em-breve" || s === "atrasado";
        if (aba === "atrasado") return s === "atrasado";
        return s === "ok";
      })
      .sort((a, b) => diasRestantes(a) - diasRestantes(b));
  }, [clientes, busca, aba]);

  const lembrarHoje = clientes.filter((c) => {
    const s = statusRecompra(c);
    return s === "hoje" || s === "atrasado";
  });

  const selecionado = clientes.find((c) => c.id === detalhe) ?? null;


  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consumo médio, previsão da próxima compra e lembretes de recompra.
          </p>
        </div>
        <ClienteDialog>
          <Button className="shadow-[var(--shadow-card)]">
            <Plus /> Novo cliente
          </Button>
        </ClienteDialog>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total de clientes</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{base.total}</p>
              <p className="mt-1 text-xs text-muted-foreground">Cadastros na base</p>
            </CardContent>
          </Card>
          <Card className="border-success/40 bg-success/5 shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Clientes ativos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-success">{base.ativos}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {base.pct(base.ativos)}% · pedido nos últimos 30 dias
              </p>
            </CardContent>
          </Card>
          <Card className="border-destructive/40 bg-destructive/5 shadow-[var(--shadow-card)]">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Clientes inativos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive">
                {base.inativos}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {base.pct(base.inativos)}% · sem compras há mais de 30 dias
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Composição da base</CardTitle>
          </CardHeader>
          <CardContent className="h-[180px] p-2">
            {base.total === 0 ? (
              <p className="grid h-full place-items-center text-sm text-muted-foreground">
                Nenhum cliente cadastrado.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(v: number, n: string) => [`${v} (${base.pct(v)}%)`, n]}
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Pie
                    data={dadosPizza}
                    dataKey="valor"
                    nameKey="nome"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                  >
                    {dadosPizza.map((d) => (
                      <Cell key={d.nome} fill={d.cor} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>



      <Card className="border-warning/40 bg-warning/10 shadow-[var(--shadow-card)]">
        <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0">
          <CardTitle className="flex min-w-0 items-center gap-2 text-base">
            <CalendarClock className="size-4" /> Clientes para lembrar hoje
          </CardTitle>
          <Badge variant="secondary" className="shrink-0">
            {lembrarHoje.length}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lembrarHoje.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nenhum cliente previsto para recompra hoje.
            </p>
          )}
          {lembrarHoje.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{rotuloCliente(c)}</p>
                <p className="text-xs text-muted-foreground">
                  Previsto para {formatarData(proximaCompra(c))} ·{" "}
                  {diasRestantes(c) < 0 ? `${Math.abs(diasRestantes(c))} dia(s) de atraso` : "hoje"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setDetalhe(c.id)}>
                  <Users /> Perfil
                </Button>
                <WhatsAppButton cliente={c} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={aba} onValueChange={(v) => setAba(v as typeof aba)}>
          <TabsList>
            {TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou código..."
            className="pl-9"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((c) => {
          const status = statusRecompra(c);
          const dias = diasRestantes(c);
          return (
            <Card key={c.id} className="shadow-[var(--shadow-card)]">
              <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 space-y-0">
                <div className="min-w-0">
                  <CardTitle className="truncate text-base">{rotuloCliente(c)}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{c.endereco}</p>
                </div>
                <StatusBadge status={status} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Consumo médio</p>
                    <p className="font-medium tabular-nums">{c.consumoMedioDias} dias</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Última compra</p>
                    <p className="font-medium tabular-nums">{formatarData(c.ultimaCompra)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-muted-foreground">Próxima compra prevista</p>
                    <p className="font-semibold tabular-nums">
                      {formatarData(proximaCompra(c))}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        (
                        {dias < 0
                          ? `${Math.abs(dias)} dia(s) atrasado`
                          : dias === 0
                            ? "hoje"
                            : `em ${dias} dia(s)`}
                        )
                      </span>
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDetalhe(c.id)}>
                    <Users /> Perfil
                  </Button>
                  <ClienteDialog cliente={c}>
                    <Button variant="outline" size="sm">
                      <Pencil /> Editar
                    </Button>
                  </ClienteDialog>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      registrarCompra(c.id, "Compra registrada", 0, hojeISO());
                      toast.success("Compra registrada. Previsão atualizada.");
                    }}
                  >
                    <ShoppingBag /> Comprou hoje
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <ConfirmarExclusao
                      titulo={`Excluir ${c.nome}?`}
                      descricao="O cliente e o histórico de compras serão removidos. Esta ação não pode ser desfeita."
                      sucesso="Cliente removido."
                      onConfirmar={() => remover(c.id)}
                    >
                      <Button variant="ghost" size="icon" aria-label={`Excluir ${c.nome}`}>
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </ConfirmarExclusao>
                    <WhatsAppButton cliente={c} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {lista.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado.</p>
        )}
      </div>

      <ClienteDetalhes
        cliente={selecionado}
        aberto={!!selecionado}
        onOpenChange={(o) => !o && setDetalhe(null)}
      />
    </div>
  );
}

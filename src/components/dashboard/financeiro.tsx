import { CalendarClock, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { brl } from "@/lib/erp";
import { clientesParaCobrar, contasAPagar } from "@/lib/dashboard";
import { useClientes } from "@/context/clientes";
import { useDespesas } from "@/context/despesas";
import { usePedidos } from "@/context/pedidos";

export function ClientesCobrar() {
  const { pedidos } = usePedidos();
  const { clientes } = useClientes();
  const lista = clientesParaCobrar(pedidos, clientes);
  const total = lista.reduce((s, c) => s + c.valor, 0);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0">
        <CardTitle className="truncate text-base">Clientes para cobrar</CardTitle>
        <Badge variant="secondary" className="shrink-0">
          {brl(total)}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum fiado em aberto.</p>
        ) : (
          lista.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.nome}</p>
                <p className="text-xs text-muted-foreground">
                  {c.dias} dias em aberto · {brl(c.valor)}
                </p>
              </div>
              {c.telefone ? (
                <Button
                  asChild
                  size="icon"
                  className="shrink-0 bg-success text-success-foreground hover:bg-success/90"
                  aria-label={`Cobrar ${c.nome} pelo WhatsApp`}
                >
                  <a
                    href={`https://wa.me/${c.telefone}?text=${encodeURIComponent(
                      `Olá, ${c.nome}! Passando para lembrar do saldo em aberto de ${brl(c.valor)}.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="size-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function ContasPagar() {
  const { despesas } = useDespesas();
  const lista = contasAPagar(despesas);
  const total = lista.reduce((s, c) => s + c.valor, 0);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 space-y-0">
        <CardTitle className="truncate text-base">Contas a pagar</CardTitle>
        <Badge variant="secondary" className="shrink-0">
          {brl(total)}
        </Badge>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma despesa pendente.</p>
        ) : (
          lista.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{c.descricao}</p>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarClock className="size-3" /> Vence em {c.vencimento}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{brl(c.valor)}</p>
                <Badge variant={c.status === "Urgente" ? "destructive" : "outline"} className="mt-1">
                  {c.status}
                </Badge>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

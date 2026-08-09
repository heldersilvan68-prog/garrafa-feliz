import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
import { CircleAlert, CircleCheck, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DespesaDialog } from "@/components/financeiro/despesa-dialog";
import { useDespesas } from "@/context/despesas";
import { brl } from "@/lib/erp";
import { dataBR, despesasDoMes, somaDespesas, type Despesa } from "@/lib/despesas";

export const Route = createFileRoute("/_authenticated/despesas")({
  head: () => ({
    meta: [
      { title: "Gestão de Despesas — Custos e Contas | AquaERP" },
      {
        name: "description",
        content:
          "Cadastre, edite e acompanhe as despesas da distribuidora por categoria, status e forma de pagamento, com integração ao caixa.",
      },
      { property: "og:title", content: "Gestão de Despesas — Custos e Contas | AquaERP" },
      {
        property: "og:description",
        content:
          "Controle total das despesas operacionais: categorias, status, formas de pagamento e sangria automática no caixa.",
      },
    ],
  }),
  component: DespesasPage,
});

function DespesasPage() {
  const { despesas, removerDespesa } = useDespesas();
  const [open, setOpen] = useState(false);
  const [editando, setEditando] = useState<Despesa | undefined>();

  const doMes = despesasDoMes(despesas);
  const pagas = doMes.filter((d) => d.status === "Pago");
  const pendentes = doMes.filter((d) => d.status === "Pendente");

  const cards = [
    {
      titulo: "Total de despesas no mês",
      valor: brl(somaDespesas(doMes)),
      icon: Receipt,
      tom: "bg-primary/10 text-primary",
    },
    {
      titulo: "Despesas pagas",
      valor: brl(somaDespesas(pagas)),
      icon: CircleCheck,
      tom: "bg-success/15 text-success",
    },
    {
      titulo: "Despesas pendentes",
      valor: brl(somaDespesas(pendentes)),
      icon: CircleAlert,
      tom: "bg-destructive/10 text-destructive",
    },
  ];

  const ordenadas = [...despesas].sort((a, b) => (a.data < b.data ? 1 : -1));

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            Gestão de Despesas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registre custos operacionais, acompanhe pagamentos e alimente o lucro líquido.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditando(undefined);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Nova Despesa
        </Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.titulo} className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="min-w-0 truncate text-sm font-medium text-muted-foreground">
                {c.titulo}
              </CardTitle>
              <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${c.tom}`}>
                <c.icon className="size-4" />
              </span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tracking-tight sm:text-3xl">{c.valor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Despesas registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {ordenadas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma despesa registrada. Clique em “Nova Despesa” para começar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ordenadas.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="whitespace-nowrap tabular-nums">
                        {dataBR(d.data)}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <p className="truncate font-medium">{d.descricao}</p>
                        {d.observacoes ? (
                          <p className="truncate text-xs text-muted-foreground">{d.observacoes}</p>
                        ) : null}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{d.categoria}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(d.valor)}</TableCell>
                      <TableCell className="whitespace-nowrap">{d.forma}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "Pago" ? "secondary" : "destructive"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            aria-label={`Editar ${d.descricao}`}
                            onClick={() => {
                              setEditando(d);
                              setOpen(true);
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <ConfirmarExclusao
                            titulo="Excluir despesa?"
                            descricao={`${d.descricao} será removida do financeiro.`}
                            sucesso="Despesa excluída."
                            onConfirmar={() => removerDespesa(d.id)}
                          >
                            <Button
                              size="icon"
                              variant="outline"
                              aria-label={`Excluir ${d.descricao}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </ConfirmarExclusao>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <DespesaDialog open={open} onOpenChange={setOpen} despesa={editando} />
    </div>
  );
}

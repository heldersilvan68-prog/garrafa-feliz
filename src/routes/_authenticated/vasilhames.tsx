import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowDownLeft, Boxes, ExternalLink, Plus, Recycle, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClienteDetalhes } from "@/components/cliente-detalhes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AporteVasilhameDialog,
  MoverVaziosDialog,
  RetornoEnvaseDialog,
} from "@/components/estoque-dialogs";
import { AvariaDialog, RetornoFonteDialog } from "@/components/estoque/avaria-dialog";
import { useClientes } from "@/context/clientes";
import { useEstoque } from "@/context/estoque";
import { brl } from "@/lib/erp";
import { LABEL_MOV, resumoVasilhames } from "@/lib/vasilhames";
import { saldoVasilhamesPedido } from "@/lib/vasilhames";
import { usePedidos } from "@/context/pedidos";

export const Route = createFileRoute("/_authenticated/vasilhames")({
  head: () => ({
    meta: [
      { title: "Controle de Vasilhames — AquaERP" },
      {
        name: "description",
        content:
          "Patrimônio de vasilhames, cheios e vazios no depósito, cascos na rua, previsão de custo de envase, avarias e histórico de movimentações.",
      },
      { property: "og:title", content: "Controle de Vasilhames — AquaERP" },
      {
        property: "og:description",
        content: "Logística e finanças dos garrafões de 20L: patrimônio, envase, avarias e extrato.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Vasilhames,
});

function Vasilhames() {
  const {
    produtos,
    movimentos,
    carregarMaisMovimentos,
    temMaisMovimentos,
    carregandoMaisMovimentos,
    emTransitoFonte,
  } = useEstoque();
  const { clientes } = useClientes();
  const { pedidos } = usePedidos();
  const [listaRuaAberta, setListaRuaAberta] = useState(false);
  const [clienteDetalheId, setClienteDetalheId] = useState<string | null>(null);
  const retornaveis = useMemo(() => produtos.filter((p) => p.retornavel), [produtos]);
  const naRua = useMemo(
    () => clientes.reduce((s, c) => s + (c.vasilhamesRua ?? 0), 0),
    [clientes],
  );

  const emTransitoSeguro = emTransitoFonte;

  const r = resumoVasilhames(produtos, naRua, emTransitoSeguro);

  const clientesNaRua = useMemo(
    () =>
      clientes
        .filter((cliente) => (cliente.vasilhamesRua ?? 0) > 0)
        .map((cliente) => {
          const ultimo = pedidos
            .filter(
              (pedido) =>
                pedido.clienteId === cliente.id &&
                pedido.status !== "cancelado" &&
                saldoVasilhamesPedido(pedido.itens, pedido.vaziosRecolhidos) > 0,
            )
            .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime())[0];
          return { cliente, ultimoEmprestimo: ultimo?.criadoEm };
        })
        .sort((a, b) => (b.cliente.vasilhamesRua ?? 0) - (a.cliente.vasilhamesRua ?? 0)),
    [clientes, pedidos],
  );
  const clienteDetalhe = clientes.find((cliente) => cliente.id === clienteDetalheId) ?? null;

  const cards = [
    {
      titulo: "Vasilhames na Rua",
      valor: `${r.naRua}`,
      nota: "Galões 20L retornáveis em poder dos clientes",
    },
    { titulo: "Patrimônio Total de Vasilhames", valor: `${r.patrimonio}`, nota: `${brl(r.patrimonioValor)} em cascos no patrimônio` },
    { titulo: "Unidades Cheias no Depósito", valor: `${r.cheios}`, nota: "Prontas para venda" },
    { titulo: "Vasilhames Vazios no Depósito", valor: `${r.vazios}`, nota: `${r.naRua} na rua · ${emTransitoSeguro} na fonte` },
    { titulo: "Previsão de Custo para Envasar", valor: brl(r.custoEnvasePrevisto), nota: "Vazios × custo de envase" },
    { titulo: "Valor Potencial de Venda (20L)", valor: brl(r.valorVenda), nota: "Cheios × preço de venda" },
    { titulo: "Lucro Bruto Projetado (20L)", valor: brl(r.lucroProjetado), nota: "Venda − custo dos cheios" },
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
            Controle de Vasilhames
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Patrimônio de cascos, envase, avarias e extrato de movimentações.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão para registrar chegada de carga cheia */}
          <RetornoEnvaseDialog>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <ArrowDownLeft className="size-4" /> Chegada da Carga
            </Button>
          </RetornoEnvaseDialog>

          {/* Botão de Enviar vazios para envasar */}
          <MoverVaziosDialog>
            <Button variant="outline">
              <Recycle className="size-4" /> Enviar Vazios
            </Button>
          </MoverVaziosDialog>

          {/* Botão de Comprar / Aportar Vasilhames */}
          <AporteVasilhameDialog>
            <Button variant="outline">
              <Plus className="size-4" /> Comprar Vasilhames
            </Button>
          </AporteVasilhameDialog>

          <RetornoFonteDialog>
            <Button variant="outline">
              <Undo2 className="size-4" /> Retorno 
            </Button>
          </RetornoFonteDialog>

          <AvariaDialog>
            <Button variant="outline" className="text-destructive">
              <AlertTriangle className="size-4" /> Registrar avaria
            </Button>
          </AvariaDialog>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <Card
            key={c.titulo}
            className={
              c.titulo === "Vasilhames na Rua"
                ? "cursor-pointer border-primary/30 shadow-[var(--shadow-card)] transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "shadow-[var(--shadow-card)]"
            }
            role={c.titulo === "Vasilhames na Rua" ? "button" : undefined}
            tabIndex={c.titulo === "Vasilhames na Rua" ? 0 : undefined}
            onClick={c.titulo === "Vasilhames na Rua" ? () => setListaRuaAberta(true) : undefined}
            onKeyDown={
              c.titulo === "Vasilhames na Rua"
                ? (evento) => {
                    if (evento.key === "Enter" || evento.key === " ") setListaRuaAberta(true);
                  }
                : undefined
            }
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{c.valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.nota}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={listaRuaAberta} onOpenChange={setListaRuaAberta}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Clientes com vasilhames na rua</DialogTitle>
            <DialogDescription>
              {r.naRua} casco(s) pendente(s) com {clientesNaRua.length} cliente(s).
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Cascos</TableHead>
                  <TableHead>Último empréstimo</TableHead>
                  <TableHead className="text-right">Perfil</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesNaRua.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      Nenhum cliente possui cascos pendentes.
                    </TableCell>
                  </TableRow>
                ) : (
                  clientesNaRua.map(({ cliente, ultimoEmprestimo }) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nome}</TableCell>
                      <TableCell>{cliente.telefone || "—"}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {cliente.vasilhamesRua ?? 0}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {ultimoEmprestimo
                          ? new Date(ultimoEmprestimo).toLocaleString("pt-BR")
                          : "Registro anterior"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Abrir perfil de ${cliente.nome}`}
                          onClick={() => setClienteDetalheId(cliente.id)}
                        >
                          <ExternalLink className="size-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <ClienteDetalhes
        cliente={clienteDetalhe}
        aberto={clienteDetalhe !== null}
        onOpenChange={(aberto) => {
          if (!aberto) setClienteDetalheId(null);
        }}
      />

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Boxes className="size-4 text-primary" /> Saldos por produto retornável
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Cheios</TableHead>
                <TableHead className="text-right">Vazios</TableHead>
                <TableHead className="text-right">Custo casco</TableHead>
                <TableHead className="text-right">Custo envase</TableHead>
                <TableHead className="text-right">Valor total de venda</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retornaveis.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-sm text-muted-foreground">
                    Nenhum produto retornável cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {retornaveis.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.estoqueCheio}</TableCell>
                  <TableCell className="text-right tabular-nums">{p.estoqueVazio}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(p.custoCasco)}</TableCell>
                  <TableCell className="text-right tabular-nums">{brl(p.custoEnvase)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {brl(p.estoqueCheio * p.precoVenda)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <RetornoEnvaseDialog produtoId={p.id}>
                        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                          <ArrowDownLeft className="size-3.5 mr-1" /> Receber Carga
                        </Button>
                      </RetornoEnvaseDialog>
                      <MoverVaziosDialog produtoId={p.id}>
                        <Button variant="outline" size="sm">
                          <Recycle className="size-3.5 mr-1" /> Enviar Vazios
                        </Button>
                      </MoverVaziosDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Histórico de movimentações de vasilhames</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo de movimentação</TableHead>
                <TableHead>Motivo / detalhe</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimentos.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    Nenhuma movimentação registrada ainda.
                  </TableCell>
                </TableRow>
              )}
              {movimentos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(m.em).toLocaleString("pt-BR")}
                  </TableCell>
                  <TableCell>{LABEL_MOV[m.tipo] ?? m.tipo}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {m.motivo ?? "—"}
                    <span className="ml-1 text-xs">
                      ({m.deltaCheio >= 0 ? "+" : ""}
                      {m.deltaCheio} cheio / {m.deltaVazio >= 0 ? "+" : ""}
                      {m.deltaVazio} vazio / {m.deltaPatrimonio >= 0 ? "+" : ""}
                      {m.deltaPatrimonio} patrimônio)
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{m.qtd}</TableCell>
                  <TableCell className="text-muted-foreground">{m.usuario ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {temMaisMovimentos && (
            <div className="flex justify-center border-t border-border pt-4">
              <Button
                variant="outline"
                onClick={carregarMaisMovimentos}
                disabled={carregandoMaisMovimentos}
              >
                {carregandoMaisMovimentos ? "Carregando..." : "Carregar mais movimentações"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
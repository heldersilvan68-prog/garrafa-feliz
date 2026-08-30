import { useMemo, useState } from "react";
import { History, Search, Ticket, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HistoricoVales } from "@/components/clientes/historico-vales";
import { useClientes } from "@/context/clientes";
import { usePedidos } from "@/context/pedidos";
import { brl } from "@/lib/erp";
import { filtrarClientes, ordenarPorCodigo, type Cliente } from "@/lib/clientes";
import { lancamentosVale, totaisEmAberto, valesEmAberto } from "@/lib/vales";

const dataCurta = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) : "—";

/** Painel "Vales na rua": saldo de créditos em aberto por cliente. */
export function ValesNaRua() {
  const { clientes } = useClientes();
  const { pedidos } = usePedidos();
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState<Cliente | null>(null);

  const linhas = useMemo(() => {
    // Ordem numérica por código e busca por código, nome ou telefone.
    const base = ordenarPorCodigo(filtrarClientes(clientes, busca)).filter(
      (c) => Math.round(c.valesSaldo ?? 0) > 0,
    );
    return valesEmAberto(base, lancamentosVale(pedidos));
  }, [clientes, pedidos, busca]);

  const totaisGerais = useMemo(
    () =>
      totaisEmAberto(
        valesEmAberto(
          ordenarPorCodigo(clientes).filter((c) => Math.round(c.valesSaldo ?? 0) > 0),
          lancamentosVale(pedidos),
        ),
      ),
    [clientes, pedidos],
  );

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Ticket className="size-4 text-primary" /> Total de vales em aberto
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{totaisGerais.galoes}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {totaisGerais.clientes} cliente(s) com saldo a retirar
          </CardContent>
        </Card>
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <Wallet className="size-4 text-success" /> Valor equivalente retido
            </CardDescription>
            <CardTitle className="text-2xl tabular-nums">{brl(totaisGerais.valor)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Já recebido no caixa e ainda não entregue em produto
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Clientes com saldo de vales</CardTitle>
            <CardDescription>Somente clientes com vales disponíveis</CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por código, nome ou telefone..."
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {linhas.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Nenhum cliente com saldo de vales em aberto.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Valor retido</TableHead>
                  <TableHead>Última compra</TableHead>
                  <TableHead>Último resgate</TableHead>
                  <TableHead className="text-right">Histórico</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.clienteId}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {l.codigo || "—"}
                    </TableCell>
                    <TableCell className="font-medium">{l.nome}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {l.telefone || "—"}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {l.saldo} vale(s)
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{brl(l.valorRetido)}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dataCurta(l.ultimaCompra)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {dataCurta(l.ultimoResgate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          setDetalhe(clientes.find((c) => c.id === l.clienteId) ?? null)
                        }
                      >
                        <History className="size-4" />
                        Ver histórico
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!detalhe} onOpenChange={(v) => !v && setDetalhe(null)}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Extrato de vales — {detalhe?.nome}</DialogTitle>
            <DialogDescription>Pacotes comprados e resgates do cliente</DialogDescription>
          </DialogHeader>
          {detalhe && <HistoricoVales cliente={detalhe} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

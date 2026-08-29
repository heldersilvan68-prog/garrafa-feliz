import { useMemo } from "react";
import { Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePedidos } from "@/context/pedidos";
import { brl } from "@/lib/erp";
import { formatarDataHora } from "@/lib/cliente-insights";
import { LABEL_LANCAMENTO_VALE, lancamentosVale, totaisVale } from "@/lib/vales";
import type { Cliente } from "@/lib/clientes";

/** Histórico de vales (pacotes comprados e resgates) de um cliente. */
export function HistoricoVales({ cliente }: { cliente: Cliente }) {
  const { pedidos } = usePedidos();

  const { lancamentos, totais } = useMemo(() => {
    const lista = lancamentosVale(pedidos).filter((l) => l.clienteId === cliente.id);
    return { lancamentos: lista, totais: totaisVale(lista) };
  }, [pedidos, cliente.id]);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Ticket className="size-4 text-primary" /> Histórico de vales
        </CardTitle>
        <CardDescription>
          Pacotes comprados: <strong>{totais.compras.galoes}</strong> galões (
          {brl(totais.compras.valor)}) · Resgatados:{" "}
          <strong>{totais.resgates.galoes}</strong> galões ({brl(totais.resgates.valor)}) · Saldo
          atual: <strong>{cliente.valesSaldo ?? 0}</strong> vales
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {lancamentos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nenhum lançamento de vales para este cliente.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Lançamento</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead className="text-right">Galões</TableHead>
                <TableHead className="text-right">Valor / galão</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lancamentos.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatarDataHora(l.data)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={l.tipo === "compra" ? "default" : "secondary"}>
                      {LABEL_LANCAMENTO_VALE[l.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">#{l.numero}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {l.tipo === "compra" ? "+" : "−"}
                    {l.galoes}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{brl(l.valorUnit)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">
                    {brl(l.valor)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

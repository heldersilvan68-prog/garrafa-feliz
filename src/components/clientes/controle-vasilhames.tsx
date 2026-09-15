import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, PackageCheck, RotateCcw } from "lucide-react";
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
import { DevolucaoCascoDialog } from "@/components/clientes/devolucao-casco-dialog";
import { supabase } from "@/integrations/supabase/client";
import { usePedidos } from "@/context/pedidos";
import type { Cliente } from "@/lib/clientes";
import { saldoVasilhamesPedido } from "@/lib/vasilhames";

type DevolucaoManual = {
  id: string;
  qtd: number;
  created_at: string;
};

export function ControleVasilhamesCliente({ cliente }: { cliente: Cliente }) {
  const { pedidos } = usePedidos();
  const { data: devolucoes = [] } = useQuery({
    queryKey: ["movimentos-vasilhames", "cliente", cliente.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("returnable_movements")
        .select("id,qtd,created_at")
        .eq("client_id", cliente.id)
        .eq("tipo", "devolucao_cliente")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DevolucaoManual[];
    },
  });

  const historico = useMemo(() => {
    const vendas = pedidos
      .filter((pedido) => pedido.clienteId === cliente.id && pedido.status !== "cancelado")
      .map((pedido) => {
        const saldo = saldoVasilhamesPedido(pedido.itens, pedido.vaziosRecolhidos);
        if (saldo === 0) return null;
        return {
          id: `pedido-${pedido.id}`,
          em: pedido.criadoEm,
          tipo: saldo > 0 ? "Empréstimo" : "Devolução",
          qtd: Math.abs(saldo),
          origem: `Venda #${pedido.numero}`,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
    const manuais = devolucoes.map((movimento) => ({
      id: `manual-${movimento.id}`,
      em: movimento.created_at,
      tipo: "Devolução" as const,
      qtd: movimento.qtd,
      origem: "Devolução manual",
    }));
    return [...vendas, ...manuais].sort(
      (a, b) => new Date(b.em).getTime() - new Date(a.em).getTime(),
    );
  }, [cliente.id, devolucoes, pedidos]);

  return (
    <Card className="border-primary/30 bg-primary/5 shadow-[var(--shadow-card)]">
      <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageCheck className="size-4 text-primary" /> Controle de Vasilhames / Cascos
          </CardTitle>
          <p className="mt-2 text-sm text-muted-foreground">
            Galões em posse do cliente: {" "}
            <strong className="text-foreground">{cliente.vasilhamesRua ?? 0} garrafões</strong>
          </p>
        </div>
        <DevolucaoCascoDialog clienteId={cliente.id} naRua={cliente.vasilhamesRua ?? 0}>
          <Button size="sm" disabled={(cliente.vasilhamesRua ?? 0) <= 0}>
            <RotateCcw className="size-4" /> Registrar Devolução Manual
          </Button>
        </DevolucaoCascoDialog>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead>Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historico.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <History className="size-4" /> Nenhuma movimentação registrada.
                    </span>
                  </TableCell>
                </TableRow>
              ) : (
                historico.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(item.em).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{item.tipo}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{item.qtd}</TableCell>
                    <TableCell className="text-muted-foreground">{item.origem}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
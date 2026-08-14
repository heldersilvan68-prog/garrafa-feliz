import { useMemo, useState } from "react";
import { Package, Recycle, Truck, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePedidos } from "@/context/pedidos";
import { useEstoque } from "@/context/estoque";
import { useEntregadores } from "@/context/entregadores";
import { brl } from "@/lib/erp";
import { STATUS_PEDIDO_LABEL, resumoItens } from "@/lib/pedidos";
import {
  dinheiroRecebido,
  entregasDoEntregador,
  hojeISO,
  unidadesRetornaveis,
  vaziosRecolhidos,
} from "@/lib/caixa";

function ValorLinha({
  label,
  valor,
  destaque,
}: {
  label: string;
  valor: string;
  destaque?: "positivo" | "negativo" | "forte";
}) {
  const cor =
    destaque === "positivo"
      ? "text-success"
      : destaque === "negativo"
        ? "text-destructive"
        : destaque === "forte"
          ? "font-semibold"
          : "";
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums ${cor}`}>{valor}</span>
    </div>
  );
}

/** Conferência de turno, vasilhames e financeiro de cada entregador. */
export function AcertoEntregador() {
  const { pedidos } = usePedidos();
  const { produtos } = useEstoque();
  const { opcoes: ENTREGADORES } = useEntregadores();
  const [entregador, setEntregador] = useState("");
  const selecionado = entregador || ENTREGADORES[1] || ENTREGADORES[0] || "";
  const dia = hojeISO();

  const entregas = useMemo(
    () => entregasDoEntregador(pedidos, selecionado, dia),
    [pedidos, selecionado, dia],
  );
  const emRota = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          p.entregador === selecionado && p.status === "em-rota" && p.criadoEm.slice(0, 10) === dia,
      ),
    [pedidos, selecionado, dia],
  );

  const cheiosSaida = unidadesRetornaveis([...entregas, ...emRota]);
  const cheiosEntregues = unidadesRetornaveis(entregas);
  const cheiosVolta = cheiosSaida - cheiosEntregues;
  const vazios = vaziosRecolhidos(entregas);
  const dinheiro = dinheiroRecebido(entregas);
  const totalEntregas = entregas.reduce((s, p) => s + p.total, 0);
  const fiado = entregas.filter((p) => p.pagamento === "Fiado").reduce((s, p) => s + p.total, 0);
  const vaziosEstoque = produtos
    .filter((p) => p.retornavel)
    .reduce((s, p) => s + p.estoqueVazio, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-primary" />
            Acerto do entregador
          </CardTitle>
          <CardDescription>Conferência do turno de hoje</CardDescription>
        </div>
        <Select value={selecionado} onValueChange={setEntregador}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Selecione o entregador" />
          </SelectTrigger>
          <SelectContent>
            {ENTREGADORES.map((e) => (
              <SelectItem key={e} value={e}>
                {e}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Recycle className="size-4 text-primary" />
              Conferência de vasilhames (20L)
            </p>
            <div className="flex flex-col gap-2">
              <ValorLinha label="Cheios que saíram" valor={`${cheiosSaida} un`} />
              <ValorLinha label="Cheios entregues" valor={`${cheiosEntregues} un`} />
              <ValorLinha
                label="Cheios a devolver ao depósito"
                valor={`${cheiosVolta} un`}
                destaque={cheiosVolta > 0 ? "negativo" : "positivo"}
              />
              <Separator />
              <ValorLinha label="Vazios recolhidos de clientes" valor={`${vazios} un`} />
              <ValorLinha
                label="Vazios hoje no depósito"
                valor={`${vaziosEstoque} un`}
                destaque="forte"
              />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Wallet className="size-4 text-primary" />
              Conferência financeira
            </p>
            <div className="flex flex-col gap-2">
              <ValorLinha label="Total entregue (vendas)" valor={brl(totalEntregas)} />
              <ValorLinha
                label="Recebido em cartão / PIX"
                valor={brl(totalEntregas - dinheiro - fiado)}
              />
              <ValorLinha label="Fiado deixado na caderneta" valor={brl(fiado)} />
              <Separator />
              <ValorLinha label="Dinheiro recebido em rota" valor={brl(dinheiro)} />
              <ValorLinha
                label="Valor a entregar no caixa"
                valor={brl(dinheiro)}
                destaque="forte"
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Package className="size-4 text-muted-foreground" />
            Entregas do turno ({entregas.length + emRota.length})
          </p>
          {entregas.length + emRota.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Nenhuma entrega registrada hoje para {selecionado || "este entregador"}.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Pgto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...emRota, ...entregas].map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">#{p.numero}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{p.clienteNome}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {resumoItens(p.itens)}
                      </TableCell>
                      <TableCell>{p.pagamento}</TableCell>
                      <TableCell className="text-right tabular-nums">{brl(p.total)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "concluido" ? "outline" : "default"}>
                          {STATUS_PEDIDO_LABEL[p.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { useMemo } from "react";
import { Banknote, Landmark, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCaixa } from "@/context/caixa";
import { useDespesas } from "@/context/despesas";
import { usePedidos } from "@/context/pedidos";
import { brl } from "@/lib/erp";
import { calcularSaldos } from "@/lib/saldos";

/**
 * Saldos acumulados em tempo real: caixa físico (gaveta) x conta digital
 * (PIX/cartões), com o total disponível na distribuidora.
 */
export function SaldosCards() {
  const { pedidos } = usePedidos();
  const { despesas } = useDespesas();
  const { caixas } = useCaixa();
  const s = useMemo(() => calcularSaldos(pedidos, despesas, caixas), [pedidos, despesas, caixas]);

  const cards = [
    {
      titulo: "Saldo em espécie (gaveta)",
      valor: s.especie,
      icon: Banknote,
      tom: "bg-warning/20 text-warning-foreground",
      linhas: [
        `+ ${brl(s.vendasDinheiro)} vendas e recebimentos em dinheiro`,
        `+ ${brl(s.suprimentos)} suprimentos manuais`,
        `− ${brl(s.saidasDinheiro)} despesas pagas em dinheiro`,
        `− ${brl(s.sangrias)} sangrias`,
      ],
    },
    {
      titulo: "Saldo em conta / digital",
      valor: s.conta,
      icon: Landmark,
      tom: "bg-primary/10 text-primary",
      linhas: [
        `+ ${brl(s.vendasPix)} recebido em PIX`,
        `+ ${brl(s.vendasCartao)} recebido em cartão`,
        `− ${brl(s.taxasCartao)} taxas da maquininha`,
        `− ${brl(s.saidasConta)} pagamentos em PIX/transferência/cartão`,
      ],
    },
    {
      titulo: "Saldo total disponível",
      valor: s.total,
      icon: Wallet,
      tom: "bg-success/15 text-success",
      linhas: [
        `Espécie ${brl(s.especie)} + Conta ${brl(s.conta)}`,
        "Atualiza a cada venda, despesa ou compra registrada.",
      ],
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-3">
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
            <p
              className={`text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${
                c.valor < 0 ? "text-destructive" : ""
              }`}
            >
              {brl(c.valor)}
            </p>
            <ul className="mt-2 flex flex-col gap-0.5 text-xs text-muted-foreground">
              {c.linhas.map((l) => (
                <li key={l} className="truncate">
                  {l}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

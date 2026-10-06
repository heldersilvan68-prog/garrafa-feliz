import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePedidos } from "@/context/pedidos";
import { useDespesas } from "@/context/despesas";
import { brl } from "@/lib/erp";
import { dataCurta, horaCurta, somaMovimentos, type Caixa } from "@/lib/caixa";
import { CATEGORIA_TAXA_CARTAO } from "@/lib/despesas";
import { calcularMovimentoSessao, naSessao, sangriaDeDespesa } from "@/lib/financas";
import { parcelasDe } from "@/lib/pedidos";

const arred = (v: number) => Math.round(v * 100) / 100;

function Linha({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 text-sm ${forte ? "font-semibold" : ""}`}>
      <span className="min-w-0 truncate text-muted-foreground">{rotulo}</span>
      <span className="shrink-0 tabular-nums">{valor}</span>
    </div>
  );
}

function DetalheSessao({ caixa }: { caixa: Caixa }) {
  const { pedidos } = usePedidos();
  const { despesas } = useDespesas();

  const d = useMemo(() => {
    const mov = calcularMovimentoSessao(caixa, pedidos, despesas);
    const validos = pedidos.filter(
      (p) => (p.status === "concluido" || p.status === "em-rota") && naSessao(caixa, p.criadoEm),
    );
    const bruto = { PIX: 0, Dinheiro: 0, Débito: 0, Crédito: 0, Fiado: 0, Vale: 0 };
    const taxa = { Débito: 0, Crédito: 0 };
    const taxasSessao = despesas.filter(
      (x) => x.categoria === CATEGORIA_TAXA_CARTAO && naSessao(caixa, x.criadoEm),
    );
    for (const p of validos) {
      const parcelas = parcelasDe(p);
      for (const x of parcelas) bruto[x.forma] += x.valor;
      const deb = parcelas.filter((x) => x.forma === "Débito").reduce((s, x) => s + x.valor, 0);
      const cre = parcelas.filter((x) => x.forma === "Crédito").reduce((s, x) => s + x.valor, 0);
      if (deb + cre <= 0) continue;
      const t = taxasSessao
        .filter((x) => x.descricao.endsWith(`#${p.numero}`))
        .reduce((s, x) => s + x.valor, 0);
      taxa.Débito += (t * deb) / (deb + cre);
      taxa.Crédito += (t * cre) / (deb + cre);
    }
    const despesasDinheiro = caixa.movimentos.filter((m) => sangriaDeDespesa(m));
    const sangriasAvulsas = caixa.movimentos.filter((m) => m.tipo === "sangria" && !sangriaDeDespesa(m));
    const esperado = caixa.contado != null && caixa.diferenca != null ? caixa.contado - caixa.diferenca : undefined;
    return { mov, bruto, taxa, despesasDinheiro, sangriasAvulsas, esperado };
  }, [caixa, pedidos, despesas]);

  const suprimentos = caixa.movimentos.filter((m) => m.tipo === "suprimento");
  const dif = caixa.diferenca ?? 0;

  return (
    <div className="grid gap-5">
      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">Entradas por forma de pagamento</h3>
        <div className="grid gap-1.5 rounded-lg border border-border p-3">
          <Linha rotulo="PIX (bruto / líquido)" valor={`${brl(d.bruto.PIX)} / ${brl(d.bruto.PIX)}`} />
          <Linha rotulo="Dinheiro / Espécie" valor={brl(d.bruto.Dinheiro)} />
          {(["Débito", "Crédito"] as const).map((f) => (
            <Linha
              key={f}
              rotulo={`Cartão de ${f} (bruto / taxa / líquido)`}
              valor={`${brl(d.bruto[f])} / -${brl(arred(d.taxa[f]))} / ${brl(arred(d.bruto[f] - d.taxa[f]))}`}
            />
          ))}
          <Linha rotulo="Fiado / Caderneta" valor={brl(d.bruto.Fiado)} />
          {d.bruto.Vale > 0 && <Linha rotulo="Vale" valor={brl(d.bruto.Vale)} />}
          {d.mov.recebimentosPix + d.mov.recebimentosDinheiro + d.mov.recebimentosCartao > 0 && (
            <Linha
              rotulo="Baixas de fiado recebidas"
              valor={brl(d.mov.recebimentosPix + d.mov.recebimentosDinheiro + d.mov.recebimentosCartao)}
            />
          )}
        </div>
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">Movimentações do caixa</h3>
        <div className="grid gap-1.5 rounded-lg border border-border p-3">
          <Linha rotulo="Troco inicial" valor={brl(caixa.trocoInicial)} />
          <Linha rotulo="Suprimentos" valor={brl(somaMovimentos(suprimentos, "suprimento"))} />
          {suprimentos.map((m) => (
            <Linha key={m.id} rotulo={`· ${horaCurta(m.em)} ${m.motivo}`} valor={brl(m.valor)} />
          ))}
          <Linha rotulo="Sangrias" valor={`-${brl(somaMovimentos(d.sangriasAvulsas, "sangria"))}`} />
          {d.sangriasAvulsas.map((m) => (
            <Linha key={m.id} rotulo={`· ${horaCurta(m.em)} ${m.motivo}`} valor={`-${brl(m.valor)}`} />
          ))}
          <Linha
            rotulo="Despesas pagas com dinheiro do caixa"
            valor={`-${brl(somaMovimentos(d.despesasDinheiro, "sangria"))}`}
          />
          {d.despesasDinheiro.map((m) => (
            <Linha key={m.id} rotulo={`· ${horaCurta(m.em)} ${m.motivo}`} valor={`-${brl(m.valor)}`} />
          ))}
        </div>
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-semibold">Resumo de conferência</h3>
        <div className="grid gap-1.5 rounded-lg border border-border p-3">
          <Linha rotulo="Dinheiro esperado na gaveta" valor={d.esperado != null ? brl(d.esperado) : "—"} />
          <Linha rotulo="Dinheiro contado" valor={brl(caixa.contado ?? 0)} />
          <div className="flex items-center justify-between gap-3 text-sm font-semibold">
            <span>{Math.abs(dif) < 0.01 ? "Sem diferença" : dif > 0 ? "Sobra" : "Falta"}</span>
            <Badge variant={Math.abs(dif) < 0.01 ? "secondary" : "destructive"}>
              {dif >= 0 ? "+" : "-"}
              {brl(Math.abs(dif))}
            </Badge>
          </div>
        </div>
      </section>
    </div>
  );
}

export function HistoricoFechamentos({ fechados }: { fechados: Caixa[] }) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<Caixa | null>(null);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <Collapsible open={aberto} onOpenChange={setAberto}>
        <CardHeader className="py-4">
          <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left text-base font-semibold">
            Ver Histórico de Fechamentos de Caixa ({fechados.length} sessões)
            <ChevronDown className={`size-4 shrink-0 transition-transform ${aberto ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            {fechados.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum caixa fechado ainda. Os fechamentos feitos em “Caixa &amp; Acerto” aparecem aqui.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {fechados.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() => setSel(c)}
                    className="grid gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {dataCurta(c.abertoEm)} · {horaCurta(c.abertoEm)} às{" "}
                        {c.fechadoEm ? horaCurta(c.fechadoEm) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Troco inicial {brl(c.trocoInicial)} · Sangrias{" "}
                        {brl(somaMovimentos(c.movimentos, "sangria"))} · Suprimentos{" "}
                        {brl(somaMovimentos(c.movimentos, "suprimento"))}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-sm tabular-nums">Contado {brl(c.contado ?? 0)}</span>
                      <Badge variant={Math.abs(c.diferenca ?? 0) < 0.01 ? "secondary" : "destructive"}>
                        {(c.diferenca ?? 0) >= 0 ? "+" : "-"}
                        {brl(Math.abs(c.diferenca ?? 0))}
                      </Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={!!sel} onOpenChange={(v) => !v && setSel(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Fechamento de {sel ? dataCurta(sel.abertoEm) : ""}</DialogTitle>
            <DialogDescription>
              {sel
                ? `Sessão das ${horaCurta(sel.abertoEm)} às ${sel.fechadoEm ? horaCurta(sel.fechadoEm) : "—"}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          {sel && <DetalheSessao caixa={sel} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

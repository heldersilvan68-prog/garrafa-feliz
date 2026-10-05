import type React from "react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Package, Receipt, TrendingUp, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { useRegrasParceria } from "@/components/clientes/regras-parceria";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePeriodo } from "@/hooks/use-periodo";
import { useClientes } from "@/context/clientes";
import { usePedidos } from "@/context/pedidos";
import { useEstoque } from "@/context/estoque";
import { useCaixa } from "@/context/caixa";
import { brl, custoUnidades } from "@/lib/erp";
import { isoLocal } from "@/lib/periodo";
import { rotuloCliente } from "@/lib/clientes";
import { saldoFiadoCliente, valorEmAberto, valorFaturado, type Pedido } from "@/lib/pedidos";
import {
  CATEGORIA_COMISSAO_PARCERIA,
  comissaoPedido,
  pedidoParceriaValido,
  unidadesPedido,
  type AcertoParceria,
} from "@/lib/parcerias";

const arred = (v: number) => Math.round(v * 100) / 100;
const FORMAS = ["PIX", "Dinheiro"] as const;

export function useAcertosParceria() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["acertos-parceria", userId],
    enabled: !!userId,
    queryFn: async (): Promise<AcertoParceria[]> => {
      const { data, error } = await supabase
        .from("partner_settlements")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clienteId: r.client_id,
        inicio: r.inicio,
        fim: r.fim,
        qtd: r.qtd,
        fiadoTotal: Number(r.fiado_total),
        comissaoTotal: Number(r.comissao_total),
        liquido: Number(r.liquido),
        forma: r.forma,
        despesaId: r.expense_id ?? undefined,
        estornadoEm: r.estornado_em ?? undefined,
        em: r.created_at,
      }));
    },
  });
}

/** Lança no caixa aberto um valor (positivo entra, negativo sai) na conta da forma. */
function lancarNoCaixa(
  registrar: ReturnType<typeof useCaixa>["registrarMovimento"],
  forma: string,
  valor: number,
  motivo: string,
) {
  if (Math.abs(valor) < 0.009) return;
  if (forma === "Dinheiro") {
    registrar(valor > 0 ? "suprimento" : "sangria", Math.abs(valor), `${motivo} (Dinheiro)`);
  } else {
    registrar("recebimento", valor, `${motivo} (PIX)`);
  }
}

export function AcertoParcerias() {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { clientes, definirDivida } = useClientes();
  const { pedidos } = usePedidos();
  const { produtos } = useEstoque();
  const { caixaAberto, registrarMovimento } = useCaixa();
  const { data: regras = [] } = useRegrasParceria();
  const { data: acertos = [] } = useAcertosParceria();
  const periodo = usePeriodo("mes");
  const parceiros = useMemo(() => clientes.filter((c) => c.parceiro), [clientes]);
  const [parceiroId, setParceiroId] = useState("");
  const [forma, setForma] = useState<(typeof FORMAS)[number]>("PIX");
  const idSel = parceiroId || parceiros[0]?.id || "";
  const parceiro = parceiros.find((c) => c.id === idSel);
  const idsParceiros = useMemo(() => new Set(parceiros.map((c) => c.id)), [parceiros]);
  const porProduto = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);

  const regrasDe = (clienteId: string) => regras.filter((r) => r.clienteId === clienteId);

  // ---- Cards gerais (histórico) ----
  const geral = useMemo(() => {
    const validos = pedidos.filter((p) => idsParceiros.has(p.clienteId) && pedidoParceriaValido(p));
    const qtd = validos.reduce((s, p) => s + unidadesPedido(p), 0);
    const faturamento = validos.reduce((s, p) => s + valorFaturado(p), 0);
    const custo = validos.reduce(
      (s, p) =>
        s +
        p.itens.reduce((a, i) => {
          const prod = porProduto.get(i.produtoId);
          return a + (prod ? custoUnidades(prod, i.qtd) : 0);
        }, 0),
      0,
    );
    const comissoes = acertos
      .filter((a) => !a.estornadoEm)
      .reduce((s, a) => s + a.comissaoTotal, 0);
    return { qtd, comissoes, lucro: arred(faturamento - custo - comissoes) };
  }, [pedidos, idsParceiros, porProduto, acertos]);

  // ---- Painel do período ----
  const { inicio, fim } = periodo.faixa;
  const doPeriodo = useMemo(
    () =>
      pedidos.filter((p) => {
        if (p.clienteId !== idSel || !pedidoParceriaValido(p) || p.acertoParceriaId) return false;
        const d = isoLocal(p.criadoEm);
        return (!inicio || d >= inicio) && (!fim || d <= fim);
      }),
    [pedidos, idSel, inicio, fim],
  );
  const regrasSel = regrasDe(idSel);
  const qtd = doPeriodo.reduce((s, p) => s + unidadesPedido(p), 0);
  const fiado = arred(doPeriodo.reduce((s, p) => s + valorEmAberto(p), 0));
  const comissao = arred(doPeriodo.reduce((s, p) => s + comissaoPedido(p, regrasSel), 0));
  const liquido = arred(fiado - comissao);

  const invalidar = () => {
    for (const k of ["acertos-parceria", "pedidos", "despesas", "caixa", "clientes"])
      qc.invalidateQueries({ queryKey: [k] });
  };

  const acertar = useMutation({
    mutationFn: async () => {
      if (!userId || !parceiro) throw new Error("Selecione a parceira");
      if (!caixaAberto) throw new Error("Abra o caixa do dia antes do acerto");
      if (doPeriodo.length === 0) throw new Error("Nenhum pedido pendente de acerto no período");
      const hoje = isoLocal(new Date());
      let despesaId: string | null = null;
      if (comissao > 0.009) {
        const { data: d, error: e } = await supabase
          .from("expenses")
          .insert({
            user_id: userId,
            descricao: `Comissão parceria — ${parceiro.nome}`,
            categoria: CATEGORIA_COMISSAO_PARCERIA,
            valor: comissao,
            data: hoje,
            forma: "Abatido no acerto",
            status: "Pago",
            observacoes: `Período ${inicio || "início"} a ${fim || hoje}`,
          })
          .select("id")
          .single();
        if (e) throw e;
        despesaId = d.id;
      }
      const { data: acerto, error } = await supabase
        .from("partner_settlements")
        .insert({
          user_id: userId,
          client_id: parceiro.id,
          inicio: inicio || doPeriodo.map((p) => isoLocal(p.criadoEm)).sort()[0]!,
          fim: fim || hoje,
          qtd,
          fiado_total: fiado,
          comissao_total: comissao,
          liquido,
          forma,
          expense_id: despesaId,
        })
        .select("id")
        .single();
      if (error) throw error;
      const agora = new Date().toISOString();
      for (const p of doPeriodo) {
        const aberto = valorEmAberto(p) > 0;
        const { error: e } = await supabase
          .from("orders")
          .update({
            partner_settlement_id: acerto.id,
            comissao_parceria: comissaoPedido(p, regrasSel),
            ...(aberto ? { pago: true, pago_em: agora } : {}),
          })
          .eq("id", p.id);
        if (e) throw e;
      }
      lancarNoCaixa(registrarMovimento, forma, liquido, `Acerto parceria — ${parceiro.nome}`);
      const ids = new Set(doPeriodo.map((p) => p.id));
      const restantes = pedidos.map((p) => (ids.has(p.id) ? { ...p, pago: true } : p));
      await definirDivida(parceiro.id, saldoFiadoCliente(restantes, parceiro.id));
    },
    onSuccess: () => {
      toast.success("Acerto de parceria realizado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(`Não foi possível realizar o acerto: ${e.message}`),
  });

  const estornar = useMutation({
    mutationFn: async (a: AcertoParceria) => {
      if (!caixaAberto) throw new Error("Abra o caixa do dia antes de estornar");
      const nome = clientes.find((c) => c.id === a.clienteId)?.nome ?? "parceira";
      const vinculados = pedidos.filter((p) => p.acertoParceriaId === a.id);
      for (const p of vinculados) {
        const eraFiado = p.valorFiado > 0 || p.pagamento === "Fiado";
        const { error } = await supabase
          .from("orders")
          .update({
            partner_settlement_id: null,
            comissao_parceria: 0,
            ...(eraFiado && p.status !== "cancelado" ? { pago: false, pago_em: null } : {}),
          })
          .eq("id", p.id);
        if (error) throw error;
      }
      if (a.despesaId) await supabase.from("expenses").delete().eq("id", a.despesaId);
      const { error } = await supabase
        .from("partner_settlements")
        .update({ estornado_em: new Date().toISOString() })
        .eq("id", a.id);
      if (error) throw error;
      lancarNoCaixa(registrarMovimento, a.forma, -a.liquido, `Estorno acerto parceria — ${nome}`);
      const ids = new Set(vinculados.map((p) => p.id));
      const restantes: Pedido[] = pedidos.map((p) =>
        ids.has(p.id) && (p.valorFiado > 0 || p.pagamento === "Fiado")
          ? { ...p, pago: false, acertoParceriaId: undefined }
          : p,
      );
      await definirDivida(a.clienteId, saldoFiadoCliente(restantes, a.clienteId));
    },
    onSuccess: () => {
      toast.success("Acerto estornado.");
      invalidar();
    },
    onError: (e: Error) => toast.error(`Não foi possível estornar: ${e.message}`),
  });

  const Card3 = ({ t, v, i }: { t: string; v: string; i: React.ReactNode }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground">{t}</CardTitle>
        {i}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{v}</p>
      </CardContent>
    </Card>
  );

  if (parceiros.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Nenhuma empresa parceira. Marque "É Empresa Parceira" no cadastro do cliente e configure
          a tabela de comissões na ficha dele.
        </CardContent>
      </Card>
    );
  }

  const acertosSel = acertos.filter((a) => a.clienteId === idSel);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card3
          t="Total de águas entregues via parceria"
          v={`${geral.qtd} un`}
          i={<Package className="size-4 text-primary" />}
        />
        <Card3
          t="Total pago em comissões de parcerias"
          v={brl(geral.comissoes)}
          i={<Receipt className="size-4 text-primary" />}
        />
        <Card3
          t="Lucro líquido com parcerias"
          v={brl(geral.lucro)}
          i={<TrendingUp className="size-4 text-primary" />}
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Handshake className="size-4 text-primary" /> Fechamento / Acerto
          </CardTitle>
          <CardDescription>Pedidos ainda não acertados da parceira no período.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Empresa parceira</Label>
              <Select value={idSel} onValueChange={setParceiroId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {parceiros.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {rotuloCliente(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FiltroPeriodo estado={periodo} comRotulos />
          </div>

          {regrasSel.length === 0 && (
            <p className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs">
              Esta parceira não tem regras de comissão — as comissões ficarão zeradas.
            </p>
          )}

          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt>Total de águas entregues</dt>
              <dd className="font-semibold tabular-nums">{qtd} un</dd>
            </div>
            <div className="flex justify-between">
              <dt>Saldo devedor pendente (fiado)</dt>
              <dd className="font-semibold tabular-nums">{brl(fiado)}</dd>
            </div>
            <div className="flex justify-between text-destructive">
              <dt>(−) Total de comissões geradas</dt>
              <dd className="font-semibold tabular-nums">{brl(comissao)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold">(=) Valor líquido a receber</dt>
              <dd className={`font-bold tabular-nums ${liquido < 0 ? "text-destructive" : "text-success"}`}>
                {brl(liquido)}
              </dd>
            </div>
            {liquido < 0 && (
              <p className="text-xs text-muted-foreground">
                Valor negativo: a comissão supera o fiado — o acerto registra uma saída do caixa
                para pagar a parceira.
              </p>
            )}
          </dl>

          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1">
              <Label className="text-xs">Forma do acerto</Label>
              <Select value={forma} onValueChange={(v) => setForma(v as typeof forma)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORMAS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              disabled={acertar.isPending || doPeriodo.length === 0}
              onClick={() => {
                if (confirm(`Confirmar acerto de ${brl(liquido)} em ${forma}?`)) acertar.mutate();
              }}
            >
              <Wallet className="size-4" />
              {acertar.isPending ? "Processando…" : "Realizar Acerto de Parceria"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Acertos realizados</CardTitle>
        </CardHeader>
        <CardContent>
          {acertosSel.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum acerto.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {acertosSel.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
                >
                  <span>
                    <span className="block font-medium">
                      {new Date(a.em).toLocaleDateString("pt-BR")} · {a.qtd} un · {a.forma}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Fiado {brl(a.fiadoTotal)} − comissão {brl(a.comissaoTotal)} = {brl(a.liquido)}
                      {a.estornadoEm && " · ESTORNADO"}
                    </span>
                  </span>
                  {!a.estornadoEm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={estornar.isPending}
                      onClick={() => {
                        if (confirm("Estornar este acerto? Os fiados voltam a ficar em aberto."))
                          estornar.mutate(a);
                      }}
                    >
                      <Undo2 className="size-4" /> Estornar
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

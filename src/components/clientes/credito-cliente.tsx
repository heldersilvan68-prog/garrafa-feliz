import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useCaixa } from "@/context/caixa";
import { useClientes } from "@/context/clientes";
import { brl } from "@/lib/erp";
import type { Cliente } from "@/lib/clientes";

type Forma = "PIX" | "Dinheiro" | "Cartão";

type Lancamento = {
  id: string;
  valor: number;
  forma: string;
  observacao: string | null;
  created_at: string;
  estornado_em: string | null;
  motivo_estorno: string | null;
};

export function CreditoCliente({ cliente }: { cliente: Cliente }) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  const { registrarMovimento, caixaAberto } = useCaixa();
  const { ajustarCredito } = useClientes();
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");
  const [forma, setForma] = useState<Forma>("PIX");
  const [obs, setObs] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [estornando, setEstornando] = useState<Lancamento | null>(null);
  const [motivoEstorno, setMotivoEstorno] = useState("");

  const chave = ["creditos-cliente", cliente.id];
  const { data: extrato = [] } = useQuery({
    queryKey: chave,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_credit_entries" as never)
        .select("*")
        .eq("client_id", cliente.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Lancamento[];
    },
  });

  const confirmar = async () => {
    const v = Math.round((Number(valor.replace(",", ".")) || 0) * 100) / 100;
    if (v <= 0) return toast.error("Informe um valor maior que zero.");
    if (!caixaAberto) return toast.error("Abra o caixa para registrar o recebimento.");
    if (!userId) return toast.error("Sessão expirada");
    setSalvando(true);
    try {
      const { error } = await supabase.from("client_credit_entries" as never).insert({
        user_id: userId,
        client_id: cliente.id,
        valor: v,
        forma,
        observacao: obs.trim() || null,
      } as never);
      if (error) throw error;
      await ajustarCredito(cliente.id, v);
      registrarMovimento(
        forma === "Dinheiro" ? "suprimento" : "recebimento",
        v,
        `Saldo adicionado — ${cliente.nome} (${forma})${obs.trim() ? ` · ${obs.trim()}` : ""}`,
      );
      queryClient.invalidateQueries({ queryKey: chave });
      toast.success(`${brl(v)} adicionado ao saldo de ${cliente.nome}.`);
      setAberto(false);
      setValor("");
      setObs("");
    } catch (e) {
      toast.error(`Não foi possível lançar o crédito: ${(e as Error).message}`);
    } finally {
      setSalvando(false);
    }
  };

  const confirmarEstorno = async () => {
    const l = estornando;
    if (!l) return;
    const motivo = motivoEstorno.trim();
    if (!motivo) return toast.error("Informe o motivo do estorno.");
    if (!caixaAberto) return toast.error("Abra o caixa para registrar o estorno.");
    const v = Number(l.valor);
    if ((cliente.saldoCredito ?? 0) + 0.009 < v)
      return toast.error("O cliente já usou parte deste crédito; saldo insuficiente para estornar.");
    setSalvando(true);
    try {
      const { error } = await supabase
        .from("client_credit_entries" as never)
        .update({ estornado_em: new Date().toISOString(), motivo_estorno: motivo } as never)
        .eq("id", l.id)
        .is("estornado_em", null);
      if (error) throw error;
      await ajustarCredito(cliente.id, -v);
      if (l.forma === "Dinheiro") {
        registrarMovimento("sangria", v, `Estorno de crédito — ${cliente.nome} (Dinheiro) · ${motivo}`);
      } else {
        registrarMovimento("recebimento", -v, `Estorno de crédito — ${cliente.nome} (${l.forma}) · ${motivo}`);
      }
      queryClient.invalidateQueries({ queryKey: chave });
      toast.success(`Crédito de ${brl(v)} estornado.`);
      setEstornando(null);
      setMotivoEstorno("");
    } catch (e) {
      toast.error(`Não foi possível estornar: ${(e as Error).message}`);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          Crédito / Saldo: {brl(cliente.saldoCredito ?? 0)}
        </CardTitle>
        <Button size="sm" onClick={() => setAberto(true)}>
          <Plus className="size-4" /> Adicionar Crédito / Saldo
        </Button>
      </CardHeader>
      <CardContent>
        {extrato.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum lançamento de crédito manual.</p>
        ) : (
          <ul className="divide-y text-sm">
            {extrato.map((l) => (
              <li key={l.id} className="flex items-start justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {new Date(l.created_at).toLocaleString("pt-BR", {
                      timeZone: "America/Bahia",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {l.forma}
                  </p>
                  {l.observacao && (
                    <p className="break-words text-xs text-muted-foreground">{l.observacao}</p>
                  )}
                  {l.estornado_em && (
                    <p className="break-words text-xs text-destructive">
                      Estornado em{" "}
                      {new Date(l.estornado_em).toLocaleString("pt-BR", {
                        timeZone: "America/Bahia",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {l.motivo_estorno ? ` · ${l.motivo_estorno}` : ""}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`font-semibold tabular-nums ${l.estornado_em ? "text-muted-foreground line-through" : "text-success"}`}
                  >
                    + {brl(Number(l.valor))}
                  </span>
                  {!l.estornado_em && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={() => {
                        setMotivoEstorno("");
                        setEstornando(l);
                      }}
                    >
                      <Undo2 className="size-3" /> Estornar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar crédito / saldo</DialogTitle>
            <DialogDescription>
              O valor entra no caixa de hoje e fica disponível para {cliente.nome}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Valor do crédito (R$)</Label>
              <Input
                inputMode="decimal"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Forma de recebimento</Label>
              <Select value={forma} onValueChange={(v) => setForma(v as Forma)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Cartão">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Observação / Motivo</Label>
              <Textarea
                placeholder="Ex.: Crédito ref. PIX do pedido #XXXX não entregue"
                value={obs}
                onChange={(e) => setObs(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmar} disabled={salvando}>
              {salvando ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!estornando} onOpenChange={(o) => !o && setEstornando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Estornar crédito</DialogTitle>
            <DialogDescription>
              {estornando &&
                `${brl(Number(estornando.valor))} (${estornando.forma}) sai do caixa de hoje e do saldo de ${cliente.nome}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label>Motivo do estorno</Label>
            <Textarea
              placeholder="Ex.: Lançado em duplicidade"
              value={motivoEstorno}
              onChange={(e) => setMotivoEstorno(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEstornando(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarEstorno} disabled={salvando}>
              {salvando ? "Estornando..." : "Confirmar estorno"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

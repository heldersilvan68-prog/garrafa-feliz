import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Handshake, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { brl } from "@/lib/erp";
import type { Cliente } from "@/lib/clientes";
import type { RegraParceria } from "@/lib/parcerias";

/** Todas as regras de comissão de parceria do usuário. */
export function useRegrasParceria() {
  const { userId } = useAuth();
  return useQuery({
    queryKey: ["regras-parceria", userId],
    enabled: !!userId,
    queryFn: async (): Promise<RegraParceria[]> => {
      const { data, error } = await supabase
        .from("partner_commission_rules")
        .select("*")
        .order("preco_venda");
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        clienteId: r.client_id,
        precoVenda: Number(r.preco_venda),
        comissaoUnit: Number(r.comissao_unit),
      }));
    },
  });
}

export function RegrasParceria({ cliente }: { cliente: Cliente }) {
  const { userId } = useAuth();
  const qc = useQueryClient();
  const { data = [] } = useRegrasParceria();
  const regras = data.filter((r) => r.clienteId === cliente.id);
  const [preco, setPreco] = useState("");
  const [comissao, setComissao] = useState("");

  const invalidar = () => qc.invalidateQueries({ queryKey: ["regras-parceria"] });

  const adicionar = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Sessão expirada");
      const p = Number(preco.replace(",", "."));
      const c = Number(comissao.replace(",", "."));
      if (!(p > 0) || !(c >= 0)) throw new Error("Informe preço e comissão válidos");
      if (regras.some((r) => Math.abs(r.precoVenda - p) < 0.001))
        throw new Error("Já existe uma regra para esse preço");
      const { error } = await supabase
        .from("partner_commission_rules")
        .insert({ user_id: userId, client_id: cliente.id, preco_venda: p, comissao_unit: c });
      if (error) throw error;
    },
    onSuccess: () => {
      setPreco("");
      setComissao("");
      invalidar();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const atualizar = useMutation({
    mutationFn: async (r: { id: string; preco_venda?: number; comissao_unit?: number }) => {
      const { id, ...dados } = r;
      const { error } = await supabase.from("partner_commission_rules").update(dados).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  const remover = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_commission_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidar,
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Handshake className="size-4" /> Regras de comissão da parceria
        </CardTitle>
        <CardDescription>
          Preço de venda praticado → comissão por unidade. Sem preço igual, vale a linha de maior
          preço abaixo do praticado.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {regras.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma regra cadastrada.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {regras.map((r) => (
              <li key={r.id} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div className="grid gap-1">
                  <Label className="text-xs">Venda (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={r.precoVenda}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v > 0 && v !== r.precoVenda)
                        atualizar.mutate({ id: r.id, preco_venda: v });
                    }}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Comissão / un (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    defaultValue={r.comissaoUnit}
                    onBlur={(e) => {
                      const v = Number(e.target.value);
                      if (v >= 0 && v !== r.comissaoUnit)
                        atualizar.mutate({ id: r.id, comissao_unit: v });
                    }}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover regra de ${brl(r.precoVenda)}`}
                  onClick={() => remover.mutate(r.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2 border-t border-border pt-3">
          <div className="grid gap-1">
            <Label className="text-xs">Nova: venda a (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              placeholder="11,00"
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Comissão / un (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={comissao}
              onChange={(e) => setComissao(e.target.value)}
              placeholder="1,00"
            />
          </div>
          <Button onClick={() => adicionar.mutate()} disabled={adicionar.isPending}>
            <Plus className="size-4" /> Adicionar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

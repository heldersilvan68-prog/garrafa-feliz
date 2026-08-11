import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientes } from "@/context/clientes";
import {
  formatarData,
  hojeISO,
  mascaraTelefone,
  proximaCompra,
  proximoCodigo,
  telefoneInternacional,
  type Cliente,
} from "@/lib/clientes";

const vazio: Cliente = {
  id: "",
  codigo: "",
  nome: "",
  telefone: "",
  endereco: "",
  documento: "",
  consumoMedioDias: 7,
  ultimaCompra: hojeISO(),
  historico: [],
};

export function ClienteDialog({
  cliente,
  children,
}: {
  cliente?: Cliente;
  children: ReactNode;
}) {
  const { salvar, clientes } = useClientes();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Cliente>(cliente ?? vazio);
  const [telefone, setTelefone] = useState(mascaraTelefone(cliente?.telefone ?? ""));

  useEffect(() => {
    if (!aberto) return;
    const base =
      cliente ??
      ({ ...vazio, codigo: proximoCodigo(clientes), ultimaCompra: hojeISO() } as Cliente);
    setForm(base);
    setTelefone(mascaraTelefone(base.telefone));
  }, [aberto, cliente, clientes]);

  const set = <K extends keyof Cliente>(k: K, v: Cliente[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    const digitos = telefone.replace(/\D/g, "");
    if (digitos && digitos.length < 10) {
      toast.error("Telefone incompleto — informe DDD + número.");
      return;
    }
    salvar({
      ...form,
      id: form.id || `c${Date.now()}`,
      codigo: form.codigo?.trim() || proximoCodigo(clientes),
      telefone: telefoneInternacional(telefone),
      documento: form.documento?.trim() || undefined,
      consumoMedioDias: Math.max(1, Math.round(form.consumoMedioDias || 1)),
    });
    toast.success(cliente ? "Cliente atualizado." : "Cliente cadastrado.");
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Novo Cliente"}</DialogTitle>
          <DialogDescription>
            Dados de contato e consumo para prever a próxima compra.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-4 sm:grid-cols-[110px_minmax(0,1fr)]">
            <div className="grid gap-2">
              <Label htmlFor="ccodigo">Código</Label>
              <Input
                id="ccodigo"
                value={form.codigo ?? ""}
                onChange={(e) => set("codigo", e.target.value)}
                placeholder="01"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cnome">Nome</Label>
              <Input
                id="cnome"
                value={form.nome}
                onChange={(e) => set("nome", e.target.value)}
                placeholder="Ex.: Padaria Pão Quente"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ctel">Telefone / WhatsApp</Label>
              <Input
                id="ctel"
                type="tel"
                inputMode="numeric"
                value={telefone}
                onChange={(e) => setTelefone(mascaraTelefone(e.target.value))}
                placeholder="(11) 98888-0000"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cdoc">CPF / CNPJ (opcional)</Label>
              <Input
                id="cdoc"
                value={form.documento ?? ""}
                onChange={(e) => set("documento", e.target.value)}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cend">Endereço</Label>
            <Input
              id="cend"
              value={form.endereco}
              onChange={(e) => set("endereco", e.target.value)}
              placeholder="Rua, número — bairro"
            />
          </div>

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-xs text-muted-foreground">Consumo médio e próxima compra</p>
            <p className="text-sm">
              {form.historico.length > 1
                ? `Média atual de ${form.consumoMedioDias} dia(s) · previsão ${formatarData(
                    proximaCompra({ ...form, id: form.id || "tmp" }),
                  )}`
                : "Calculados automaticamente a partir dos pedidos reais do cliente."}
            </p>
          </div>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={submit}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

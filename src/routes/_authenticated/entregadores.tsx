import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ListaCarregando } from "@/components/lista-carregando";
import { useEntregadores } from "@/context/entregadores";
import { mascaraTelefone } from "@/lib/clientes";
import {
  TIPOS_ENTREGADOR,
  tipoLabel,
  type Entregador,
  type TipoEntregador,
} from "@/lib/entregadores";

export const Route = createFileRoute("/_authenticated/entregadores")({
  head: () => ({
    meta: [
      { title: "Cadastro de Entregadores e Auxiliares — AquaERP" },
      {
        name: "description",
        content:
          "Cadastre, edite e exclua entregadores/motoboys e auxiliares da distribuidora, com telefone, documento e status ativo.",
      },
      { property: "og:title", content: "Cadastro de Entregadores e Auxiliares — AquaERP" },
      {
        property: "og:description",
        content: "Gestão completa da equipe de entrega: novo cadastro, edição e exclusão.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EntregadoresPage,
});

const vazio = {
  nome: "",
  telefone: "",
  documento: "",
  tipo: "entregador" as TipoEntregador,
  ativo: true,
  observacoes: "",
};

function EntregadorDialog({
  entregador,
  children,
}: {
  entregador?: Entregador;
  children: React.ReactNode;
}) {
  const { salvar } = useEntregadores();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(() =>
    entregador
      ? {
          nome: entregador.nome,
          telefone: entregador.telefone,
          documento: entregador.documento ?? "",
          tipo: entregador.tipo,
          ativo: entregador.ativo,
          observacoes: entregador.observacoes ?? "",
        }
      : vazio,
  );

  const abrir = (v: boolean) => {
    setOpen(v);
    if (v) {
      setForm(
        entregador
          ? {
              nome: entregador.nome,
              telefone: entregador.telefone,
              documento: entregador.documento ?? "",
              tipo: entregador.tipo,
              ativo: entregador.ativo,
              observacoes: entregador.observacoes ?? "",
            }
          : vazio,
      );
    }
  };

  const enviar = async () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do cadastro.");
      return;
    }
    await salvar({ ...form, ...(entregador ? { id: entregador.id } : {}) });
    toast.success(entregador ? "Cadastro atualizado!" : "Cadastro criado!");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={abrir}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entregador ? "Editar cadastro" : "Novo cadastro"}</DialogTitle>
          <DialogDescription>
            Entregadores e auxiliares ficam disponíveis para seleção nos pedidos e nas comissões.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="ent-nome">Nome *</Label>
            <Input
              id="ent-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex.: Carlos Silva"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="ent-tel">Telefone</Label>
              <Input
                id="ent-tel"
                value={form.telefone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, telefone: mascaraTelefone(e.target.value) }))
                }
                placeholder="(00) 00000-0000"
                inputMode="numeric"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ent-doc">CPF / CNPJ (opcional)</Label>
              <Input
                id="ent-doc"
                value={form.documento}
                onChange={(e) => setForm((f) => ({ ...f, documento: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Função</Label>
              <Select
                value={form.tipo}
                onValueChange={(v) => setForm((f) => ({ ...f, tipo: v as TipoEntregador }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_ENTREGADOR.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <Label htmlFor="ent-ativo" className="text-sm">
                Ativo
              </Label>
              <Switch
                id="ent-ativo"
                checked={form.ativo}
                onCheckedChange={(v) => setForm((f) => ({ ...f, ativo: v }))}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ent-obs">Observações</Label>
            <Textarea
              id="ent-obs"
              value={form.observacoes}
              onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={enviar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExcluirDialog({ entregador }: { entregador: Entregador }) {
  const { remover } = useEntregadores();
  return (
    <ConfirmarExclusao
      titulo={`Excluir ${entregador.nome}?`}
      descricao="Esta ação não pode ser desfeita. Os pedidos já registrados mantêm o nome do entregador no histórico."
      sucesso="Cadastro excluído."
      onConfirmar={() => remover(entregador.id)}
    >
      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
        <Trash2 className="size-4" />
        Excluir
      </Button>
    </ConfirmarExclusao>
  );
}

function EntregadoresPage() {
  const { entregadores, carregando } = useEntregadores();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Entregadores & Auxiliares</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro real da equipe — usado nos pedidos, no PDV e nas comissões.
          </p>
        </div>
        <EntregadorDialog>
          <Button>
            <Plus className="size-4" />
            Novo cadastro
          </Button>
        </EntregadorDialog>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="size-4 text-primary" />
            Equipe cadastrada
          </CardTitle>
          <CardDescription>
            {entregadores.length} cadastro(s) · {entregadores.filter((e) => e.ativo).length}{" "}
            ativo(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {carregando ? (
            <ListaCarregando />
          ) : entregadores.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum entregador cadastrado. Clique em “Novo cadastro” para começar.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entregadores.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.nome}</TableCell>
                    <TableCell>{tipoLabel(e.tipo)}</TableCell>
                    <TableCell>{e.telefone || "—"}</TableCell>
                    <TableCell>{e.documento || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={e.ativo ? "default" : "secondary"}>
                        {e.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <EntregadorDialog entregador={e}>
                          <Button variant="ghost" size="sm">
                            <Pencil className="size-4" />
                            Editar
                          </Button>
                        </EntregadorDialog>
                        <ExcluirDialog entregador={e} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

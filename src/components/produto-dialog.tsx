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
import { Switch } from "@/components/ui/switch";
import { SelectComCadastro } from "@/components/select-com-cadastro";
import { ProdutoFoto } from "@/components/produto-foto";
import { useEstoque } from "@/context/estoque";
import { CATEGORIAS_SUGERIDAS, type Produto } from "@/lib/erp";

const vazio: Produto = {
  id: "",
  nome: "",
  categoria: "",
  marca: "",
  unidade: "",
  imagemUrl: "",
  precoCusto: 0,
  precoVenda: 0,
  estoqueMinimo: 0,
  retornavel: false,
  estoqueCheio: 0,
  estoqueVazio: 0,
  custoCasco: 0,
  custoEnvase: 0,
};

export function ProdutoDialog({
  produto,
  children,
}: {
  produto?: Produto;
  children: ReactNode;
}) {
  const { salvar } = useEstoque();
  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<Produto>(produto ?? vazio);

  useEffect(() => {
    if (aberto) setForm(produto ?? vazio);
  }, [aberto, produto]);

  const set = <K extends keyof Produto>(k: K, v: Produto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.nome.trim()) {
      toast.error("Informe o nome do produto.");
      return;
    }
    if (!form.categoria.trim()) {
      toast.error("Selecione ou cadastre uma categoria.");
      return;
    }
    salvar({
      ...form,
      id: form.id || `p${Date.now()}`,
      estoqueVazio: form.retornavel ? form.estoqueVazio : 0,
    });
    toast.success(produto ? "Produto atualizado!" : "Produto cadastrado!");
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{produto ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do item e o controle de vasilhames retornáveis.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="nome">Nome do produto</Label>
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex.: Galão Água Mineral 20L"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="imagem">Foto do produto (URL)</Label>
            <div className="flex items-center gap-3">
              <ProdutoFoto url={form.imagemUrl?.trim() || undefined} nome={form.nome || "produto"} />
              <Input
                id="imagem"
                value={form.imagemUrl ?? ""}
                onChange={(e) => set("imagemUrl", e.target.value)}
                placeholder="https://.../foto.jpg"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Categoria</Label>
            <SelectComCadastro
              tipo="categorias"
              valor={form.categoria}
              onChange={(v) => set("categoria", v)}
              opcoesExtras={CATEGORIAS_SUGERIDAS}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Marca</Label>
              <SelectComCadastro
                tipo="marcas"
                valor={form.marca ?? ""}
                onChange={(v) => set("marca", v)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Unidade de medida</Label>
              <SelectComCadastro
                tipo="unidades"
                valor={form.unidade ?? ""}
                onChange={(v) => set("unidade", v)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="custo">Preço de Custo (R$)</Label>
              <Input
                id="custo"
                type="number"
                step="0.01"
                value={form.precoCusto}
                onChange={(e) => set("precoCusto", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="venda">Preço de Venda (R$)</Label>
              <Input
                id="venda"
                type="number"
                step="0.01"
                value={form.precoVenda}
                onChange={(e) => set("precoVenda", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="min">Quantidade mínima</Label>
              <Input
                id="min"
                type="number"
                value={form.estoqueMinimo}
                onChange={(e) => set("estoqueMinimo", Number(e.target.value))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cheio">Quantidade atual</Label>
              <Input
                id="cheio"
                type="number"
                value={form.estoqueCheio}
                onChange={(e) => set("estoqueCheio", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/40 p-4">
            <div className="min-w-0 pr-4">
              <p className="text-sm font-medium">Produto retornável</p>
              <p className="text-xs text-muted-foreground">
                Controla vasilhames cheios, vazios e patrimônio de cascos.
              </p>
            </div>
            <Switch checked={form.retornavel} onCheckedChange={(v) => set("retornavel", v)} />
          </div>

          {form.retornavel && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="vazio">Vazios no depósito</Label>
                <Input
                  id="vazio"
                  type="number"
                  value={form.estoqueVazio}
                  onChange={(e) => set("estoqueVazio", Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="casco">Custo do casco (R$)</Label>
                <Input
                  id="casco"
                  type="number"
                  step="0.01"
                  value={form.custoCasco}
                  onChange={(e) => set("custoCasco", Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="envase">Custo do envase (R$)</Label>
                <Input
                  id="envase"
                  type="number"
                  step="0.01"
                  value={form.custoEnvase}
                  onChange={(e) => set("custoEnvase", Number(e.target.value))}
                />
              </div>
            </div>
          )}
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

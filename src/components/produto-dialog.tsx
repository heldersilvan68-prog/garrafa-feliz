import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
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
import { Campo } from "@/components/ui/campo";
import { Switch } from "@/components/ui/switch";
import { SelectComCadastro } from "@/components/select-com-cadastro";
import { ProdutoFoto } from "@/components/produto-foto";
import { useEstoque } from "@/context/estoque";
import { arquivoParaMiniatura } from "@/lib/imagem";
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
  unidadesPorFardo: 1,
  precoCustoFardo: 0,
  precoFardo: 0,
  margemDesejada: 0,
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
  const arquivoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (aberto) setForm(produto ?? vazio);
  }, [aberto, produto]);

  const set = <K extends keyof Produto>(k: K, v: Produto[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const escolherArquivo = async (file?: File | null) => {
    if (!file) return;
    try {
      const url = await arquivoParaMiniatura(file);
      set("imagemUrl", url);
      toast.success("Foto carregada!");
    } catch {
      toast.error("Não foi possível carregar essa imagem.");
    }
  };

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
          <Campo label="Nome do produto" htmlFor="nome">
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Ex.: Galão Água Mineral 20L"
            />
          </Campo>

          <div className="flex items-center gap-3">
            <ProdutoFoto
              url={form.imagemUrl?.trim() || undefined}
              nome={form.nome || "produto"}
              className="size-14"
            />
            <Campo label="Foto do produto" htmlFor="imagem" className="flex-1">
              <div className="flex items-center gap-2">
                <Input
                  id="imagem"
                  value={form.imagemUrl?.startsWith("data:") ? "" : (form.imagemUrl ?? "")}
                  onChange={(e) => set("imagemUrl", e.target.value)}
                  placeholder={
                    form.imagemUrl?.startsWith("data:")
                      ? "Foto carregada do dispositivo"
                      : "Cole uma URL ou envie um arquivo"
                  }
                />
                <input
                  ref={arquivoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void escolherArquivo(e.target.files?.[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => arquivoRef.current?.click()}
                >
                  <Upload className="size-4" /> Enviar
                </Button>
              </div>
            </Campo>
          </div>

          <Campo label="Categoria">
            <SelectComCadastro
              tipo="categorias"
              valor={form.categoria}
              onChange={(v) => set("categoria", v)}
              opcoesExtras={CATEGORIAS_SUGERIDAS}
            />
          </Campo>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Marca">
              <SelectComCadastro
                tipo="marcas"
                valor={form.marca ?? ""}
                onChange={(v) => set("marca", v)}
              />
            </Campo>
            <Campo label="Unidade de medida">
              <SelectComCadastro
                tipo="unidades"
                valor={form.unidade ?? ""}
                onChange={(v) => set("unidade", v)}
              />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Preço de Custo (R$)" htmlFor="custo">
              <Input
                id="custo"
                type="number"
                step="0.01"
                value={form.precoCusto}
                onChange={(e) => set("precoCusto", Number(e.target.value))}
              />
            </Campo>
            <Campo label="Preço de Venda (R$)" htmlFor="venda">
              <Input
                id="venda"
                type="number"
                step="0.01"
                value={form.precoVenda}
                onChange={(e) => set("precoVenda", Number(e.target.value))}
              />
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Quantidade mínima" htmlFor="min">
              <Input
                id="min"
                type="number"
                value={form.estoqueMinimo}
                onChange={(e) => set("estoqueMinimo", Number(e.target.value))}
              />
            </Campo>
            <Campo label="Quantidade atual" htmlFor="cheio">
              <Input
                id="cheio"
                type="number"
                value={form.estoqueCheio}
                onChange={(e) => set("estoqueCheio", Number(e.target.value))}
              />
            </Campo>
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
              <Campo label="Vazios no depósito" htmlFor="vazio">
                <Input
                  id="vazio"
                  type="number"
                  value={form.estoqueVazio}
                  onChange={(e) => set("estoqueVazio", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Custo do casco (R$)" htmlFor="casco">
                <Input
                  id="casco"
                  type="number"
                  step="0.01"
                  value={form.custoCasco}
                  onChange={(e) => set("custoCasco", Number(e.target.value))}
                />
              </Campo>
              <Campo label="Custo do envase (R$)" htmlFor="envase">
                <Input
                  id="envase"
                  type="number"
                  step="0.01"
                  value={form.custoEnvase}
                  onChange={(e) => set("custoEnvase", Number(e.target.value))}
                />
              </Campo>
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

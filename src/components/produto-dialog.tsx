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
import { InputNumero } from "@/components/ui/input-numero";
import { Switch } from "@/components/ui/switch";
import { SelectComCadastro } from "@/components/select-com-cadastro";
import { ProdutoFoto } from "@/components/produto-foto";
import { useEstoque } from "@/context/estoque";
import { arquivoParaMiniatura } from "@/lib/imagem";
import {
  CATEGORIAS_SUGERIDAS,
  brl,
  margemReal,
  precoSugerido,
  rotuloEstoque,
  unidPorFardo,
  type Produto,
} from "@/lib/erp";

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
  precoVendaCasco: 0,
  descontoCompleta: 0,
  promoQtd: 0,
  promoPreco: 0,
  patrimonioCascos: 0,
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

  const upf = unidPorFardo(form);
  const sugerido = precoSugerido(form.precoCusto, form.margemDesejada);
  const margem = margemReal(form.precoCusto, form.precoVenda);

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

          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Fardo / caixa</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Informe quantas unidades vêm no fardo para o sistema converter as baixas de estoque
              automaticamente nas vendas avulsas e fechadas.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo label="Unidades por fardo/caixa" htmlFor="upf">
                <InputNumero
                  id="upf"
                  min={1}
                  valor={form.unidadesPorFardo}
                  onValor={(n) => set("unidadesPorFardo", Math.max(1, n || 1))}
                />
              </Campo>
              <Campo label="Preço de Custo do Fardo (R$)" htmlFor="custo-fardo">
                <InputNumero
                  id="custo-fardo"
                  decimal
                  valor={form.precoCustoFardo}
                  onValor={(v) => {
                    setForm((f) => ({
                      ...f,
                      precoCustoFardo: v,
                      precoCusto: upf > 1 ? Math.round((v / upf) * 100) / 100 : f.precoCusto,
                    }));
                  }}
                />
              </Campo>
              <Campo label="Preço de Venda do Fardo (R$)" htmlFor="venda-fardo">
                <InputNumero
                  id="venda-fardo"
                  decimal
                  valor={form.precoFardo}
                  onValor={(n) => set("precoFardo", n)}
                />
              </Campo>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4">
            <p className="mb-3 text-sm font-medium">Precificação inteligente (unidade avulsa)</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Preço de Custo Unitário (R$)" htmlFor="custo">
                <InputNumero
                  id="custo"
                  decimal
                  valor={form.precoCusto}
                  onValor={(n) => set("precoCusto", n)}
                />
              </Campo>
              <Campo label="Margem de Lucro Desejada (%)" htmlFor="margem">
                <InputNumero
                  id="margem"
                  decimal
                  valor={form.margemDesejada}
                  onValor={(n) => set("margemDesejada", n)}
                />
              </Campo>
              <Campo label="Valor do Lucro Previsto (R$)" htmlFor="lucro-prev">
                <Input id="lucro-prev" readOnly value={brl(sugerido - form.precoCusto)} />
              </Campo>
              <Campo label="Preço de Venda Sugerido (R$)" htmlFor="sugerido">
                <div className="flex items-center gap-2">
                  <Input id="sugerido" readOnly value={brl(sugerido)} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => set("precoVenda", sugerido)}
                  >
                    Usar
                  </Button>
                </div>
              </Campo>
              <Campo
                label="Preço de Venda Praticado (R$)"
                htmlFor="venda"
                className="sm:col-span-2"
              >
                <InputNumero
                  id="venda"
                  decimal
                  valor={form.precoVenda}
                  onValor={(n) => set("precoVenda", n)}
                />
              </Campo>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Margem real praticada:{" "}
              <strong className={margem < 0 ? "text-destructive" : "text-success"}>
                {margem.toFixed(2)}%
              </strong>{" "}
              · Lucro por unidade: <strong>{brl(form.precoVenda - form.precoCusto)}</strong>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Quantidade mínima (unidades)" htmlFor="min">
              <InputNumero
                id="min"
                valor={form.estoqueMinimo}
                onValor={(n) => set("estoqueMinimo", n)}
              />
            </Campo>
            <Campo label="Quantidade atual (unidades)" htmlFor="cheio">
              <InputNumero
                id="cheio"
                valor={form.estoqueCheio}
                onValor={(n) => set("estoqueCheio", n)}
              />
            </Campo>
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Estoque atual equivale a <strong>{rotuloEstoque(form.estoqueCheio, upf)}</strong>.
            </p>
          </div>


          <div className="rounded-xl border border-border p-4">
            <p className="text-sm font-medium">Promoção / Tabela de atacado (opcional)</p>
            <p className="mb-3 text-xs text-muted-foreground">
              Regra progressiva: a cada X unidades, o lote sai pelo preço do combo. As unidades
              restantes seguem no preço avulso.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="A cada quantas unidades" htmlFor="promo-qtd">
                <InputNumero
                  id="promo-qtd"
                  valor={form.promoQtd}
                  onValor={(n) => set("promoQtd", Math.max(0, n))}
                />
              </Campo>
              <Campo label="Preço do combo (R$)" htmlFor="promo-preco">
                <InputNumero
                  id="promo-preco"
                  decimal
                  valor={form.promoPreco}
                  onValor={(n) => set("promoPreco", n)}
                />
              </Campo>
            </div>
            {form.promoQtd > 1 && form.promoPreco > 0 && (
              <p className="mt-3 text-xs text-muted-foreground">
                {form.promoQtd} un. por <strong>{brl(form.promoPreco)}</strong> · avulsa{" "}
                <strong>{brl(form.precoVenda)}</strong>
              </p>
            )}
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Vazios no depósito" htmlFor="vazio">
                <InputNumero
                  id="vazio"
                  valor={form.estoqueVazio}
                  onValor={(n) => set("estoqueVazio", n)}
                />
              </Campo>
              <Campo label="Custo do casco (R$)" htmlFor="casco">
                <InputNumero
                  id="casco"
                  decimal
                  valor={form.custoCasco}
                  onValor={(n) => set("custoCasco", n)}
                />
              </Campo>
              <Campo label="Preço de venda do casco (R$)" htmlFor="venda-casco">
                <InputNumero
                  id="venda-casco"
                  decimal
                  valor={form.precoVendaCasco}
                  onValor={(n) => set("precoVendaCasco", n)}
                />
              </Campo>
              <Campo label="Custo do envase (R$)" htmlFor="envase">
                <InputNumero
                  id="envase"
                  decimal
                  valor={form.custoEnvase}
                  onValor={(n) => set("custoEnvase", n)}
                />
              </Campo>
              <Campo
                label="Desconto automático na venda completa (R$)"
                htmlFor="desc-completa"
                className="sm:col-span-2"
              >
                <InputNumero
                  id="desc-completa"
                  decimal
                  valor={form.descontoCompleta}
                  onValor={(n) => set("descontoCompleta", n)}
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

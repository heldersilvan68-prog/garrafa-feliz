import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CreditCard, Pencil, Plus, Save, Sparkles, Tags, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
import { ConfigImpressaoCard } from "@/components/configuracoes/config-impressao";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCatalogo, type TipoAuxiliar } from "@/context/catalogo";
import { useDespesas } from "@/context/despesas";
import {
  TIPOS_PAGAMENTO,
  useConfiguracoes,
  type FormaPagamentoConfig,
} from "@/context/configuracoes";
import { brl } from "@/lib/erp";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações do Sistema — AquaERP" },
      {
        name: "description",
        content:
          "Categorias, formas de pagamento com taxas, meta de vendas mensal e dados da empresa da distribuidora.",
      },
      { property: "og:title", content: "Configurações do Sistema — AquaERP" },
      {
        property: "og:description",
        content: "Parâmetros gerais, taxas de cartão, meta de vendas e dados cadastrais da empresa.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConfiguracoesPage,
});

/* ---------- Lista genérica de cadastros simples ---------- */

function ListaCadastros({
  titulo,
  descricao,
  itens,
  criar,
  renomear,
  remover,
}: {
  titulo: string;
  descricao: string;
  itens: { id: string; nome: string }[];
  criar: (nome: string) => Promise<unknown>;
  renomear: (id: string, nome: string) => Promise<unknown>;
  remover: (id: string) => Promise<unknown>;
}) {
  const [novo, setNovo] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState("");

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tags className="size-4" /> {titulo}
        </CardTitle>
        <CardDescription>{descricao}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
          <Campo label="Novo cadastro" htmlFor={`novo-${titulo}`}>
            <Input
              id={`novo-${titulo}`}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              placeholder="Digite o nome"
            />
          </Campo>
          <Button
            onClick={async () => {
              if (!novo.trim()) return toast.error("Informe o nome.");
              await criar(novo.trim());
              setNovo("");
            }}
          >
            <Plus /> Adicionar
          </Button>
        </div>

        {itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum cadastro ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {itens.map((i) => (
              <li key={i.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-2">
                {editandoId === i.id ? (
                  <Input
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    autoFocus
                  />
                ) : (
                  <span className="truncate px-1 text-sm">{i.nome}</span>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  {editandoId === i.id ? (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await renomear(i.id, editandoNome);
                        setEditandoId(null);
                      }}
                    >
                      <Save className="size-4" /> Salvar
                    </Button>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={`Editar ${i.nome}`}
                      onClick={() => {
                        setEditandoId(i.id);
                        setEditandoNome(i.nome);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )}
                  <ConfirmarExclusao
                    titulo={`Excluir "${i.nome}"?`}
                    descricao="Esta ação não pode ser desfeita."
                    onConfirmar={() => void remover(i.id)}
                  >
                    <Button size="icon" variant="ghost" aria-label={`Excluir ${i.nome}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </ConfirmarExclusao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Formas de pagamento ---------- */

const FORMA_VAZIA = { nome: "", tipo: "Cartão", taxa: 0, ativo: true };

function FormasPagamento() {
  const { formas, salvarForma, removerForma, semearFormasPadrao } = useConfiguracoes();
  const [form, setForm] = useState<Omit<FormaPagamentoConfig, "id"> & { id?: string }>(FORMA_VAZIA);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" /> Formas de pagamento e taxas
          </CardTitle>
          <CardDescription>
            Defina a taxa (%) da maquininha/administradora por bandeira ou forma de recebimento.
          </CardDescription>
        </div>
        <Button variant="outline" onClick={() => void semearFormasPadrao()}>
          <Sparkles /> Criar formas padrão
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px_120px_auto] sm:items-end">
          <Campo label="Nome / bandeira" htmlFor="forma-nome">
            <Input
              id="forma-nome"
              value={form.nome}
              onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              placeholder="Ex.: Cartão de Crédito Visa"
            />
          </Campo>
          <Campo label="Tipo" htmlFor="forma-tipo">
            <Select value={form.tipo} onValueChange={(v) => setForm((f) => ({ ...f, tipo: v }))}>
              <SelectTrigger id="forma-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_PAGAMENTO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Taxa (%)" htmlFor="forma-taxa">
            <Input
              id="forma-taxa"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={form.taxa}
              onChange={(e) => setForm((f) => ({ ...f, taxa: Number(e.target.value) || 0 }))}
            />
          </Campo>
          <div className="flex items-center gap-2">
            <Button
              onClick={async () => {
                if (!form.nome.trim()) return toast.error("Informe o nome da forma.");
                await salvarForma(form);
                setForm(FORMA_VAZIA);
              }}
            >
              {form.id ? <Save /> : <Plus />} {form.id ? "Salvar" : "Adicionar"}
            </Button>
            {form.id && (
              <Button variant="ghost" onClick={() => setForm(FORMA_VAZIA)}>
                Cancelar
              </Button>
            )}
          </div>
        </div>

        {formas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma forma cadastrada — use “Criar formas padrão” para começar.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-xl border border-border">
            {formas.map((f) => (
              <li
                key={f.id}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_90px_90px_auto]"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{f.nome}</p>
                  <p className="text-xs text-muted-foreground">{f.tipo}</p>
                </div>
                <Badge variant="secondary" className="justify-center tabular-nums">
                  {f.taxa.toFixed(2)}%
                </Badge>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={f.ativo}
                    aria-label={`Ativar ${f.nome}`}
                    onCheckedChange={(v) => void salvarForma({ ...f, ativo: v })}
                  />
                  <span className="text-xs text-muted-foreground">
                    {f.ativo ? "Ativa" : "Inativa"}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Editar ${f.nome}`}
                    onClick={() => setForm(f)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <ConfirmarExclusao
                    titulo={`Excluir "${f.nome}"?`}
                    descricao="A forma deixará de aparecer nas conferências de caixa."
                    onConfirmar={() => void removerForma(f.id)}
                  >
                    <Button size="icon" variant="ghost" aria-label={`Excluir ${f.nome}`}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </ConfirmarExclusao>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Meta de vendas ---------- */

function MetaVendas() {
  const { config, salvarConfig } = useConfiguracoes();
  const [meta, setMeta] = useState(String(config.metaVendasMensal || ""));

  const [limite, setLimite] = useState(config.horarioLimiteCaixa || "");

  useEffect(() => setMeta(String(config.metaVendasMensal || "")), [config.metaVendasMensal]);
  useEffect(() => setLimite(config.horarioLimiteCaixa || ""), [config.horarioLimiteCaixa]);

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="size-4" /> Meta de vendas mensal
        </CardTitle>
        <CardDescription>
          Alimenta automaticamente o gráfico “Meta de Vendas” do Dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:max-w-md">
        <Campo label="Meta mensal (R$)" htmlFor="meta">
          <Input
            id="meta"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="0,00"
          />
        </Campo>
        <p className="text-xs text-muted-foreground">
          Meta atual: <strong>{brl(config.metaVendasMensal)}</strong>
        </p>
        <Campo label="Horário limite de fechamento do caixa" htmlFor="limite-caixa">
          <Input
            id="limite-caixa"
            type="time"
            value={limite}
            onChange={(e) => setLimite(e.target.value)}
          />
        </Campo>
        <p className="text-xs text-muted-foreground">
          Após esse horário, um alerta aparece no topo do sistema enquanto o caixa estiver aberto.
        </p>
        <Button
          className="self-start"
          onClick={() =>
            void salvarConfig({
              metaVendasMensal: Number(meta) || 0,
              horarioLimiteCaixa: limite,
            })
          }
        >
          <Save /> Salvar meta
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------- Dados da empresa ---------- */

function DadosEmpresa() {
  const { config, salvarConfig } = useConfiguracoes();
  const [form, setForm] = useState(config);

  useEffect(() => setForm(config), [config]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="size-4" /> Dados da empresa
        </CardTitle>
        <CardDescription>Usados nos recibos e comprovantes entregues ao cliente.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Campo label="Nome fantasia" htmlFor="emp-fantasia">
          <Input
            id="emp-fantasia"
            value={form.nomeFantasia}
            onChange={(e) => set("nomeFantasia", e.target.value)}
          />
        </Campo>
        <Campo label="Razão social" htmlFor="emp-razao">
          <Input
            id="emp-razao"
            value={form.razaoSocial}
            onChange={(e) => set("razaoSocial", e.target.value)}
          />
        </Campo>
        <Campo label="CNPJ" htmlFor="emp-cnpj">
          <Input id="emp-cnpj" value={form.cnpj} onChange={(e) => set("cnpj", e.target.value)} />
        </Campo>
        <Campo label="WhatsApp" htmlFor="emp-zap">
          <Input
            id="emp-zap"
            value={form.whatsapp}
            onChange={(e) => set("whatsapp", e.target.value)}
            placeholder="(71) 90000-0000"
          />
        </Campo>
        <Campo label="Endereço" htmlFor="emp-end" className="sm:col-span-2">
          <Input
            id="emp-end"
            value={form.endereco}
            onChange={(e) => set("endereco", e.target.value)}
          />
        </Campo>
        <div className="sm:col-span-2">
          <Button
            onClick={() =>
              void salvarConfig({
                nomeFantasia: form.nomeFantasia,
                razaoSocial: form.razaoSocial,
                cnpj: form.cnpj,
                endereco: form.endereco,
                whatsapp: form.whatsapp,
              })
            }
          >
            <Save /> Salvar dados
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Página ---------- */

function ConfiguracoesPage() {
  const catalogo = useCatalogo();
  const { categorias: catDespesas } = useDespesas();
  const {
    categoriasCliente,
    criarCategoriaCliente,
    renomearCategoriaCliente,
    removerCategoriaCliente,
  } = useConfiguracoes();
  const { criarCategoriaDespesa, renomearCategoriaDespesa, removerCategoriaDespesa } =
    useCategoriasDespesa();

  const aux = (t: TipoAuxiliar) => ({
    itens: catalogo.lista(t),
    criar: (nome: string) => catalogo.criar(t, nome),
    renomear: (id: string, nome: string) => catalogo.renomear(t, id, nome),
    remover: (id: string) => catalogo.remover(t, id),
  });

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="min-w-0">
        <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
          Configurações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Parâmetros gerais, formas de pagamento, metas e dados da empresa.
        </p>
      </header>

      <Tabs defaultValue="categorias">
        <TabsList className="flex-wrap">
          <TabsTrigger value="categorias">Categorias e parâmetros</TabsTrigger>
          <TabsTrigger value="pagamentos">Pagamentos e taxas</TabsTrigger>
          <TabsTrigger value="metas">Metas de vendas</TabsTrigger>
          <TabsTrigger value="empresa">Dados da empresa</TabsTrigger>
          <TabsTrigger value="impressao">Impressão</TabsTrigger>
        </TabsList>


        <TabsContent value="categorias" className="mt-4 grid gap-4 lg:grid-cols-2">
          <ListaCadastros
            titulo="Categorias de produtos"
            descricao="Usadas no cadastro de produtos e nos relatórios."
            {...aux("categorias")}
          />
          <ListaCadastros
            titulo="Marcas"
            descricao="Marcas disponíveis no cadastro de produtos."
            {...aux("marcas")}
          />
          <ListaCadastros
            titulo="Unidades de medida"
            descricao="Unidades usadas nos produtos (un, fardo, litro...)."
            {...aux("unidades")}
          />
          <ListaCadastros
            titulo="Categorias de despesas"
            descricao="Classificam as despesas no financeiro."
            itens={catDespesas.map((c) => ({ id: c.id, nome: c.nome }))}
            criar={criarCategoriaDespesa}
            renomear={renomearCategoriaDespesa}
            remover={removerCategoriaDespesa}
          />
          <ListaCadastros
            titulo="Categorias de clientes"
            descricao="Segmentação da base de clientes (ex.: Residencial, Comércio)."
            itens={categoriasCliente}
            criar={criarCategoriaCliente}
            renomear={renomearCategoriaCliente}
            remover={removerCategoriaCliente}
          />
        </TabsContent>

        <TabsContent value="pagamentos" className="mt-4">
          <FormasPagamento />
        </TabsContent>

        <TabsContent value="metas" className="mt-4">
          <MetaVendas />
        </TabsContent>

        <TabsContent value="empresa" className="mt-4">
          <DadosEmpresa />
        </TabsContent>

        <TabsContent value="impressao" className="mt-4">
          <ConfigImpressaoCard />
        </TabsContent>
      </Tabs>

    </div>
  );
}

/* Categorias de despesa: CRUD direto na tabela do financeiro. */
function useCategoriasDespesa() {
  const { criarCategoria, renomearCategoria, removerCategoria } = useDespesas();
  return {
    criarCategoriaDespesa: criarCategoria,
    renomearCategoriaDespesa: renomearCategoria,
    removerCategoriaDespesa: removerCategoria,
  };
}

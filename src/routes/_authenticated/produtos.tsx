import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  LayoutGrid,
  List,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmarExclusao } from "@/components/confirmar-exclusao";
import { ProdutoFoto } from "@/components/produto-foto";
import { ProdutoDialog } from "@/components/produto-dialog";
import { EntradaEstoqueDialog } from "@/components/estoque-dialogs";
import { useEstoque } from "@/context/estoque";
import { brl, rotuloEstoque, unidPorFardo, valorEstoque } from "@/lib/erp";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — AquaERP" },
      {
        name: "description",
        content:
          "Cadastro de produtos com categoria, preços, estoque mínimo e controle de vasilhames retornáveis.",
      },
      { property: "og:title", content: "Produtos — AquaERP" },
      {
        property: "og:description",
        content: "Cadastre e edite produtos da distribuidora de bebidas.",
      },
    ],
  }),
  component: Produtos,
});

type Visao = "cards" | "tabela";

function Produtos() {
  const { produtos, remover } = useEstoque();
  const [busca, setBusca] = useState("");
  const [visao, setVisao] = useState<Visao>("cards");

  const lista = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.categoria.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie o catálogo, preços e níveis de estoque.
          </p>
        </div>
        <ProdutoDialog>
          <Button className="shrink-0">
            <Plus /> Novo Produto
          </Button>
        </ProdutoDialog>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total de produtos cadastrados</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {produtos.length}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unidades em estoque</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
              {produtos.reduce((s, p) => s + (p.estoqueCheio || 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Abaixo do estoque mínimo</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-warning">
              {produtos.filter((p) => (p.estoqueCheio || 0) <= (p.estoqueMinimo || 0)).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome ou categoria"
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border p-1">
          <Button
            variant={visao === "cards" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Visualização em cards"
            onClick={() => setVisao("cards")}
          >
            <LayoutGrid />
          </Button>
          <Button
            variant={visao === "tabela" ? "secondary" : "ghost"}
            size="icon"
            aria-label="Visualização em tabela"
            onClick={() => setVisao("tabela")}
          >
            <List />
          </Button>
        </div>
      </div>

      {visao === "cards" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((p) => {
            const abaixoMinimo = (p.estoqueCheio || 0) <= (p.estoqueMinimo || 0);
            return (
              <Card
                key={p.id}
                className="flex flex-col shadow-[var(--shadow-card)] transition-shadow hover:shadow-md"
              >
                <CardContent className="flex flex-1 flex-col gap-3 p-4">
                  <div className="flex gap-3">
                    <ProdutoFoto
                      url={p.imagemUrl}
                      nome={p.nome}
                      className="size-24 rounded-lg"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                      <span className="line-clamp-2 font-semibold leading-snug">{p.nome}</span>
                      {p.retornavel ? (
                        <Badge variant="secondary" className="w-fit">
                          Retornável
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit">
                          Descartável
                        </Badge>
                      )}
                      <span
                        className={
                          abaixoMinimo
                            ? "text-sm font-medium tabular-nums text-warning"
                            : "text-sm font-medium tabular-nums"
                        }
                      >
                        {rotuloEstoque(p.estoqueCheio || 0, unidPorFardo(p), p.unidade)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Mínimo: {rotuloEstoque(p.estoqueMinimo || 0, unidPorFardo(p), p.unidade)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center">
                    <div className="min-w-0">
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                        Custo
                      </p>
                      <p className="truncate text-sm font-medium tabular-nums">
                        {unidPorFardo(p) > 1 && (p.precoCustoFardo || 0) > 0
                          ? brl(p.precoCustoFardo)
                          : brl(p.precoCusto || 0)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                        Venda
                      </p>
                      <p className="truncate text-sm font-medium tabular-nums">
                        {unidPorFardo(p) > 1 && (p.precoFardo || 0) > 0
                          ? brl(p.precoFardo)
                          : brl(p.precoVenda || 0)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                        Total
                      </p>
                      <p className="truncate text-sm font-semibold tabular-nums">
                        {brl(valorEstoque(p))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-2">
                    <ConfirmarExclusao
                      titulo="Excluir produto?"
                      descricao={`${p.nome} será removido do catálogo. Esta ação não pode ser desfeita.`}
                      sucesso="Produto excluído."
                      onConfirmar={() => remover(p.id)}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Excluir produto"
                        className="text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </ConfirmarExclusao>
                    <div className="flex gap-1">
                      <EntradaEstoqueDialog produtoId={p.id}>
                        <Button variant="ghost" size="icon" aria-label="Entrada de estoque">
                          <PackagePlus />
                        </Button>
                      </EntradaEstoqueDialog>
                      <ProdutoDialog produto={p}>
                        <Button variant="ghost" size="icon" aria-label="Editar produto">
                          <Pencil />
                        </Button>
                      </ProdutoDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {lista.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Nenhum produto encontrado.
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="overflow-hidden shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[64px]">FOTO</TableHead>
                    <TableHead>ITEM</TableHead>
                    <TableHead className="text-center">QTD. DISPONÍVEL</TableHead>
                    <TableHead className="text-center">ESTOQUE MÍN.</TableHead>
                    <TableHead className="text-right">PREÇO DE CUSTO</TableHead>
                    <TableHead className="text-right">PREÇO DE VENDA</TableHead>
                    <TableHead className="text-right">VALOR TOTAL DE VENDA</TableHead>
                    <TableHead className="text-center">AÇÕES</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <ProdutoFoto url={p.imagemUrl} nome={p.nome} />
                      </TableCell>
                      <TableCell>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span className="font-medium">{p.nome}</span>
                          {p.retornavel ? (
                            <Badge variant="secondary" className="w-fit">
                              Retornável
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="w-fit">
                              Descartável
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {rotuloEstoque(p.estoqueCheio || 0, unidPorFardo(p), p.unidade)}
                      </TableCell>
                      <TableCell className="text-center tabular-nums text-muted-foreground">
                        {rotuloEstoque(p.estoqueMinimo || 0, unidPorFardo(p), p.unidade)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {unidPorFardo(p) > 1 && (p.precoCustoFardo || 0) > 0 ? (
                          <>
                            {brl(p.precoCustoFardo)}
                            <span className="block text-xs text-muted-foreground">/fardo</span>
                          </>
                        ) : (
                          brl(p.precoCusto || 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {unidPorFardo(p) > 1 && (p.precoFardo || 0) > 0 ? (
                          <>
                            {brl(p.precoFardo)}
                            <span className="block text-xs text-muted-foreground">/fardo</span>
                          </>
                        ) : (
                          brl(p.precoVenda || 0)
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {brl(valorEstoque(p))}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <EntradaEstoqueDialog produtoId={p.id}>
                            <Button variant="ghost" size="icon" aria-label="Entrada de estoque">
                              <PackagePlus />
                            </Button>
                          </EntradaEstoqueDialog>
                          <ProdutoDialog produto={p}>
                            <Button variant="ghost" size="icon" aria-label="Editar produto">
                              <Pencil />
                            </Button>
                          </ProdutoDialog>
                          <ConfirmarExclusao
                            titulo="Excluir produto?"
                            descricao={`${p.nome} será removido do catálogo. Esta ação não pode ser desfeita.`}
                            sucesso="Produto excluído."
                            onConfirmar={() => remover(p.id)}
                          >
                            <Button variant="ghost" size="icon" aria-label="Excluir produto">
                              <Trash2 className="text-destructive" />
                            </Button>
                          </ConfirmarExclusao>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {lista.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                        Nenhum produto encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

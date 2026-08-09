import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PackagePlus, Pencil, Plus, Search, Trash2 } from "lucide-react";
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
import { ProdutoDialog } from "@/components/produto-dialog";
import { EntradaEstoqueDialog } from "@/components/estoque-dialogs";
import { useEstoque } from "@/context/estoque";
import { brl } from "@/lib/erp";

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

function Produtos() {
  const { produtos, remover } = useEstoque();
  const [busca, setBusca] = useState("");

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

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou categoria"
          className="pl-9"
        />
      </div>

      <Card className="overflow-hidden shadow-[var(--shadow-card)]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
  <TableRow>
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

{/* 2. Qtd. Disponível */}
<TableCell className="text-center tabular-nums font-medium">
  {p.estoqueCheio ?? 0}
</TableCell>

{/* 3. Estoque Mínimo */}
<TableCell className="text-center tabular-nums text-muted-foreground">
  {p.estoqueMinimo ?? 0}
</TableCell>

{/* 4. Preço de Custo */}
<TableCell className="text-right tabular-nums">
  {brl(p.precoCusto || 0)}
</TableCell>

{/* 5. Preço de Venda */}
<TableCell className="text-right tabular-nums">
  {brl(p.precoVenda || 0)}
</TableCell>

{/* 6. Valor Total de Venda */}
<TableCell className="text-right tabular-nums font-bold">
  {brl((p.estoqueCheio || 0) * (p.precoVenda || 0))}
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
    </div>
  );
}

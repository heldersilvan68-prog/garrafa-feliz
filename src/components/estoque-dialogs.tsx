import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEstoque } from "@/context/estoque";
import { Campo } from "@/components/ui/campo";
import { InputMoeda } from "@/components/ui/input-moeda";
import { brl, getDadosMedidaProduto } from "@/lib/erp";
import { hojeISO } from "@/lib/caixa";
import { aPrazo, FORMAS_COMPRA } from "@/lib/vasilhames";
import { CATEGORIA_COMPRA_MERCADORIA, CATEGORIA_ENVASE } from "@/lib/despesas";

function MovimentoDialog({
  children,
  produtoId,
}: {
  children: ReactNode;
  produtoId?: string;
}) {
  const { produtos, moverVazios } = useEstoque();
  const lista = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(produtoId ?? lista[0]?.id ?? "");
  const [qtd, setQtd] = useState("10");

  const confirmar = () => {
    const n = Number(qtd);
    if (!id || !Number.isFinite(n) || n <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }
    moverVazios(id, n);
    toast.success(`${n} vasilhame(s) vazios enviados para a envasadora.`);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar Vazios para Envasadora</DialogTitle>
          <DialogDescription>
            Retira os vasilhames vazios do depósito para envio ao envase na fonte.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <Campo label="Produto">
            <Select value={id} onValueChange={setId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {lista.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome} · {p.estoqueVazio} vazios
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>
          <Campo label="Quantidade" htmlFor="qtd">
            <Input
              id="qtd"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </Campo>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Entrada de estoque cheio com gestão financeira da compra:
 * à vista lança despesa paga no dia; a prazo gera título em Contas a Pagar.
 */
export function EntradaEstoqueDialog({
  children,
  produtoId,
}: {
  children: ReactNode;
  produtoId?: string;
}) {
  const { produtos, movimentos, entradaEstoque } = useEstoque();
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(produtoId ?? produtos[0]?.id ?? "");
  const [qtd, setQtd] = useState("10");
  const [custo, setCusto] = useState(0);
  const [totalManual, setTotalManual] = useState<number | null>(null);
  const [data, setData] = useState(hojeISO());
  const [fornecedor, setFornecedor] = useState("");
  const [pagamentos, setPagamentos] = useState<{ forma: string; valor: number }[]>([
    { forma: "PIX", valor: 0 },
  ]);
  const [vencimento, setVencimento] = useState(hojeISO());

  const produto = produtos.find((p) => p.id === id);
  // Regra global de unidade de medida: define custo padrão e conversão.
  const medida = produto ? getDadosMedidaProduto(produto) : null;
  const fator = medida?.fator ?? 1;
  const rotuloUn = medida?.principal === "fardo" ? medida.rotulo.singular : "un.";
  const quantidade = Math.max(0, Math.floor(Number(qtd) || 0));
  const unidadesInternas = quantidade * fator;
  const total =
    totalManual !== null
      ? totalManual
      : Math.round(quantidade * custo * 100) / 100;
  // Com uma única forma, ela assume o total automaticamente.
  const partes =
    pagamentos.length === 1 ? [{ forma: pagamentos[0].forma, valor: total }] : pagamentos;
  const prazo = partes.some((p) => aPrazo(p.forma) && p.valor > 0);
  const diferenca =
    Math.round((total - partes.reduce((s, p) => s + (p.valor || 0), 0)) * 100) / 100;

  // Preenche o custo padrão conforme a unidade de medida cadastrada no produto.
  useEffect(() => {
    if (!produto) return;
    setCusto(getDadosMedidaProduto(produto).custoPadrao);
    setTotalManual(null);
  }, [produto?.id]);

  const fornecedores = useMemo(
    () =>
      [...new Set(movimentos.map((m) => m.fornecedor).filter((f): f is string => !!f))].sort(),
    [movimentos],
  );

  const confirmar = () => {
    if (!id || quantidade <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }
    if (total > 0 && diferenca !== 0) {
      toast.error("A soma das formas de pagamento deve ser igual ao valor total da compra.");
      return;
    }
    entradaEstoque(id, unidadesInternas, {
      custoUnitario: fator > 1 ? Math.round((custo / fator) * 100) / 100 : custo,
      valorTotal: total,
      data,
      fornecedor: fornecedor.trim() || undefined,
      forma: partes.length === 1 ? partes[0].forma : partes.map((p) => p.forma).join(" + "),
      pagamentos: partes,
      vencimento: prazo ? vencimento : undefined,
    });
    toast.success(
      total > 0
        ? prazo
          ? `Entrada de ${unidadesInternas} un. registrada e título de ${brl(total)} lançado em Contas a Pagar.`
          : `Entrada de ${unidadesInternas} un. registrada e despesa de ${brl(total)} lançada no financeiro.`
        : `Entrada de ${unidadesInternas} un. registrada no estoque cheio.`,
    );
    setAberto(false);
    setTotalManual(null);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Entrada de Estoque Cheio</DialogTitle>
          <DialogDescription>
            Registre a chegada de mercadoria e o lançamento financeiro da compra.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Campo label="Produto" className="sm:col-span-2">
            <Select
              value={id}
              onValueChange={(v) => {
                setId(v);
                setTotalManual(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {produtos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo
            label={`Quantidade comprada (${rotuloUn})`}
            htmlFor="qtdEntrada"
            dica={fator > 1 ? `Cada ${rotuloUn} = ${fator} un. no estoque.` : undefined}
          >
            <Input
              id="qtdEntrada"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => {
                setQtd(e.target.value);
                setTotalManual(null);
              }}
            />
          </Campo>

          <Campo label={`Custo por ${rotuloUn} (R$)`}>
            <InputMoeda
              valor={custo}
              onValor={(n) => {
                setCusto(n);
                setTotalManual(null);
              }}
            />
          </Campo>

          <Campo label="Valor total da compra (R$)" dica="Calculado automaticamente (editável).">
            <InputMoeda valor={total} onValor={(n) => setTotalManual(n)} />
          </Campo>

          <Campo label="Data da entrada" htmlFor="dataEntrada">
            <Input
              id="dataEntrada"
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Campo>

          <Campo label="Fornecedor (opcional)" htmlFor="fornecedor" className="sm:col-span-2">
            <Input
              id="fornecedor"
              list="lista-fornecedores"
              placeholder="Nome do fornecedor / distribuidora"
              value={fornecedor}
              onChange={(e) => setFornecedor(e.target.value)}
            />
          </Campo>
          <datalist id="lista-fornecedores">
            {fornecedores.map((f) => (
              <option key={f} value={f} />
            ))}
          </datalist>

          <div className="grid gap-2 sm:col-span-2">
            <Label>Formas de pagamento</Label>
            {pagamentos.map((pg, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={pg.forma}
                  onValueChange={(v) =>
                    setPagamentos((l) => l.map((x, j) => (j === i ? { ...x, forma: v } : x)))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_COMPRA.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-40">
                  <InputMoeda
                    valor={pagamentos.length === 1 ? total : pg.valor}
                    onValor={(n) =>
                      setPagamentos((l) => l.map((x, j) => (j === i ? { ...x, valor: n } : x)))
                    }
                  />
                </div>
                {pagamentos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPagamentos((l) => l.filter((_, j) => j !== i))}
                  >
                    Remover
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="justify-self-start"
              onClick={() =>
                setPagamentos((l) => {
                  const base =
                    l.length === 1 ? [{ ...l[0], valor: total }] : l;
                  const usado = base.reduce((s, x) => s + x.valor, 0);
                  return [
                    ...base,
                    { forma: "Dinheiro", valor: Math.max(0, Math.round((total - usado) * 100) / 100) },
                  ];
                })
              }
            >
              + Adicionar outra forma de pagamento
            </Button>
            {diferenca !== 0 && (
              <p className="text-xs font-medium text-destructive">
                {diferenca > 0
                  ? `Faltam ${brl(diferenca)} para fechar o total da compra.`
                  : `A soma excede o total da compra em ${brl(-diferenca)}.`}
              </p>
            )}
          </div>

          {prazo && (
            <Campo label="Vencimento do boleto" htmlFor="vencimento">
              <Input
                id="vencimento"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </Campo>
          )}

          <p className="text-xs text-muted-foreground sm:col-span-2">
            {`O estoque sobe agora. Dinheiro sai do Saldo em Espécie (Gaveta); PIX/Cartão/Transferência saem do Saldo em Conta / Digital${prazo ? "; Boleto entra em Contas a Pagar" : ""}.`}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Confirmar entrada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoverVaziosDialog(props: { children: ReactNode; produtoId?: string }) {
  return <MovimentoDialog {...props} />;
}

export function AporteVasilhameDialog({ children }: { children: ReactNode }) {
  const { produtos, comprarVasilhames } = useEstoque();
  const vasilhames = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(vasilhames[0]?.id ?? "");
  const [qtd, setQtd] = useState("100");

  const confirmar = async () => {
    const n = Number(qtd);
    if (!id || !Number.isFinite(n) || n <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }

    await comprarVasilhames(id, n);
    toast.success(`${n} novos vasilhames comprados e adicionados ao estoque cheio!`);
    setAberto(false);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Comprar Vasilhames Novos (Cheios)</DialogTitle>
          <DialogDescription>
            Adicione novos cascos comprados diretamente cheios. Isso aumenta o estoque cheio e o Patrimônio Total.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Produto / Casco</Label>
            <Select value={id} onValueChange={setId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o casco" />
              </SelectTrigger>
              <SelectContent>
                {vasilhames.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="qtdAporte">Quantidade Comprada</Label>
            <Input
              id="qtdAporte"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => setQtd(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Confirmar Compra</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RetornoEnvaseDialog({ children, produtoId }: { children: ReactNode; produtoId?: string }) {
  const { produtos, entradaEstoque } = useEstoque();
  const vasilhames = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [id, setId] = useState(produtoId ?? vasilhames[0]?.id ?? "");
  const [qtd, setQtd] = useState("100");
  const [custoEnvase, setCustoEnvase] = useState(0);
  const [totalManual, setTotalManual] = useState<number | null>(null);
  const [forma, setForma] = useState<string>("PIX");
  const [vencimento, setVencimento] = useState(hojeISO());

  const produto = vasilhames.find((p) => p.id === id);
  const quantidade = Math.max(0, Math.floor(Number(qtd) || 0));
  const prazo = aPrazo(forma);
  const total =
    totalManual !== null ? totalManual : Math.round(quantidade * custoEnvase * 100) / 100;

  // Custo de envase padrão vem do cadastro do produto.
  useEffect(() => {
    if (!produto) return;
    setCustoEnvase(produto.custoEnvase || 0);
    setTotalManual(null);
  }, [produto?.id]);

  const confirmar = () => {
    if (!id || quantidade <= 0) {
      toast.error("Informe um produto e uma quantidade válida.");
      return;
    }

    // Registra a entrada dos vasilhames que voltaram recarregados/cheios da fonte
    entradaEstoque(
      id,
      quantidade,
      total > 0
        ? {
            custoUnitario: quantidade > 0 ? Math.round((total / quantidade) * 100) / 100 : 0,
            valorTotal: total,
            data: hojeISO(),
            forma,
            vencimento: prazo ? vencimento : undefined,
            categoria: CATEGORIA_ENVASE,
            descricao: `Custo de envase · ${quantidade} un. ${produto?.nome ?? ""}`.trim(),
          }
        : undefined,
    );
    toast.success(
      total > 0
        ? `Chegada de ${quantidade} un. registrada e ${brl(total)} de envase lançado no financeiro.`
        : `Chegada de ${quantidade} un. envasadas registrada no estoque cheio.`,
    );
    setAberto(false);
    setTotalManual(null);
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Registrar Chegada da Carga (Retorno de Envase)</DialogTitle>
          <DialogDescription>
            Registre a entrada dos vasilhames que retornaram envasados/cheios da envasadora e o
            pagamento do envase.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Campo label="Produto" className="sm:col-span-2">
            <Select
              value={id}
              onValueChange={(v) => {
                setId(v);
                setTotalManual(null);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o produto" />
              </SelectTrigger>
              <SelectContent>
                {vasilhames.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          <Campo label="Quantidade recebida (cheios)" htmlFor="qtdChegada">
            <Input
              id="qtdChegada"
              type="number"
              min={1}
              value={qtd}
              onChange={(e) => {
                setQtd(e.target.value);
                setTotalManual(null);
              }}
            />
          </Campo>

          <Campo label="Custo de envase por unidade (R$)">
            <InputMoeda
              valor={custoEnvase}
              onValor={(n) => {
                setCustoEnvase(n);
                setTotalManual(null);
              }}
            />
          </Campo>

          <Campo label="Valor total do envase (R$)" dica="Calculado automaticamente (editável).">
            <InputMoeda valor={total} onValor={(n) => setTotalManual(n)} />
          </Campo>

          <Campo label="Forma de pagamento">
            <Select value={forma} onValueChange={setForma}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {FORMAS_COMPRA.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Campo>

          {prazo && (
            <Campo label="Vencimento do boleto" htmlFor="vencEnvase">
              <Input
                id="vencEnvase"
                type="date"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </Campo>
          )}

          <p className="text-xs text-muted-foreground sm:col-span-2">
            {total > 0
              ? prazo
                ? `${brl(total)} entra em Contas a Pagar com vencimento em ${vencimento.split("-").reverse().join("/")}.`
                : `${brl(total)} sai do saldo em ${forma === "Dinheiro" ? "espécie (gaveta)" : "conta / digital"}.`
              : "Sem custo informado, apenas o estoque é atualizado."}
          </p>
        </div>


        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar}>Confirmar Chegada</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
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
import { aPrazo, FORMAS_COMPRA, MOTIVOS_AVARIA, type MotivoAvaria } from "@/lib/vasilhames";
import { supabase } from "@/integrations/supabase/client";
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

type Parte = { forma: string; valor: number };

/** Seletor de pagamento com opção de dividir entre várias formas. */
function PagamentoMisto({
  label,
  total,
  partes,
  onChange,
  semPrazo,
}: {
  label: string;
  total: number;
  partes: Parte[];
  onChange: (p: Parte[]) => void;
  semPrazo?: boolean;
}) {
  const formas = FORMAS_COMPRA.filter((f) => !semPrazo || !aPrazo(f));
  const dividido = partes.length > 1;
  const soma = Math.round(partes.reduce((s, p) => s + p.valor, 0) * 100) / 100;
  const dif = Math.round((total - soma) * 100) / 100;
  const set = (i: number, d: Partial<Parte>) =>
    onChange(partes.map((p, j) => (j === i ? { ...p, ...d } : p)));
  return (
    <div className="grid gap-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={dividido}
            onChange={(e) =>
              onChange(
                e.target.checked
                  ? [{ forma: partes[0]?.forma ?? "PIX", valor: total }, { forma: "Dinheiro", valor: 0 }]
                  : [{ forma: partes[0]?.forma ?? "PIX", valor: total }],
              )
            }
          />
          Dividir pagamento (múltiplas formas)
        </label>
      </div>
      {partes.map((p, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <div className="min-w-[180px] flex-1">
            <Select value={p.forma} onValueChange={(v) => set(i, { forma: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {formas.map((f) => (
                  <SelectItem key={f} value={f}>
                    {f === "Dinheiro" ? "Dinheiro do Caixa (Espécie)" : f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {dividido && (
            <>
              <div className="w-36">
                <InputMoeda valor={p.valor} onValor={(n) => set(i, { valor: n })} />
              </div>
              {partes.length > 2 && (
                <Button variant="ghost" size="sm" onClick={() => onChange(partes.filter((_, j) => j !== i))}>
                  Remover
                </Button>
              )}
            </>
          )}
        </div>
      ))}
      {dividido && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange([...partes, { forma: "PIX", valor: Math.max(0, dif) }])}
          >
            + Adicionar outra forma
          </Button>
          {dif !== 0 && (
            <span className="text-xs text-destructive">
              {dif > 0 ? `Faltam ${brl(dif)}` : `Excede em ${brl(-dif)}`} (total {brl(total)})
            </span>
          )}
        </div>
      )}
    </div>
  );
}

const partesFinais = (partes: Parte[], total: number): Parte[] =>
  partes.length === 1 ? [{ forma: partes[0].forma, valor: total }] : partes.filter((p) => p.valor > 0);
const partesOk = (partes: Parte[], total: number) =>
  partes.length === 1 ||
  Math.abs(partes.reduce((s, p) => s + p.valor, 0) - total) < 0.005;

export function RetornoEnvaseDialog({ children, produtoId }: { children: ReactNode; produtoId?: string }) {
  const { produtos, registrarChegadaCarga } = useEstoque();
  const vasilhames = produtos.filter((p) => p.retornavel);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [id, setId] = useState(produtoId ?? vasilhames[0]?.id ?? "");
  const [qtd, setQtd] = useState("0");
  const [custoEnvase, setCustoEnvase] = useState(0);
  const [pgEnvase, setPgEnvase] = useState<Parte[]>([{ forma: "PIX", valor: 0 }]);
  const [vencimento, setVencimento] = useState(hojeISO());
  const [quebrados, setQuebrados] = useState("0");
  const [motivo, setMotivo] = useState<MotivoAvaria>(MOTIVOS_AVARIA[0]);
  const [perdaUnit, setPerdaUnit] = useState(0);
  const [perdaTotalManual, setPerdaTotalManual] = useState<number | null>(null);
  const [pgPerda, setPgPerda] = useState<Parte[]>([{ forma: "PIX", valor: 0 }]);
  const [retornados, setRetornados] = useState("0");
  const [novos, setNovos] = useState("0");
  const [novoUnit, setNovoUnit] = useState(0);
  const [novoTotalManual, setNovoTotalManual] = useState<number | null>(null);
  const [pgNovos, setPgNovos] = useState<Parte[]>([{ forma: "PIX", valor: 0 }]);
  const [novosComo, setNovosComo] = useState<"cheio" | "vazio">("vazio");

  const produto = vasilhames.find((p) => p.id === id);
  const enviados = Math.max(0, Math.floor(Number(qtd) || 0));
  const avulsa = enviados === 0;
  const nQuebra = Math.max(0, Math.floor(Number(quebrados) || 0));
  const nRetorno = avulsa ? 0 : Math.max(0, Math.floor(Number(retornados) || 0));
  const nNovos = Math.max(0, Math.floor(Number(novos) || 0));
  const recebidos = avulsa ? 0 : enviados - nQuebra - nRetorno;
  const forma = pgEnvase[0]?.forma ?? "PIX";
  const prazo = pgEnvase.length === 1 && aPrazo(forma);
  const r2 = (n: number) => Math.round(n * 100) / 100;
  const totalEnvase = r2(enviados * custoEnvase);
  const abatAvaria = avulsa ? 0 : r2(nQuebra * custoEnvase);
  const abatRetorno = r2(nRetorno * custoEnvase);
  const valorFinal = r2(Math.max(0, totalEnvase - abatAvaria - abatRetorno));
  const perdaTotal = perdaTotalManual ?? r2(nQuebra * perdaUnit);
  const totalNovos = novoTotalManual ?? r2(nNovos * novoUnit);

  // Ao abrir/trocar de produto: custo padrão e quantidade da última carga enviada.
  useEffect(() => {
    if (!aberto || !produto) return;
    setCustoEnvase(produto.custoEnvase || 0);
    setPerdaUnit(r2((produto.custoCasco || 0) + (produto.custoEnvase || 0)));
    setNovoUnit(produto.custoCasco || 0);
    setPerdaTotalManual(null);
    setNovoTotalManual(null);
    let ativo = true;
    void supabase
      .from("returnable_movements")
      .select("qtd")
      .eq("product_id", produto.id)
      .eq("tipo", "envasado")
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (ativo) setQtd(String(data?.[0]?.qtd ?? 0));
      });
    return () => {
      ativo = false;
    };
  }, [aberto, produto?.id]);

  const resetar = () => {
    setQuebrados("0");
    setRetornados("0");
    setNovos("0");
    setPerdaTotalManual(null);
    setNovoTotalManual(null);
    setPgEnvase([{ forma: "PIX", valor: 0 }]);
    setPgPerda([{ forma: "PIX", valor: 0 }]);
    setPgNovos([{ forma: "PIX", valor: 0 }]);
    setNovosComo("vazio");
  };

  const confirmar = async () => {
    if (!id) {
      toast.error("Selecione um produto.");
      return;
    }
    if (avulsa && nQuebra === 0 && nNovos === 0) {
      toast.error("Informe a quantidade da carga, uma avaria ou uma compra de vasilhames.");
      return;
    }
    if (recebidos < 0) {
      toast.error("Avarias + retornos não podem exceder a quantidade da carga.");
      return;
    }
    if (
      (valorFinal > 0 && !partesOk(pgEnvase, valorFinal)) ||
      (nQuebra > 0 && perdaTotal > 0 && !partesOk(pgPerda, perdaTotal)) ||
      (nNovos > 0 && totalNovos > 0 && !partesOk(pgNovos, totalNovos))
    ) {
      toast.error("A soma das formas de pagamento precisa ser igual ao valor total.");
      return;
    }
    setSalvando(true);
    try {
      await registrarChegadaCarga({
        produtoId: id,
        enviados,
        custoEnvase,
        forma,
        vencimento: prazo ? vencimento : undefined,
        quebrados: nQuebra,
        motivoAvaria: motivo,
        valorPerda: perdaTotal,
        formaPerda: pgPerda[0]?.forma ?? "PIX",
        retornados: nRetorno,
        data: hojeISO(),
        pagamentosEnvase: partesFinais(pgEnvase, valorFinal),
        pagamentosPerda: partesFinais(pgPerda, perdaTotal),
        novos: nNovos,
        valorNovos: totalNovos,
        pagamentosNovos: partesFinais(pgNovos, totalNovos),
        novosComo,
      });
      toast.success(
        avulsa
          ? "Lançamento registrado sem entrada de carga."
          : `Carga registrada: ${recebidos} cheio(s) no estoque · ${brl(valorFinal)} de envase lançado.`,
      );
      resetar();
      setAberto(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Chegada da Carga</DialogTitle>
          <DialogDescription>
            Entrada dos cheios, compra de vasilhames, avarias, vazios retornados e pagamentos em um só lugar.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2 sm:grid-cols-2">
          <Campo label="Produto" className="sm:col-span-2">
            <Select value={id} onValueChange={setId}>
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

          <Campo label="Quantidade da carga enviada" htmlFor="qtdChegada" dica="Use 0 para registrar só avaria avulsa ou compra.">
            <Input id="qtdChegada" type="number" min={0} value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Campo>
          {!avulsa && (
            <>
              <Campo label="Custo de envase por unidade (R$)">
                <InputMoeda valor={custoEnvase} onValor={setCustoEnvase} />
              </Campo>
              <PagamentoMisto label={`Pagamento do envase (${brl(valorFinal)})`} total={valorFinal} partes={pgEnvase} onChange={setPgEnvase} />
              {prazo && (
                <Campo label="Vencimento do boleto" htmlFor="vencEnvase">
                  <Input id="vencEnvase" type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                </Campo>
              )}
            </>
          )}
          {avulsa && (
            <p className="self-end text-xs text-muted-foreground">
              Sem carga: serão lançadas apenas a avaria e/ou a compra de vasilhames.
            </p>
          )}

          <div className="grid gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 sm:col-span-2 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">Compra de vasilhames novos (opcional)</p>
            <Campo label="Quantidade de vasilhames novos" htmlFor="qtdNovos">
              <Input
                id="qtdNovos"
                type="number"
                min={0}
                value={novos}
                onChange={(e) => {
                  setNovos(e.target.value);
                  setNovoTotalManual(null);
                }}
              />
            </Campo>
            <Campo label="Valor unitário (R$)">
              <InputMoeda
                valor={novoUnit}
                onValor={(n) => {
                  setNovoUnit(n);
                  setNovoTotalManual(null);
                }}
              />
            </Campo>
            <Campo label="Valor total (R$)" dica="Calculado automaticamente (editável).">
              <InputMoeda valor={totalNovos} onValor={setNovoTotalManual} />
            </Campo>
            <Campo label="Entram no estoque como" dica="Cheio: prontos para vender. Vazio: aguardando envase.">
              <Select value={novosComo} onValueChange={(v) => setNovosComo(v as "cheio" | "vazio")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vazio">Vazio (aguardando envase)</SelectItem>
                  <SelectItem value="cheio">Cheio (pronto para venda)</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
            {nNovos > 0 && (
              <PagamentoMisto label="Pagamento dos vasilhames novos" total={totalNovos} partes={pgNovos} onChange={setPgNovos} semPrazo />
            )}
          </div>

          <div className="grid gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 sm:col-span-2 sm:grid-cols-2">
            <p className="text-sm font-semibold sm:col-span-2">
              {avulsa ? "Avaria / Quebra avulsa (sem carga)" : "Avaria / Quebra na carga (opcional)"}
            </p>
            <Campo label="Garrafões quebrados" htmlFor="qtdQuebra">
              <Input
                id="qtdQuebra"
                type="number"
                min={0}
                value={quebrados}
                onChange={(e) => {
                  setQuebrados(e.target.value);
                  setPerdaTotalManual(null);
                }}
              />
            </Campo>
            <Campo label="Motivo da avaria">
              <Select value={motivo} onValueChange={(v) => setMotivo(v as MotivoAvaria)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOTIVOS_AVARIA.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Valor da perda por unidade (R$)" dica="Casco + envase (editável).">
              <InputMoeda
                valor={perdaUnit}
                onValor={(n) => {
                  setPerdaUnit(n);
                  setPerdaTotalManual(null);
                }}
              />
            </Campo>
            <Campo label="Valor total da perda (R$)" dica="Calculado automaticamente (editável).">
              <InputMoeda valor={perdaTotal} onValor={setPerdaTotalManual} />
            </Campo>
            {nQuebra > 0 && (
              <PagamentoMisto label="Pagamento da avaria" total={perdaTotal} partes={pgPerda} onChange={setPgPerda} semPrazo />
            )}
          </div>

          {!avulsa && (
            <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-3 sm:col-span-2 sm:grid-cols-2">
              <p className="text-sm font-semibold sm:col-span-2">Retorno de vazios (voltaram sem envasar)</p>
              <Campo label="Garrafões vazios retornados" htmlFor="qtdRetorno">
                <Input id="qtdRetorno" type="number" min={0} value={retornados} onChange={(e) => setRetornados(e.target.value)} />
              </Campo>
            </div>
          )}

          <div className="grid gap-1 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm sm:col-span-2">
            {!avulsa && (
              <>
                <div className="flex justify-between"><span>Valor total do envase ({enviados} un.)</span><span className="tabular-nums">{brl(totalEnvase)}</span></div>
                <div className="flex justify-between text-destructive"><span>− Abatimento por avaria ({nQuebra} un.)</span><span className="tabular-nums">{brl(abatAvaria)}</span></div>
                <div className="flex justify-between text-destructive"><span>− Abatimento por retorno ({nRetorno} un.)</span><span className="tabular-nums">{brl(abatRetorno)}</span></div>
                <div className="mt-1 flex justify-between border-t border-border pt-2 font-semibold"><span>Valor final a pagar à fonte</span><span className="tabular-nums">{brl(valorFinal)}</span></div>
              </>
            )}
            {nNovos > 0 && (
              <div className="flex justify-between"><span>Compra de vasilhames novos ({nNovos} un.)</span><span className="tabular-nums">{brl(totalNovos)}</span></div>
            )}
            {nQuebra > 0 && (
              <div className="flex justify-between"><span>Perda por avaria ({nQuebra} un.)</span><span className="tabular-nums">{brl(perdaTotal)}</span></div>
            )}
            <p className="text-xs text-muted-foreground">
              {recebidos >= 0
                ? `${avulsa ? "Sem entrada de carga" : `Entram ${recebidos} cheio(s) no estoque`}${nRetorno ? `, ${nRetorno} vazio(s) voltam ao depósito` : ""}${nNovos ? `, +${nNovos} casco(s) novos no patrimônio` : ""}${nQuebra ? ` e ${nQuebra} casco(s) saem do patrimônio` : ""}.`
                : "Avarias + retornos excedem a quantidade da carga."}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={salvando || recebidos < 0}>
            {salvando ? "Salvando..." : "Confirmar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

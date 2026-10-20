import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, ChartNoAxesCombined, HeartPulse, Lightbulb, Trophy } from "lucide-react";
import { FiltroPeriodo } from "@/components/filtro-periodo";
import { AbasDesempenho, ExportarDesempenho, Indicador } from "@/components/desempenho/painel";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePedidos } from "@/context/pedidos";
import { useDespesas } from "@/context/despesas";
import { useEstoque } from "@/context/estoque";
import { useClientes } from "@/context/clientes";
import { useCaixa } from "@/context/caixa";
import { useConfiguracoes } from "@/context/configuracoes";
import { useAuth } from "@/hooks/use-auth";
import { analisarDesempenho } from "@/lib/desempenho";
import { calcularSaldos } from "@/lib/saldos";
import { brl } from "@/lib/erp";
import { dataRecorrente } from "@/lib/despesas";
import { faixaPeriodo, PERIODOS, type PeriodoId, type Faixa } from "@/lib/periodo";

const abas = ["panorama", "resultados", "rankings", "saude", "decisoes"];
export const Route = createFileRoute("/_authenticated/desempenho")({
  validateSearch: (s: Record<string, unknown>) => ({
    periodo: PERIODOS.some(p => p.id === s.periodo) ? s.periodo as PeriodoId : "mes" as PeriodoId,
    inicio: typeof s.inicio === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.inicio) && !Number.isNaN(Date.parse(s.inicio)) ? s.inicio : "",
    fim: typeof s.fim === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s.fim) && !Number.isNaN(Date.parse(s.fim)) ? s.fim : "",
    aba: typeof s.aba === "string" && abas.includes(s.aba) ? s.aba : "panorama",
  }),
  head: () => ({ meta: [
    { title: "Desempenho — Saúde e decisões da empresa | AquaERP" },
    { name: "description", content: "Resultados, evolução das vendas, rankings, saúde financeira, equilíbrio estimado e simulação de decisões com os dados reais da empresa." },
    { property: "og:title", content: "Desempenho empresarial | AquaERP" },
    { property: "og:description", content: "Analise lucro, despesas, melhores períodos, clientes, produtos e oportunidades para a empresa." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: DesempenhoPage,
});

function DesempenhoPage() {
  const search = Route.useSearch(); const navigate = Route.useNavigate();
  const { pedidos, carregando: cp } = usePedidos();
  const { despesas, carregando: cd } = useDespesas();
  const { produtos, carregando: ce } = useEstoque();
  const { clientes, carregando: cc } = useClientes();
  const { caixas, carregando: cx } = useCaixa();
  const { config } = useConfiguracoes();
  const { userId } = useAuth(); const queryClient = useQueryClient();
  const faixa = useMemo(() => faixaPeriodo(search.periodo, { inicio: search.inicio, fim: search.fim }), [search.periodo, search.inicio, search.fim]);
  const dados = useMemo(() => analisarDesempenho(faixa, pedidos, despesas, produtos), [faixa, pedidos, despesas, produtos]);
  const saldos = useMemo(() => calcularSaldos(pedidos, despesas, caixas), [pedidos, despesas, caixas]);
  const filtro = {
    periodo: search.periodo, custom: { inicio: search.inicio, fim: search.fim }, faixa,
    setPeriodo: (v: React.SetStateAction<PeriodoId>) => { void navigate({ search: p => ({ ...p, periodo: typeof v === "function" ? v(p.periodo) : v }) }); },
    setCustom: (v: React.SetStateAction<Faixa>) => { void navigate({ search: p => { const custom = typeof v === "function" ? v({ inicio: p.inicio, fim: p.fim }) : v; return { ...p, ...custom }; } }); },
  };
  const erro = ["pedidos", "despesas", "produtos", "clientes", "caixa"].some(k => queryClient.getQueryState([k, userId])?.status === "error");
  const carregando = cp || cd || ce || cc || cx;
  const invalido = faixa.inicio > faixa.fim;
  const r = dados.resumo;
  return <div className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 overflow-x-clip">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase text-primary"><Activity className="size-4" /> Inteligência empresarial</div><h1 className="text-3xl font-semibold">Desempenho</h1></div><div className="flex flex-wrap items-end gap-2"><FiltroPeriodo estado={filtro} />{!carregando && !erro && !invalido && <ExportarDesempenho dados={dados} />}</div></header>
    {carregando ? <div role="status" className="py-16 text-center text-muted-foreground">Consolidando os dados da empresa…</div> : erro ? <div role="alert" className="border-l-2 border-destructive py-4 pl-4">Não foi possível carregar todos os dados. Atualize a página antes de analisar os resultados.</div> : invalido ? <div role="alert" className="text-destructive">A data inicial deve ser anterior ou igual à data final.</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Indicador titulo="Faturamento realizado" valor={brl(r.vendas)} nota="Concluídos e em rota · sem vales resgatados" variacao={faixa.inicio === "0000-01-01" || dados.anterior.vendas === 0 ? null : r.vendasVariacao} /><Indicador titulo="Lucro líquido" valor={brl(r.lucroLiquido)} nota="Receita − CMV − despesas − taxas" tom={r.lucroLiquido < 0 ? "text-destructive" : "text-success"} /><Indicador titulo="Despesas operacionais" valor={brl(dados.opReais)} nota="Sem compras de mercadoria e sem taxas" /><Indicador titulo="Margem líquida" valor={`${dados.margemLiquida.toFixed(1)}%`} nota="Lucro líquido sobre o faturamento" /></div>
      <Tabs value={search.aba} onValueChange={aba => { void navigate({ search: p => ({ ...p, aba }) }); }}><TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 rounded-lg p-1">{[{ id: "panorama", nome: "Panorama", icon: Activity }, { id: "resultados", nome: "Resultados", icon: ChartNoAxesCombined }, { id: "rankings", nome: "Rankings", icon: Trophy }, { id: "saude", nome: "Saúde & equilíbrio", icon: HeartPulse }, { id: "decisoes", nome: "Decisões", icon: Lightbulb }].map(a => <TabsTrigger key={a.id} value={a.id} className="gap-2 py-2.5"><a.icon className="size-4" />{a.nome}</TabsTrigger>)}</TabsList><AbasDesempenho dados={dados} produtos={produtos} despesas={despesas} faixa={search.periodo === "mes" ? { ...faixa, fim: dataRecorrente(faixa.inicio, 0, 31) } : faixa} saldos={saldos} dividas={clientes.reduce((s, c) => s + (c.divida ?? 0), 0)} vasilhames={clientes.reduce((s, c) => s + (c.vasilhamesRua ?? 0), 0)} meta={config.metaVendasMensal} /></Tabs>
      <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">Vendas e resultados respeitam o período em horário da Bahia. Saldos, dívidas e estoque são posições atuais dos registros da empresa. Meses parciais não são projeções. Dados restritos à empresa da sessão atual.</footer>
    </>}
  </div>;
}
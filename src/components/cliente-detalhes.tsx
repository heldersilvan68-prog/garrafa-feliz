import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  IdCard,
  Lightbulb,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { usePedidos } from "@/context/pedidos";
import { DemonstrativoDialog } from "@/components/clientes/demonstrativo-dialog";
import { BaixaFiadoDialog } from "@/components/pedidos/baixa-fiado-dialog";
import {
  comprasNoPeriodo,
  confiancaPrevisao,
  formatarDataHora,
  formatarDataLonga,
  janelaContato,
  linkWhatsAppSugerido,
  mensagemSugerida,
  pedidosDoCliente,
  periodoPadrao,
  produtosFrequentes,
  sinaisChurn,
} from "@/lib/cliente-insights";
import {
  diasRestantes,
  proximaCompra,
  STATUS_LABEL,
  statusRecompra,
  type Cliente,
} from "@/lib/clientes";
import { brl } from "@/lib/erp";
import { fiadoEmAberto } from "@/lib/pedidos";

function Metrica({
  titulo,
  valor,
  detalhe,
  icone,
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  icone: React.ReactNode;
}) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 space-y-0 pb-2">
        <CardTitle className="truncate text-xs font-medium text-muted-foreground">
          {titulo}
        </CardTitle>
        <span className="text-muted-foreground">{icone}</span>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">{valor}</p>
        {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
      </CardContent>
    </Card>
  );
}

function Linha({
  icone,
  rotulo,
  valor,
}: {
  icone: React.ReactNode;
  rotulo: string;
  valor: string;
}) {
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
      <span className="mt-0.5 text-muted-foreground">{icone}</span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{rotulo}</p>
        <p className="break-words text-sm font-medium">{valor || "—"}</p>
      </div>
    </div>
  );
}

export function ClienteDetalhes({
  cliente,
  aberto,
  onOpenChange,
}: {
  cliente: Cliente | null;
  aberto: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { pedidos } = usePedidos();
  const [periodo, setPeriodo] = useState(periodoPadrao);
  const [mostrarInsights, setMostrarInsights] = useState(true);

  const dados = useMemo(() => {
    if (!cliente) return null;
    const compras = comprasNoPeriodo(cliente, periodo);
    const total = compras.reduce((s, h) => s + h.valor, 0);
    const meus = pedidosDoCliente(pedidos, cliente);
    const emAberto = meus.filter(
      (p) => p.status === "pendente" || p.status === "em-rota",
    );
    const fiados = meus.filter(fiadoEmAberto);
    const fiado = fiados.reduce((s, p) => s + p.total, 0);
    const saldo = (cliente.divida ?? 0) + fiado;
    const produtos = produtosFrequentes(compras.length ? compras : cliente.historico);
    return {
      compras,
      total,
      ticket: compras.length ? total / compras.length : 0,
      emAberto,
      fiados,
      saldo,
      produtos,
      ultimoPedido: meus[0],
      churn: sinaisChurn(cliente),
      confianca: confiancaPrevisao(cliente),
    };
  }, [cliente, periodo, pedidos]);

  if (!cliente || !dados) return null;

  const status = statusRecompra(cliente);
  const dias = diasRestantes(cliente);
  const produtoTop = dados.produtos[0]?.nome;

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="truncate text-xl">
                Detalhes do Cliente — {cliente.nome}
              </DialogTitle>
              <DialogDescription>
                Histórico, previsões e ações comerciais sugeridas.
              </DialogDescription>
            </div>
            <DemonstrativoDialog
              cliente={cliente}
              compras={dados.compras}
              saldo={dados.saldo}
              fiados={dados.fiados}
            >
              <Button variant="outline" className="shrink-0">
                <FileText /> Demonstrativo de débito
              </Button>
            </DemonstrativoDialog>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          {/* Filtros */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-end">
            <div className="grid gap-2">
              <Label htmlFor="dtde">De</Label>
              <Input
                id="dtde"
                type="date"
                value={periodo.de}
                onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dtate">Até</Label>
              <Input
                id="dtate"
                type="date"
                value={periodo.ate}
                onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2 sm:ml-auto sm:pb-2">
              <Switch
                id="insights"
                checked={mostrarInsights}
                onCheckedChange={setMostrarInsights}
              />
              <Label htmlFor="insights">Mostrar insights</Label>
            </div>
          </div>

          {/* Métricas */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Metrica
              titulo="Total comprado"
              valor={brl(dados.total)}
              detalhe={`${dados.compras.length} compra(s) no período`}
              icone={<TrendingUp className="size-4" />}
            />
            <Metrica
              titulo="Ticket médio"
              valor={brl(dados.ticket)}
              detalhe="Valor médio por compra no período"
              icone={<Wallet className="size-4" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Dados do cliente */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <IdCard className="size-4" /> Dados do cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Linha
                  icone={<BadgeCheck className="size-4" />}
                  rotulo="Nome"
                  valor={cliente.nome}
                />
                <Linha
                  icone={<Phone className="size-4" />}
                  rotulo="Telefone"
                  valor={cliente.telefone}
                />
                <Linha
                  icone={<MapPin className="size-4" />}
                  rotulo="Endereço"
                  valor={cliente.endereco}
                />
                <Linha
                  icone={<FileText className="size-4" />}
                  rotulo="CNPJ / CPF"
                  valor={cliente.documento ?? "Não informado"}
                />
                <Linha
                  icone={<CalendarClock className="size-4" />}
                  rotulo="Data de cadastro"
                  valor={formatarDataLonga(
                    cliente.cadastradoEm ??
                      [...cliente.historico].map((h) => h.data).sort()[0] ??
                      cliente.ultimaCompra,
                  )}
                />
              </CardContent>
            </Card>

            {/* Resumo de compras */}
            <Card className="shadow-[var(--shadow-card)]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="size-4" /> Resumo de compras
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Linha
                  icone={<Package className="size-4" />}
                  rotulo="Total de pedidos"
                  valor={String(cliente.historico.length)}
                />
                <Linha
                  icone={<CalendarClock className="size-4" />}
                  rotulo="Última compra"
                  valor={
                    dados.ultimoPedido
                      ? formatarDataHora(dados.ultimoPedido.criadoEm)
                      : formatarDataLonga(cliente.ultimaCompra)
                  }
                />
                <Linha
                  icone={<ClipboardList className="size-4" />}
                  rotulo="Pedidos em aberto"
                  valor={`${dados.emAberto.length} pedido(s)`}
                />
                <Linha
                  icone={<Wallet className="size-4" />}
                  rotulo="Saldo em aberto / Fiado"
                  valor={brl(dados.saldo)}
                />
              </CardContent>
            </Card>
          </div>

          <HistoricoVales cliente={cliente} />


          {mostrarInsights && (
            <>
              <Separator />

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-primary/30 bg-primary/5 shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="size-4" /> Previsão de próxima compra
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    <p className="text-2xl font-semibold">
                      {formatarDataLonga(proximaCompra(cliente))}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dias < 0
                        ? `${Math.abs(dias)} dia(s) de atraso`
                        : dias === 0
                          ? "Prevista para hoje"
                          : `Faltam ${dias} dia(s)`}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        Confiança {dados.confianca.nivel} · {dados.confianca.percentual}%
                      </Badge>
                      <Badge variant="outline">{STATUS_LABEL[status]}</Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-warning/40 bg-warning/10 shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <AlertTriangle className="size-4" /> Sinais de churn
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <Linha
                      icone={<AlertTriangle className="size-4" />}
                      rotulo="Risco de churn"
                      valor={dados.churn.risco}
                    />
                    <Linha
                      icone={<CalendarClock className="size-4" />}
                      rotulo="Dias sem comprar"
                      valor={`${dados.churn.diasSemComprar} dia(s)`}
                    />
                    <Linha
                      icone={<TrendingUp className="size-4" />}
                      rotulo="Ciclo esperado"
                      valor={`${dados.churn.cicloEsperado} dia(s)`}
                    />
                    <Linha
                      icone={<ClipboardList className="size-4" />}
                      rotulo="Situação"
                      valor={
                        dados.churn.atrasoDias > 0
                          ? `${dados.churn.atrasoDias} dia(s) de atraso`
                          : "Dentro do ciclo"
                      }
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Package className="size-4" /> Oportunidades de produto
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {dados.produtos.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Sem histórico suficiente para sugerir produtos.
                      </p>
                    )}
                    {dados.produtos.map((p) => (
                      <div
                        key={p.nome}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{p.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {p.vezes}x comprado no período
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold tabular-nums">
                          {brl(p.valor)}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="shadow-[var(--shadow-card)]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Lightbulb className="size-4" /> Ações comerciais sugeridas
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Mensagem sugerida (WhatsApp)
                      </p>
                      <p className="mt-1 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                        {mensagemSugerida(cliente, produtoTop)}
                      </p>
                    </div>
                    <Linha
                      icone={<CalendarClock className="size-4" />}
                      rotulo="Melhor janela de contato"
                      valor={janelaContato(cliente)}
                    />
                    <Button
                      asChild
                      className="bg-success text-success-foreground hover:bg-success/90"
                    >
                      <a
                        href={linkWhatsAppSugerido(cliente, produtoTop)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <MessageCircle /> Enviar mensagem sugerida
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </>
          )}

          {/* Fiado em aberto */}
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4" /> Pedidos fiado em aberto
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {dados.fiados.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum pedido fiado pendente para este cliente.
                </p>
              )}
              {dados.fiados.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      #{p.numero} · {brl(p.total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataHora(p.criadoEm)}
                    </p>
                  </div>
                  <BaixaFiadoDialog pedido={p}>
                    <Button size="sm">Dar Baixa / Pago</Button>
                  </BaixaFiadoDialog>
                </div>
              ))}
              {dados.saldo > 0 && (
                <BaixaFiadoDialog
                  cliente={{ id: cliente.id, nome: cliente.nome }}
                  saldo={dados.saldo}
                >
                  <Button variant="outline" className="self-start">
                    Registrar pagamento avulso
                  </Button>
                </BaixaFiadoDialog>
              )}
            </CardContent>
          </Card>

          {/* Histórico */}
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de compras no período</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {dados.compras.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhuma compra registrada no período selecionado.
                </p>
              )}
              {dados.compras.map((h) => (
                <div
                  key={h.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{h.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatarDataLonga(h.data)}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">
                    {brl(h.valor)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}

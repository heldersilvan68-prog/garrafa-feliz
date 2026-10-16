import { useEffect, useState } from "react";
import { Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  IMPRESSAO_PADRAO,
  useConfiguracoes,
  type ConfigImpressao,
  type TextosCupom,
} from "@/context/configuracoes";
import { brl } from "@/lib/erp";

const EXIBICAO: { chave: keyof ConfigImpressao; label: string }[] = [
  { chave: "mostrarLogo", label: "Exibir logomarca / nome da empresa no topo" },
  { chave: "mostrarEnderecoEmpresa", label: "Exibir endereço e telefone da distribuidora" },
  { chave: "mostrarCliente", label: "Exibir dados do cliente e endereço de entrega" },
  { chave: "mostrarObservacoes", label: "Exibir linha de observações do pedido" },
  { chave: "mostrarRodape", label: "Exibir rodapé com mensagem de agradecimento" },
  { chave: "mostrarAssinatura", label: "Exibir campo de assinatura do cliente (fiado/entregas)" },
];

const TEXTOS: { chave: keyof TextosCupom; label: string }[] = [
  { chave: "tituloRecibo", label: "Título do recibo" },
  { chave: "rotuloCliente", label: "Rótulo do cliente" },
  { chave: "rotuloEntregador", label: "Rótulo do entregador" },
  { chave: "rotuloEndereco", label: "Rótulo do endereço" },
  { chave: "rotuloRetirada", label: "Texto de retirada no balcão" },
  { chave: "rotuloPagamento", label: "Título da forma de pagamento" },
  { chave: "rotuloFiado", label: "Rótulo do fiado" },
  { chave: "rotuloTrocoPara", label: "Rótulo do troco" },
  { chave: "rotuloLevar", label: "Rótulo do troco a levar" },
  { chave: "rotuloTotal", label: "Rótulo do total" },
  { chave: "rotuloAssinatura", label: "Rótulo da assinatura" },
  { chave: "mensagemRodape", label: "Rodapé — linha 1" },
  { chave: "mensagemRodape2", label: "Rodapé — linha 2" },
];

const FONTE_PX: Record<string, number> = { pequeno: 10, medio: 12, grande: 14 };
const LARGURA_CSS: Record<string, string> = { "80mm": "80mm", "58mm": "58mm", A4: "190mm" };
const DIVISOR_CSS: Record<string, string> = {
  dupla: "3px double #000",
  tracejada: "1px dashed #000",
  solida: "1px solid #000",
};

const FONTE_OPCOES = (
  <>
    <SelectItem value="pequeno">Pequeno (10px)</SelectItem>
    <SelectItem value="medio">Médio (12px)</SelectItem>
    <SelectItem value="grande">Grande (14px)</SelectItem>
  </>
);

/** Pré-visualização ao vivo do cupom com os valores do formulário (sem salvar). */
function PreviaCupom({ form }: { form: ConfigImpressao }) {
  const { config } = useConfiguracoes();
  const txt = form.textos;
  const fonte = FONTE_PX[form.fonteCorpo] ?? 12;
  const fonteTitulo = FONTE_PX[form.fonteTitulo] ?? 14;
  const fonteRodape = FONTE_PX[form.fonteRodape] ?? 12;
  const hr = <hr style={{ borderTop: DIVISOR_CSS[form.estiloDivisor] }} />;
  const empresa = config.nomeFantasia?.trim() || "PK DISTRIBUIDORA";
  const endereco = config.endereco?.trim() || "AV LUIZ VIANA FILHO 285";
  const fone = config.whatsapp?.trim() || "(75) 99872-3270";

  return (
    <div className="rounded-lg border bg-muted/40 p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Pré-visualização ao vivo
      </p>
      <div className="flex justify-center">
        <div
          className={`cupom shadow-md${form.altaDensidade ? " cupom-forte" : ""}${
            form.modoImpressora === "navegador" ? " cupom-navegador" : ""
          }`}
          style={{
            width: LARGURA_CSS[form.largura] ?? "80mm",
            maxWidth: "100%",
            fontSize: `${fonte}px`,
            padding: `${form.margemSuperior ?? 3}mm ${form.largura === "58mm" ? "2mm" : "4mm"} ${
              form.margemInferior ?? 3
            }mm`,
          }}
        >
          <div
            className={form.centralizarCabecalho ? "cupom-centro" : undefined}
            style={{ fontSize: `${fonteTitulo}px` }}
          >
            {form.mostrarLogo ? (
              <strong className="cupom-titulo" style={{ fontSize: `${fonteTitulo + 2}px` }}>
                {empresa}
              </strong>
            ) : null}
            {form.mostrarEnderecoEmpresa ? (
              <>
                <div className="cupom-quebra">{endereco}</div>
                <div>Telefone : {fone}</div>
              </>
            ) : null}
            <div>
              {txt.tituloRecibo} 1234
            </div>
            <div>15/10/2026 22:09</div>
          </div>

          {hr}

          {form.mostrarCliente ? (
            <>
              <div className="cupom-quebra cupom-negrito">{txt.rotuloCliente} Maria Exemplo</div>
              <div>
                {txt.rotuloEntregador} João
              </div>
              <div className="cupom-quebra cupom-endereco">
                {txt.rotuloEndereco} Rua das Flores, 100, Centro
              </div>
              {hr}
            </>
          ) : null}

          <div className="cupom-item">
            <div className="cupom-linha cupom-negrito">
              <span className="cupom-quebra">1 un. × Água Mineral 20L</span>
              <span>{brl(11)}</span>
            </div>
            <div>{brl(11)} / un.</div>
          </div>
          <div className="cupom-item">
            <div className="cupom-linha cupom-negrito">
              <span className="cupom-quebra">1 un. × Água Mineral 20L (Completo)</span>
              <span>{brl(35)}</span>
            </div>
            <div>{brl(35)} / un.</div>
          </div>

          {hr}

          <div className="cupom-centro cupom-pagamento">{txt.rotuloPagamento}</div>
          <div className="cupom-linha cupom-pagamento">
            <span>PIX</span>
            <span>{brl(46)}</span>
          </div>
          <div className="cupom-linha cupom-pagamento">
            <span>{txt.rotuloTrocoPara}</span>
            <span>{brl(50)}</span>
          </div>
          <div className="cupom-linha cupom-pagamento">
            <span>{txt.rotuloLevar}</span>
            <span>{brl(4)}</span>
          </div>

          <div className="cupom-linha cupom-total">
            <span>{txt.rotuloTotal}</span>
            <span>{brl(46)}</span>
          </div>

          {form.mostrarObservacoes ? (
            <>
              {hr}
              <div className="cupom-quebra">Obs.: Deixar na portaria</div>
            </>
          ) : null}

          {form.mostrarAssinatura ? (
            <>
              {hr}
              <div className="cupom-assinatura">
                <div className="cupom-linha-assinatura" />
                <div className="cupom-centro">{txt.rotuloAssinatura}</div>
              </div>
            </>
          ) : null}

          {form.mostrarRodape ? (
            <>
              {hr}
              <div
                className={form.centralizarRodape ? "cupom-centro" : undefined}
                style={{ fontSize: `${fonteRodape}px` }}
              >
                {txt.mensagemRodape?.trim() ? <div>{txt.mensagemRodape}</div> : null}
                {txt.mensagemRodape2?.trim() ? <div>{txt.mensagemRodape2}</div> : null}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ConfigImpressaoCard() {
  const { config, salvarConfig } = useConfiguracoes();
  const [form, setForm] = useState<ConfigImpressao>(config.impressao ?? IMPRESSAO_PADRAO);

  useEffect(() => setForm(config.impressao ?? IMPRESSAO_PADRAO), [config.impressao]);

  const set = <K extends keyof ConfigImpressao>(k: K, v: ConfigImpressao[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setTexto = (k: keyof TextosCupom, v: string) =>
    setForm((f) => ({ ...f, textos: { ...f.textos, [k]: v } }));

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="size-4" /> Editor de cupom / recibo
        </CardTitle>
        <CardDescription>
          Personalize textos, fontes e espaçamento do comprovante. A pré-visualização ao lado
          atualiza em tempo real e o botão Salvar aplica tudo na impressão real dos pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Largura do papel" htmlFor="imp-largura">
              <Select
                value={form.largura}
                onValueChange={(v) => set("largura", v as ConfigImpressao["largura"])}
              >
                <SelectTrigger id="imp-largura">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="80mm">80mm (padrão)</SelectItem>
                  <SelectItem value="58mm">58mm (cupom estreito)</SelectItem>
                  <SelectItem value="A4">A4 (folha inteira)</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Estilo / modo de impressora" htmlFor="imp-modo">
              <Select
                value={form.modoImpressora}
                onValueChange={(v) => set("modoImpressora", v as ConfigImpressao["modoImpressora"])}
              >
                <SelectTrigger id="imp-modo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="termica">Térmica direta (HTML limpo)</SelectItem>
                  <SelectItem value="navegador">Padrão do navegador</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            <Campo label="Linhas divisórias" htmlFor="imp-divisor">
              <Select
                value={form.estiloDivisor}
                onValueChange={(v) => set("estiloDivisor", v as ConfigImpressao["estiloDivisor"])}
              >
                <SelectTrigger id="imp-divisor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tracejada">Tracejada (----)</SelectItem>
                  <SelectItem value="dupla">Dupla (====)</SelectItem>
                  <SelectItem value="solida">Sólida (____)</SelectItem>
                </SelectContent>
              </Select>
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo label="Fonte do cabeçalho" htmlFor="imp-fonte-titulo">
              <Select
                value={form.fonteTitulo}
                onValueChange={(v) => set("fonteTitulo", v as ConfigImpressao["fonteTitulo"])}
              >
                <SelectTrigger id="imp-fonte-titulo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{FONTE_OPCOES}</SelectContent>
              </Select>
            </Campo>
            <Campo label="Fonte do corpo" htmlFor="imp-fonte-corpo">
              <Select
                value={form.fonteCorpo}
                onValueChange={(v) => set("fonteCorpo", v as ConfigImpressao["fonteCorpo"])}
              >
                <SelectTrigger id="imp-fonte-corpo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{FONTE_OPCOES}</SelectContent>
              </Select>
            </Campo>
            <Campo label="Fonte do rodapé" htmlFor="imp-fonte-rodape">
              <Select
                value={form.fonteRodape}
                onValueChange={(v) => set("fonteRodape", v as ConfigImpressao["fonteRodape"])}
              >
                <SelectTrigger id="imp-fonte-rodape">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>{FONTE_OPCOES}</SelectContent>
              </Select>
            </Campo>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label="Margem superior (mm)" htmlFor="imp-margem-sup">
              <Input
                id="imp-margem-sup"
                type="number"
                min={0}
                max={20}
                value={form.margemSuperior}
                onChange={(e) => set("margemSuperior", Math.max(0, Number(e.target.value) || 0))}
              />
            </Campo>
            <Campo label="Margem inferior (mm)" htmlFor="imp-margem-inf">
              <Input
                id="imp-margem-inf"
                type="number"
                min={0}
                max={20}
                value={form.margemInferior}
                onChange={(e) => set("margemInferior", Math.max(0, Number(e.target.value) || 0))}
              />
            </Campo>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Alta densidade / texto escuro</p>
                <p className="text-xs text-muted-foreground">
                  Negrito e preto absoluto para leitura nítida em térmicas.
                </p>
              </div>
              <Switch
                checked={form.altaDensidade}
                onCheckedChange={(v) => set("altaDensidade", v)}
                aria-label="Alta densidade"
              />
            </div>
            <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Centralizar cabeçalho e rodapé</p>
                <p className="text-xs text-muted-foreground">
                  Desmarque para alinhar à esquerda.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Switch
                  checked={form.centralizarCabecalho}
                  onCheckedChange={(v) => set("centralizarCabecalho", v)}
                  aria-label="Centralizar cabeçalho"
                />
                <Switch
                  checked={form.centralizarRodape}
                  onCheckedChange={(v) => set("centralizarRodape", v)}
                  aria-label="Centralizar rodapé"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Textos e rótulos do cupom</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEXTOS.map((t) => (
                <Campo key={t.chave} label={t.label} htmlFor={`imp-txt-${t.chave}`}>
                  <Input
                    id={`imp-txt-${t.chave}`}
                    value={form.textos[t.chave]}
                    onChange={(e) => setTexto(t.chave, e.target.value)}
                  />
                </Campo>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <p className="text-sm font-medium">Opções de exibição no cupom</p>
            {EXIBICAO.map((o) => (
              <label key={o.chave} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={Boolean(form[o.chave])}
                  onCheckedChange={(v) => set(o.chave, Boolean(v) as never)}
                />
                <Label className="cursor-pointer font-normal">{o.label}</Label>
              </label>
            ))}
          </div>

          <Button className="self-start" onClick={() => void salvarConfig({ impressao: form })}>
            <Save /> Salvar impressão
          </Button>
        </div>

        <PreviaCupom form={form} />
      </CardContent>
    </Card>
  );
}

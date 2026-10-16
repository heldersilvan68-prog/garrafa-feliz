import { useEffect, useRef, useState } from "react";
import { Printer, RotateCcw, Save, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  IMPRESSAO_PADRAO,
  useConfiguracoes,
  type ConfigImpressao,
} from "@/context/configuracoes";
import {
  MODELO_CUPOM_PADRAO,
  TAGS_CUPOM,
  dadosExemploCupom,
  modeloEfetivoCupom,
  renderizarModeloCupom,
} from "@/lib/cupom-template";

const FONTE_PX: Record<string, number> = { pequeno: 10, medio: 12, grande: 14 };
const LARGURA_CSS: Record<string, string> = { "80mm": "80mm", "58mm": "58mm", A4: "190mm" };

const FONTE_OPCOES = (
  <>
    <SelectItem value="pequeno">Pequeno (10px)</SelectItem>
    <SelectItem value="medio">Médio (12px)</SelectItem>
    <SelectItem value="grande">Grande (14px)</SelectItem>
  </>
);

/** Pré-visualização ao vivo: interpreta o modelo bruto com dados de exemplo. */
function PreviaCupom({ form }: { form: ConfigImpressao }) {
  const { config } = useConfiguracoes();
  const fonte = FONTE_PX[form.fonteCorpo] ?? 12;
  const texto = renderizarModeloCupom(modeloEfetivoCupom(form.modeloCupom), dadosExemploCupom(config));

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
          <pre
            style={{
              margin: 0,
              fontFamily: "inherit",
              fontSize: "inherit",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {texto}
          </pre>
        </div>
      </div>
    </div>
  );
}

export function ConfigImpressaoCard() {
  const { config, salvarConfig } = useConfiguracoes();
  const [form, setForm] = useState<ConfigImpressao>(config.impressao ?? IMPRESSAO_PADRAO);
  const arquivoRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setForm(config.impressao ?? IMPRESSAO_PADRAO), [config.impressao]);

  const set = <K extends keyof ConfigImpressao>(k: K, v: ConfigImpressao[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const importarArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return;
    const texto = await arquivo.text();
    if (!texto.trim()) {
      toast.error("O arquivo está vazio.");
      return;
    }
    set("modeloCupom", texto.replace(/\r\n/g, "\n"));
    toast.success(`Modelo "${arquivo.name}" carregado no editor.`);
  };

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="size-4" /> Editor de cupom / recibo
        </CardTitle>
        <CardDescription>
          Edite o modelo do cupom em texto livre com tags dinâmicas. A pré-visualização ao lado
          atualiza em tempo real e o botão Salvar aplica tudo na impressão real dos pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-[1fr_minmax(320px,420px)]">
        <div className="grid gap-4">
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Modelo do cupom (texto livre)</p>
              <div className="flex gap-2">
                <input
                  ref={arquivoRef}
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={(e) => {
                    void importarArquivo(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => arquivoRef.current?.click()}
                >
                  <Upload className="size-4" /> Importar modelo (.txt)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    set("modeloCupom", MODELO_CUPOM_PADRAO);
                    toast.success("Modelo padrão restaurado.");
                  }}
                >
                  <RotateCcw className="size-4" /> Restaurar modelo padrão
                </Button>
              </div>
            </div>
            <Textarea
              value={form.modeloCupom}
              onChange={(e) => set("modeloCupom", e.target.value)}
              rows={22}
              spellCheck={false}
              className="font-mono text-xs leading-relaxed"
              placeholder={MODELO_CUPOM_PADRAO}
            />
            <details className="rounded-lg border p-3 text-sm">
              <summary className="cursor-pointer font-medium">
                Tags disponíveis ({TAGS_CUPOM.length})
              </summary>
              <ul className="mt-2 grid gap-1 sm:grid-cols-2">
                {TAGS_CUPOM.map((t) => (
                  <li key={t.tag} className="flex items-baseline gap-2">
                    <code className="rounded bg-muted px-1 py-0.5 text-xs">{t.tag}</code>
                    <span className="text-xs text-muted-foreground">{t.descricao}</span>
                  </li>
                ))}
              </ul>
            </details>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
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

          <Button className="self-start" onClick={() => void salvarConfig({ impressao: form })}>
            <Save /> Salvar impressão
          </Button>
        </div>

        <PreviaCupom form={form} />
      </CardContent>
    </Card>
  );
}

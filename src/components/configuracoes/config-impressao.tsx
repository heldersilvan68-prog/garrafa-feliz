import { useEffect, useState } from "react";
import { Printer, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Campo } from "@/components/ui/campo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/context/configuracoes";

const EXIBICAO: { chave: keyof ConfigImpressao; label: string }[] = [
  { chave: "mostrarLogo", label: "Exibir logomarca / nome da empresa no topo" },
  { chave: "mostrarEnderecoEmpresa", label: "Exibir endereço e telefone da distribuidora" },
  { chave: "mostrarCliente", label: "Exibir dados do cliente e endereço de entrega" },
  { chave: "mostrarObservacoes", label: "Exibir linha de observações do pedido" },
  { chave: "mostrarRodape", label: "Exibir rodapé com mensagem de agradecimento" },
  { chave: "mostrarAssinatura", label: "Exibir campo de assinatura do cliente (fiado/entregas)" },
];

export function ConfigImpressaoCard() {
  const { config, salvarConfig } = useConfiguracoes();
  const [form, setForm] = useState<ConfigImpressao>(config.impressao ?? IMPRESSAO_PADRAO);

  useEffect(() => setForm(config.impressao ?? IMPRESSAO_PADRAO), [config.impressao]);

  const set = <K extends keyof ConfigImpressao>(k: K, v: ConfigImpressao[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Printer className="size-4" /> Configurações de impressão
        </CardTitle>
        <CardDescription>
          Ajuste o papel, o contraste e o que aparece no comprovante impresso dos pedidos.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
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

          <Campo label="Tamanho da fonte" htmlFor="imp-fonte">
            <Select
              value={form.tamanhoFonte}
              onValueChange={(v) => set("tamanhoFonte", v as ConfigImpressao["tamanhoFonte"])}
            >
              <SelectTrigger id="imp-fonte">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pequeno">Pequeno (10px)</SelectItem>
                <SelectItem value="medio">Médio (12px) — padrão</SelectItem>
                <SelectItem value="grande">Grande (14px)</SelectItem>
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

        <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Alta densidade / texto escuro</p>
            <p className="text-xs text-muted-foreground">
              Aplica negrito e preto absoluto (#000000) no cupom para leitura nítida em impressoras
              térmicas.
            </p>
          </div>
          <Switch
            checked={form.altaDensidade}
            onCheckedChange={(v) => set("altaDensidade", v)}
            aria-label="Alta densidade"
          />
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
      </CardContent>
    </Card>
  );
}

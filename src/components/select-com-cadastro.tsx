import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { LABEL_AUXILIAR, useCatalogo, type TipoAuxiliar } from "@/context/catalogo";

/**
 * Select padrão do sistema com botão "+ Novo": cadastra a opção direto no
 * banco sem fechar o formulário atual e já a deixa selecionada.
 */
export function SelectComCadastro({
  tipo,
  valor,
  onChange,
  placeholder,
  opcoesExtras = [],
}: {
  tipo: TipoAuxiliar;
  valor: string;
  onChange: (v: string) => void;
  placeholder?: string;
  opcoesExtras?: string[];
}) {
  const { lista, criar } = useCatalogo();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const nomes = Array.from(
    new Set([...lista(tipo).map((x) => x.nome), ...opcoesExtras, ...(valor ? [valor] : [])]),
  ).filter(Boolean);

  const salvar = async () => {
    setSalvando(true);
    try {
      const criado = await criar(tipo, nome);
      onChange(criado);
      setNome("");
      setAberto(false);
    } catch {
      /* toast já exibido no contexto */
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Select value={valor} onValueChange={onChange}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={placeholder ?? "Selecione"} />
          </SelectTrigger>
          <SelectContent>
            {nomes.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                Nenhum cadastro ainda
              </div>
            ) : (
              nomes.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" size="sm" onClick={() => setAberto(true)}>
          <Plus className="size-4" /> Novo
        </Button>
      </div>

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova {LABEL_AUXILIAR[tipo].toLowerCase()}</DialogTitle>
            <DialogDescription>
              O cadastro é salvo no sistema e já fica selecionado neste formulário.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`novo-${tipo}`}>{LABEL_AUXILIAR[tipo]}</Label>
            <Input
              id={`novo-${tipo}`}
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite o nome"
              onKeyDown={(e) => {
                if (e.key === "Enter") void salvar();
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando || !nome.trim()}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

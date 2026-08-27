import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { FileUp, Upload } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useClientes, type ClienteImportado } from "@/context/clientes";
import { mascaraTelefone } from "@/lib/clientes";
import { isoLocal } from "@/lib/periodo";

/** Remove acentos/pontuação para casar cabeçalhos variados da planilha. */
const chave = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();

const COLUNAS: Record<string, keyof ClienteImportado | "numero"> = {
  id: "codigo",
  codigo: "codigo",
  nomedocliente: "nome",
  nome: "nome",
  cliente: "nome",
  telefone: "telefone",
  whatsapp: "telefone",
  celular: "telefone",
  endereco: "endereco",
  logradouro: "endereco",
  rua: "endereco",
  n: "numero",
  no: "numero",
  numero: "numero",
  bairro: "bairro",
  datadecadastro: "cadastradoEm",
  cadastro: "cadastradoEm",
  data: "cadastradoEm",
};

/** Divide uma linha CSV respeitando campos entre aspas. */
const dividir = (linha: string, sep: string) => {
  const saida: string[] = [];
  let atual = "";
  let aspas = false;
  for (let i = 0; i < linha.length; i += 1) {
    const c = linha[i];
    if (c === '"') {
      if (aspas && linha[i + 1] === '"') {
        atual += '"';
        i += 1;
      } else aspas = !aspas;
    } else if (c === sep && !aspas) {
      saida.push(atual);
      atual = "";
    } else atual += c;
  }
  saida.push(atual);
  return saida.map((v) => v.trim());
};

/** Converte datas em dd/mm/aaaa, aaaa-mm-dd ou vazio → ISO (hoje quando ausente). */
const paraIso = (valor: string): string => {
  const v = (valor ?? "").trim();
  if (!v || v === "-" || v === "--") return isoLocal(new Date());
  const br = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (br) {
    const [, d, m, a] = br;
    const ano = a.length === 2 ? `20${a}` : a;
    return `${ano}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const iso = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  return isoLocal(new Date());
};

const lerCsv = (texto: string): ClienteImportado[] => {
  const linhas = texto
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (linhas.length < 2) return [];
  const sep = (linhas[0].match(/;/g)?.length ?? 0) >= (linhas[0].match(/,/g)?.length ?? 0) ? ";" : ",";
  const cabecalho = dividir(linhas[0], sep).map((h) => COLUNAS[chave(h)]);

  return linhas.slice(1).flatMap((linha) => {
    const celulas = dividir(linha, sep);
    const reg: Record<string, string> = {};
    cabecalho.forEach((campo, i) => {
      if (campo) reg[campo] = celulas[i] ?? "";
    });
    if (!reg.nome?.trim()) return [];
    const endereco = [reg.endereco, reg.numero].filter((v) => v && v !== "-").join(", ");
    return [
      {
        codigo: reg.codigo?.replace(/\D/g, "") || undefined,
        nome: reg.nome.trim(),
        telefone: reg.telefone ? mascaraTelefone(reg.telefone) : "",
        endereco,
        bairro: reg.bairro?.trim() || undefined,
        cadastradoEm: paraIso(reg.cadastradoEm ?? ""),
      },
    ];
  });
};

/** Importação de clientes por planilha CSV com prévia dos primeiros registros. */
export function ImportarClientesCsv() {
  const { importar } = useClientes();
  const [aberto, setAberto] = useState(false);
  const [registros, setRegistros] = useState<ClienteImportado[]>([]);
  const [arquivo, setArquivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processar = async (file?: File | null) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Selecione um arquivo .csv");
      return;
    }
    const lidos = lerCsv(await file.text());
    setArquivo(file.name);
    setRegistros(lidos);
    if (lidos.length === 0) toast.error("Nenhum cliente válido encontrado no arquivo.");
  };

  const soltar = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    void processar(e.dataTransfer.files?.[0]);
  };

  const escolher = (e: ChangeEvent<HTMLInputElement>) => void processar(e.target.files?.[0]);

  const confirmar = async () => {
    setSalvando(true);
    try {
      const total = await importar(registros);
      if (total > 0) toast.success(`${total} clientes importados com sucesso!`);
      setAberto(false);
      setRegistros([]);
      setArquivo("");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        setAberto(v);
        if (!v) {
          setRegistros([]);
          setArquivo("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp /> Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar clientes por CSV</DialogTitle>
          <DialogDescription>
            Colunas aceitas: #ID, NOME DO CLIENTE, TELEFONE, ENDEREÇO, Nº, BAIRRO e DATA DE
            CADASTRO. Linhas sem nome são ignoradas e datas em branco recebem a data de hoje.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={soltar}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-8 text-center"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">
            {arquivo || "Arraste o arquivo .csv aqui ou clique para selecionar"}
          </p>
          <p className="text-xs text-muted-foreground">
            {registros.length > 0
              ? `${registros.length} clientes prontos para importar`
              : "Somente arquivos .csv"}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={escolher}
          />
        </div>

        {registros.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Cadastro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registros.slice(0, 5).map((c, i) => (
                  <TableRow key={`${c.nome}-${i}`}>
                    <TableCell className="tabular-nums">{c.codigo ?? "—"}</TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>{c.telefone || "—"}</TableCell>
                    <TableCell>{c.endereco || "—"}</TableCell>
                    <TableCell>{c.bairro ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{c.cadastradoEm}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setAberto(false)}>
            Cancelar
          </Button>
          <Button disabled={registros.length === 0 || salvando} onClick={confirmar}>
            {salvando ? "Importando..." : `Importar ${registros.length || ""} clientes`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

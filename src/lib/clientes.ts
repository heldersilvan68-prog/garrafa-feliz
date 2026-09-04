import { isoLocal, isoParaDataLocal, somarDiasIso } from "@/lib/periodo";

export type Compra = {
  id: string;
  data: string; // ISO yyyy-mm-dd
  descricao: string;
  valor: number;
};

export type Cliente = {
  id: string;
  codigo?: string; // código sequencial editável, ex.: "02"
  nome: string;
  telefone: string; // formato internacional, ex.: 5511999998888
  endereco: string;
  bairro?: string;
  documento?: string; // CNPJ/CPF
  cadastradoEm?: string; // ISO yyyy-mm-dd
  /** Data real de criação do cadastro (created_at) já convertida para America/Bahia. */
  criadoEm?: string; // ISO yyyy-mm-dd
  divida?: number; // saldo em aberto (fiado / caderneta)
  vasilhamesRua?: number; // cascos emprestados pendentes de devolução
  valesSaldo?: number; // galões já pagos em pacote de vales e ainda não retirados
  consumoMedioDias: number; // dias por galão/fardo
  ultimaCompra: string; // ISO yyyy-mm-dd
  historico: Compra[];
};

/** Rótulo com código + nome, ex.: "02 - Maria Aparecida". */
export const rotuloCliente = (c: Cliente) => (c.codigo ? `${c.codigo} - ${c.nome}` : c.nome);

/** Código do cliente como número (para ordenação numérica: 2 antes de 10). */
export const codigoNumero = (c: Cliente) => {
  const n = Number(String(c.codigo ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) && String(c.codigo ?? "").trim() !== "" ? n : Number.MAX_SAFE_INTEGER;
};

/** Ordena clientes por código numérico crescente (1, 2, 3... 10, 11), depois por nome. */
export const ordenarPorCodigo = (lista: Cliente[]) =>
  [...lista].sort(
    (a, b) => codigoNumero(a) - codigoNumero(b) || a.nome.localeCompare(b.nome, "pt-BR"),
  );

/**
 * Busca inteligente de clientes:
 * - Termo só com dígitos ("69") → retorna apenas o cliente com código exatamente igual.
 * - Termo com letras/símbolos → busca ampla por nome e telefone.
 */
export const filtrarClientes = (lista: Cliente[], termo: string) => {
  const q = termo.trim();
  if (!q) return lista;

  if (/^\d+$/.test(q)) {
    const numero = Number(q);
    return lista.filter((c) => {
      const codigo = String(c.codigo ?? "").trim();
      if (!codigo) return false;
      const codigoNum = Number(codigo.replace(/\D/g, ""));
      return codigo === q || (Number.isFinite(codigoNum) && codigoNum === numero);
    });
  }

  const qMin = q.toLowerCase();
  const digitos = q.replace(/\D/g, "");
  return lista.filter(
    (c) =>
      c.nome?.toLowerCase().includes(qMin) ||
      (!!digitos && c.telefone?.replace(/\D/g, "").includes(digitos)),
  );
};

/** Próximo código sequencial disponível (01, 02, 03...). */
export const proximoCodigo = (clientes: Cliente[]) => {
  const maior = clientes.reduce((m, c) => {
    const n = Number(String(c.codigo ?? "").replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return String(maior + 1).padStart(2, "0");
};

/** Máscara de telefone celular BR: (11) 98888-0000 */
export const mascaraTelefone = (valor: string) => {
  const d = valor.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

/** Somente dígitos com DDI 55 para links de WhatsApp. */
export const telefoneInternacional = (valor: string) => {
  const d = valor.replace(/\D/g, "");
  if (!d) return "";
  return d.startsWith("55") ? d : `55${d}`;
};

export type StatusRecompra = "atrasado" | "hoje" | "amanha" | "em-breve" | "ok";

export const DIA_MS = 86_400_000;

export const hojeISO = () => isoLocal(new Date());

export const isoParaData = (iso: string) => isoParaDataLocal(iso);

export const formatarData = (iso: string) =>
  isoParaData(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });

export const proximaCompra = (c: Cliente) =>
  somarDiasIso(c.ultimaCompra, Math.max(1, Math.round(c.consumoMedioDias)));

/** Dias restantes até a próxima compra prevista (negativo = atrasado). */
export const diasRestantes = (c: Cliente) =>
  Math.round(
    (isoParaData(proximaCompra(c)).getTime() - isoParaData(hojeISO()).getTime()) / DIA_MS,
  );

export const statusRecompra = (c: Cliente): StatusRecompra => {
  const d = diasRestantes(c);
  if (d < 0) return "atrasado";
  if (d === 0) return "hoje";
  if (d === 1) return "amanha";
  if (d <= 3) return "em-breve";
  return "ok";
};

export const STATUS_LABEL: Record<StatusRecompra, string> = {
  atrasado: "Atrasado",
  hoje: "Lembrar hoje",
  amanha: "Lembrar amanhã",
  "em-breve": "Em breve",
  ok: "Em dia",
};

export const mensagemWhatsApp = (nome: string) =>
  `Olá ${nome}, tudo bem? Vimos aqui que sua água deve estar acabando. Podemos enviar mais galões hoje?`;

export const linkWhatsApp = (c: Cliente) =>
  `https://wa.me/${c.telefone}?text=${encodeURIComponent(mensagemWhatsApp(c.nome))}`;



/** Bairro informado ou extraído do endereço ("Rua X, 10 — Centro"). */
export const bairroDe = (c: Cliente) =>
  c.bairro?.trim() || c.endereco.split("—")[1]?.trim() || "";

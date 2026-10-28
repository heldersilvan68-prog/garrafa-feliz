import { interpretarCupom, type DadosCupom } from "@/lib/cupom-template";

/** React escapa o texto; nenhum HTML digitado ou recebido é executado. */
export function TextoCupom({ modelo, dados }: { modelo: string; dados: DadosCupom }) {
  return <pre className="cupom-texto">{interpretarCupom(modelo, dados).map((trecho, i) => {
    let conteudo = <>{trecho.texto}</>;
    for (const estilo of [...trecho.estilos].reverse()) conteudo = <span className={`cupom-inline-${estilo}`}>{conteudo}</span>;
    return <span key={i}>{conteudo}</span>;
  })}</pre>;
}
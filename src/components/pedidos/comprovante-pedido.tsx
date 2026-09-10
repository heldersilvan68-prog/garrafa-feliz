import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/erp";
import { TIMEZONE } from "@/lib/periodo";
import { BALCAO } from "@/lib/entregadores";
import { parcelasDe, type Pedido } from "@/lib/pedidos";
import { useConfiguracoes, IMPRESSAO_PADRAO } from "@/context/configuracoes";
import { useClientes } from "@/context/clientes";
import { mascaraTelefone } from "@/lib/clientes";

const EMPRESA_PADRAO = "PK DISTRIBUIDORA";
const ENDERECO_PADRAO = "AV LUIZ VIANA FILHO 285";
const FONE_PADRAO = "(75) 99872-3270";

const LARGURA_CSS: Record<string, string> = {
  "80mm": "80mm",
  "58mm": "58mm",
  A4: "190mm",
};

const PAGE_CSS: Record<string, string> = {
  "80mm": "80mm auto",
  "58mm": "58mm auto",
  A4: "A4",
};

const FONTE_PX: Record<string, number> = { pequeno: 10, medio: 12, grande: 14 };

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Cupom térmico renderizado fora da tela — visível apenas na impressão. */
function Cupom({ pedido }: { pedido: Pedido }) {
  const { config } = useConfiguracoes();
  const { clientes } = useClientes();
  const imp = config.impressao ?? IMPRESSAO_PADRAO;
  const parcelas = parcelasDe(pedido);
  const balcao = !pedido.entregador || pedido.entregador === BALCAO;
  const cliente = pedido.clienteId ? clientes.find((c) => c.id === pedido.clienteId) : undefined;

  const empresa = config.nomeFantasia?.trim() || EMPRESA_PADRAO;
  const enderecoEmpresa = config.endereco?.trim() || ENDERECO_PADRAO;
  const fone = config.whatsapp?.trim() ? mascaraTelefone(config.whatsapp) : FONE_PADRAO;

  // Endereço completo: prioriza o cadastro do cliente, com fallback no pedido.
  const enderecoCompleto = [
    cliente?.endereco?.trim() || pedido.endereco?.trim(),
    cliente?.bairro?.trim() || pedido.bairro?.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const troco = pedido.trocoPara ? pedido.trocoPara - pedido.total : 0;

  const largura = LARGURA_CSS[imp.largura] ?? "80mm";
  const fonte = FONTE_PX[imp.tamanhoFonte] ?? 12;
  const estreito = imp.largura === "58mm";

  return (
    <>
      <style>{`@media print { @page { size: ${PAGE_CSS[imp.largura] ?? "80mm auto"}; margin: ${
        imp.largura === "A4" ? "10mm" : "0"
      }; } }
        .cupom-endereco { font-size: 1.2em; font-weight: 700; text-transform: uppercase; }
        .cupom-pagamento { font-weight: 600; font-size: 1.05em; }
      `}</style>
      <div
        className={`cupom${imp.altaDensidade ? " cupom-forte" : ""}${
          imp.modoImpressora === "navegador" ? " cupom-navegador" : ""
        }`}
        style={{
          width: largura,
          fontSize: `${fonte}px`,
          padding: estreito ? "2mm 2mm" : "3mm 4mm",
        }}
      >
        <div className="cupom-centro">
          {imp.mostrarLogo ? <strong className="cupom-titulo">{empresa}</strong> : null}
          {imp.mostrarEnderecoEmpresa ? (
            <>
              <div className="cupom-quebra">{enderecoEmpresa}</div>
              <div>Telefone : {fone}</div>
            </>
          ) : null}
          <div>Comprovante do Pedido nº {pedido.numero}</div>
          <div>{dataHora(pedido.criadoEm)}</div>
        </div>

        <hr />

        {imp.mostrarCliente ? (
          <>
            <div className="cupom-quebra cupom-negrito">
              Cliente: {pedido.clienteNome || "Consumidor Final / Balcão"}
            </div>
            {!balcao ? <div>Entregador: {pedido.entregador}</div> : null}
            {enderecoCompleto ? (
              <div className="cupom-quebra cupom-endereco">ENDEREÇO: {enderecoCompleto}</div>
            ) : balcao ? (
              <div>Entrega: Retirada no Balcão</div>
            ) : null}
            <hr />
          </>
        ) : null}

        {pedido.itens.map((i) => (
          <div key={`${i.produtoId}-${i.nome}-${i.modo}`} className="cupom-item">
            <div className="cupom-linha cupom-negrito">
              <span className="cupom-quebra">
                {i.qtd}x {i.nome}
              </span>
              <span>{brl(i.qtd * i.precoUnit)}</span>
            </div>
          </div>
        ))}

        <hr />

        <div className="cupom-centro cupom-pagamento">FORMA DE PAGAMENTO</div>
        {parcelas.map((x, idx) => (
          <div key={`${x.forma}-${idx}`} className="cupom-linha cupom-pagamento">
            <span>{x.forma}</span>
            <span>{brl(x.valor)}</span>
          </div>
        ))}
        {pedido.valorFiado > 0 ? (
          <div className="cupom-linha cupom-pagamento">
            <span>Em fiado</span>
            <span>{brl(pedido.valorFiado)}</span>
          </div>
        ) : null}
        {pedido.trocoPara ? (
          <>
            <div className="cupom-linha cupom-pagamento">
              <span>Troco para</span>
              <span>{brl(pedido.trocoPara)}</span>
            </div>
            {troco > 0 ? (
              <div className="cupom-linha cupom-pagamento">
                <span>Levar</span>
                <span>{brl(troco)}</span>
              </div>
            ) : null}
          </>
        ) : null}

        <div className="cupom-linha cupom-total">
          <span>TOTAL</span>
          <span>{brl(pedido.total)}</span>
        </div>

        {imp.mostrarObservacoes && pedido.observacao?.trim() ? (
          <>
            <hr />
            <div className="cupom-quebra">Obs.: {pedido.observacao}</div>
          </>
        ) : null}

        {imp.mostrarAssinatura ? (
          <>
            <hr />
            <div className="cupom-assinatura">
              <div className="cupom-linha-assinatura" />
              <div className="cupom-centro">Assinatura do cliente</div>
            </div>
          </>
        ) : null}

        {imp.mostrarRodape ? (
          <>
            <hr />
            <div className="cupom-centro">
              <div>Obrigado pela preferência!</div>
              <div>Água boa é água da P.K</div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

/** Botão que monta o cupom e dispara a impressão nativa do navegador. */
export function ImprimirComprovante({
  pedido,
  variant = "outline",
  className,
  rotulo = "Imprimir Comprovante",
  onPrinted,
}: {
  pedido: Pedido;
  variant?: "outline" | "default" | "secondary" | "ghost";
  className?: string;
  rotulo?: string;
  onPrinted?: () => void;
}) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const fim = () => setMontado(false);
    window.addEventListener("afterprint", fim);
    return () => window.removeEventListener("afterprint", fim);
  }, []);

  const imprimir = useCallback(() => {
    setMontado(true);
    // Aguarda o cupom entrar no DOM antes de abrir a caixa de impressão.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.print();
        // Fecha o modal chamador logo após acionar a impressão.
        onPrinted?.();
      }),
    );
  }, [onPrinted]);

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={imprimir}>
        <Printer className="size-4" /> {rotulo}
      </Button>
      {montado && typeof document !== "undefined"
        ? createPortal(
            <div id="area-comprovante">
              <Cupom pedido={pedido} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/erp";
import { TIMEZONE } from "@/lib/periodo";
import { BALCAO } from "@/lib/entregadores";
import { LABEL_MODO } from "@/lib/vasilhames";
import { parcelasDe, type Pedido } from "@/lib/pedidos";
import { useConfiguracoes, IMPRESSAO_PADRAO } from "@/context/configuracoes";
import { useClientes } from "@/context/clientes";
import { mascaraTelefone } from "@/lib/clientes";

const EMPRESA_PADRAO = "P.K Distribuidora";
const CIDADE_PADRAO = "Itaberaba - BA";

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
  const subtotal = pedido.total + (pedido.desconto ?? 0);
  const balcao = !pedido.entregador || pedido.entregador === BALCAO;
  const cliente = pedido.clienteId ? clientes.find((c) => c.id === pedido.clienteId) : undefined;

  const empresa = config.nomeFantasia?.trim() || EMPRESA_PADRAO;
  const cidade = config.endereco?.trim() || CIDADE_PADRAO;
  const fone = config.whatsapp?.trim() ? mascaraTelefone(config.whatsapp) : "";

  // Endereço completo: prioriza o cadastro do cliente, com fallback no pedido.
  const enderecoCompleto = [
    cliente?.endereco?.trim() || pedido.endereco?.trim(),
    cliente?.bairro?.trim() || pedido.bairro?.trim(),
  ]
    .filter(Boolean)
    .join(", ");

  const largura = LARGURA_CSS[imp.largura] ?? "80mm";
  const fonte = FONTE_PX[imp.tamanhoFonte] ?? 12;
  const estreito = imp.largura === "58mm";

  return (
    <>
      <style>{`@media print { @page { size: ${PAGE_CSS[imp.largura] ?? "80mm auto"}; margin: ${
        imp.largura === "A4" ? "10mm" : "0"
      }; } }`}</style>
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
              <div className="cupom-quebra">{cidade}</div>
              {fone ? <div>Tel / WhatsApp: {fone}</div> : null}
            </>
          ) : null}
          <div>Comprovante de Pedido</div>
          <div className="cupom-negrito">Pedido nº {pedido.numero}</div>
          <div>{dataHora(pedido.criadoEm)}</div>
        </div>

        <hr />

        {imp.mostrarCliente ? (
          <>
            <div className="cupom-quebra cupom-negrito">
              Cliente: {pedido.clienteNome || "Consumidor Final / Balcão"}
            </div>
            {balcao && !enderecoCompleto ? (
              <div>Entrega: Retirada no Balcão</div>
            ) : (
              <>
                {!balcao ? <div>Entregador: {pedido.entregador}</div> : null}
                {enderecoCompleto ? (
                  <div className="cupom-quebra">Endereço: {enderecoCompleto}</div>
                ) : null}
              </>
            )}
            <hr />
          </>
        ) : null}

        <div className="cupom-linha cupom-negrito">
          <span>ITEM</span>
          <span>TOTAL</span>
        </div>
        {pedido.itens.map((i) => (
          <div key={`${i.produtoId}-${i.nome}-${i.modo}`} className="cupom-item">
            <div className="cupom-linha cupom-negrito">
              <span className="cupom-quebra">
                {i.qtd}x {i.nome}
                {i.retornavel ? ` (${LABEL_MODO[i.modo]})` : ""}
              </span>
              <span>{brl(i.qtd * i.precoUnit)}</span>
            </div>
            <div className="cupom-sub">un. {brl(i.precoUnit)}</div>
          </div>
        ))}

        {pedido.vaziosRecolhidos > 0 ? (
          <>
            <hr />
            <div className="cupom-destaque">
              Galões 20L Recolhidos: {pedido.vaziosRecolhidos}
            </div>
          </>
        ) : null}

        <hr />

        {(pedido.desconto ?? 0) > 0 ? (
          <>
            <div className="cupom-linha">
              <span>Subtotal</span>
              <span>{brl(subtotal)}</span>
            </div>
            <div className="cupom-linha">
              <span>Desconto</span>
              <span>- {brl(pedido.desconto)}</span>
            </div>
          </>
        ) : null}
        {parcelas.map((x, idx) => (
          <div key={`${x.forma}-${idx}`} className="cupom-linha">
            <span>{x.forma}</span>
            <span>{brl(x.valor)}</span>
          </div>
        ))}
        {pedido.valorFiado > 0 ? (
          <div className="cupom-linha cupom-negrito">
            <span>Em fiado</span>
            <span>{brl(pedido.valorFiado)}</span>
          </div>
        ) : null}
        {pedido.trocoPara ? (
          <div className="cupom-linha">
            <span>Troco para</span>
            <span>{brl(pedido.trocoPara)}</span>
          </div>
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
}: {
  pedido: Pedido;
  variant?: "outline" | "default" | "secondary" | "ghost";
  className?: string;
  rotulo?: string;
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
      }),
    );
  }, []);

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

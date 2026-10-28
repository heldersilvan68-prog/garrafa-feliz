import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type Pedido } from "@/lib/pedidos";
import { useConfiguracoes, IMPRESSAO_PADRAO } from "@/context/configuracoes";
import { useClientes } from "@/context/clientes";
import { useEstoque } from "@/context/estoque";
import { modeloEfetivoCupom, montarDadosCupom } from "@/lib/cupom-template";

import { TextoCupom } from "@/components/pedidos/texto-cupom";

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

/** Prévia e impressão compartilham o mesmo texto e interpretador seguro. */
function Cupom({ pedido }: { pedido: Pedido }) {
  const { config } = useConfiguracoes();
  const { clientes } = useClientes();
  const { produtos } = useEstoque();
  const imp = config.impressao ?? IMPRESSAO_PADRAO;
  const fonte = FONTE_PX[imp.fonteCorpo ?? imp.tamanhoFonte] ?? 12;
  return <>
    <style>{`@media print { @page { size: ${PAGE_CSS[imp.largura] ?? "80mm auto"}; margin: ${imp.largura === "A4" ? "10mm" : "0"}; } }`}</style>
    <div className={`cupom${imp.altaDensidade ? " cupom-forte" : ""}`} style={{ width: LARGURA_CSS[imp.largura] ?? "80mm", fontSize: `${fonte}px`, padding: `${imp.margemSuperior ?? 3}mm ${imp.largura === "58mm" ? "2mm" : "4mm"} ${imp.margemInferior ?? 3}mm` }}>
      <TextoCupom modelo={modeloEfetivoCupom(imp.modeloCupom)} dados={montarDadosCupom(pedido, config, clientes, produtos)} />
    </div>
  </>;
}

/** Cria um iframe invisível no DOM da página, usado exclusivamente na impressão. */
function criarIframe() {
  const el = document.createElement("iframe");
  el.setAttribute("aria-hidden", "true");
  el.title = "Impressão de comprovante";
  el.style.position = "fixed";
  el.style.right = "0";
  el.style.bottom = "0";
  el.style.width = "0";
  el.style.height = "0";
  el.style.border = "0";
  el.style.visibility = "hidden";
  document.body.appendChild(el);
  const doc = el.contentDocument;
  if (!doc) {
    el.remove();
    return null;
  }

  doc.documentElement.innerHTML =
    '<head><meta charset="utf-8"><style>' +
    "html,body{margin:0;padding:0;background:#fff;color:#000;}" +
    "@media print{@page{margin:0;}}" +
    "#area-comprovante{position:static!important;left:auto!important;top:auto!important;}" +
    "</style></head><body></body>";
  // Reaproveita os estilos do app (classes .cupom) dentro do iframe.
  for (const node of Array.from(
    document.querySelectorAll('style, link[rel="stylesheet"]'),
  )) {
    doc.head.appendChild(node.cloneNode(true));
  }
  return el;
}

/** Botão que monta o cupom num iframe oculto e dispara a impressão imediata. */
export function ImprimirComprovante({
  pedido,
  variant = "outline",
  className,
  rotulo = "Imprimir Comprovante",
  onPrinted,
  autoImprimir = false,
}: {
  pedido: Pedido;
  variant?: "outline" | "default" | "secondary" | "ghost";
  className?: string;
  rotulo?: string;
  onPrinted?: () => void;
  /** Dispara a impressão automaticamente ao montar (fluxo "Criar e imprimir"). */
  autoImprimir?: boolean;
}) {
  const [alvo, setAlvo] = useState<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(
    () => () => {
      iframeRef.current?.remove();
      iframeRef.current = null;
    },
    [],
  );

  const imprimir = useCallback(() => {
    if (typeof document === "undefined") return;
    iframeRef.current?.remove();
    iframeRef.current = criarIframe();
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    setAlvo(doc.body);
    // Aguarda o cupom entrar no DOM do iframe antes de imprimir.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const iframe = iframeRef.current;
        const win = iframe?.contentWindow;
        if (!iframe || !win) return;

        // Remove o iframe após a impressão (ou ao fechar o diálogo de impressão),
        // garantindo o fluxo 100% invisível, sem abas nem vestígios no DOM.
        const limpar = () => {
          iframe.remove();
          iframeRef.current = null;
          setAlvo(null);
        };
        win.onafterprint = limpar;
        // Fallback para navegadores que não disparam "afterprint" no iframe.
        const timer = window.setTimeout(limpar, 60_000);
        win.addEventListener("afterprint", () => window.clearTimeout(timer), { once: true });

        win.focus();
        win.print();
        // Fecha o modal chamador logo após acionar a impressão.
        onPrinted?.();
      }),
    );
  }, [onPrinted]);

  const disparado = useRef(false);
  useEffect(() => {
    if (autoImprimir && !disparado.current) {
      disparado.current = true;
      imprimir();
    }
  }, [autoImprimir, imprimir]);

  return (
    <>
      <Button type="button" variant={variant} className={className} onClick={imprimir}>
        <Printer className="size-4" /> {rotulo}
      </Button>
      {alvo
        ? createPortal(
            <div id="area-comprovante">
              <Cupom pedido={pedido} />
            </div>,
            alvo,
          )
        : null}
    </>
  );
}

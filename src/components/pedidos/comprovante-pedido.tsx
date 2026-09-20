import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { brl } from "@/lib/erp";
import { TIMEZONE } from "@/lib/periodo";
import { BALCAO } from "@/lib/entregadores";
import { parcelasDe, rotuloItemPedido, totalItemPedido, type Pedido } from "@/lib/pedidos";
import { useConfiguracoes, IMPRESSAO_PADRAO } from "@/context/configuracoes";
import { useClientes } from "@/context/clientes";
import { mascaraTelefone } from "@/lib/clientes";
import { supabase } from "@/integrations/supabase/client";
import { paraItemPedido, type ItemPedidoRow } from "@/lib/mapeadores";

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

  // O pedido é a fonte do endereço da entrega. O cadastro só atende registros antigos.
  const enderecoCompleto =
    pedido.enderecoEntrega?.trim() ||
    [pedido.endereco?.trim() || cliente?.endereco?.trim(), pedido.bairro?.trim() || cliente?.bairro?.trim()]
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

        {pedido.itens.map((i, idx) => (
          <div key={`${i.produtoId}-${i.nome}-${i.modo}-${i.embalagem}-${idx}`} className="cupom-item">
            <div className="cupom-linha cupom-negrito">
              <span className="cupom-quebra">
                 {rotuloItemPedido(i)}
              </span>
               <span>{brl(totalItemPedido(i))}</span>
            </div>
             <div>
               {i.embalagem === "fardo" && i.precoEmbalagem !== undefined
                 ? `${brl(i.precoEmbalagem)} / ${i.rotuloEmbalagem || "Fardo"}`
                 : `${brl(i.precoUnit)} / un.`}
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
  const [carregando, setCarregando] = useState(false);
  const [pedidoImpressao, setPedidoImpressao] = useState<Pedido | null>(null);

  useEffect(() => {
    const fim = () => setMontado(false);
    window.addEventListener("afterprint", fim);
    return () => window.removeEventListener("afterprint", fim);
  }, []);

  const imprimir = useCallback(async () => {
    setCarregando(true);
    try {
      // A impressão sempre consulta os itens persistidos, evitando cupons apenas com o total.
      const { data, error } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", pedido.id)
        .order("created_at", { ascending: true });
      if (error) throw error;

      const itens = (data as ItemPedidoRow[]).map(paraItemPedido);
      if (itens.length === 0 || itens.some((item) => item.qtd <= 0 || !item.nome.trim())) {
        toast.error("Não foi possível imprimir: os itens do pedido estão incompletos.");
        return;
      }

      setPedidoImpressao({ ...pedido, itens });
      setMontado(true);
      // Aguarda o cupom atualizado entrar no DOM antes de abrir a caixa de impressão.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          window.print();
          // Fecha o modal chamador logo após acionar a impressão.
          onPrinted?.();
        }),
      );
    } catch {
      toast.error("Não foi possível carregar os itens para impressão. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }, [onPrinted, pedido]);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={imprimir}
        disabled={carregando}
      >
        {carregando ? <Loader2 className="size-4 animate-spin" /> : <Printer className="size-4" />}
        {carregando ? "Carregando itens..." : rotulo}
      </Button>
      {montado && pedidoImpressao && typeof document !== "undefined"
        ? createPortal(
            <div id="area-comprovante">
              <Cupom pedido={pedidoImpressao} />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

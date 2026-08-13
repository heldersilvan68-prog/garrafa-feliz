import type { ReactNode } from "react";

import { AuthProvider } from "@/hooks/use-auth";
import { ConfiguracoesProvider } from "@/context/configuracoes";
import { CatalogoProvider } from "@/context/catalogo";
import { EstoqueProvider } from "@/context/estoque";
import { ClientesProvider } from "@/context/clientes";
import { PedidosProvider } from "@/context/pedidos";
import { CaixaProvider } from "@/context/caixa";
import { DespesasProvider } from "@/context/despesas";
import { EntregadoresProvider } from "@/context/entregadores";

/**
 * Toda a pilha de contextos vive em um único módulo para garantir que
 * AuthProvider e os consumidores (useAuth) compartilhem a mesma instância
 * de contexto, inclusive durante o SSR e o code-splitting das rotas.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ConfiguracoesProvider>
      <CatalogoProvider>
      <EstoqueProvider>
        <ClientesProvider>
          <PedidosProvider>
            <CaixaProvider>
              <DespesasProvider>
                <EntregadoresProvider>{children}</EntregadoresProvider>
              </DespesasProvider>
            </CaixaProvider>
          </PedidosProvider>
        </ClientesProvider>
      </EstoqueProvider>
      </CatalogoProvider>
      </ConfiguracoesProvider>
    </AuthProvider>
  );
}

import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { MigracaoLocalStorage } from "@/components/migracao-localstorage";
import { useEnterConfirma } from "@/hooks/use-enter-confirma";
import { AlertaFechamentoCaixa } from "@/components/caixa/alerta-fechamento";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AreaProtegida,
});

function AreaProtegida() {
  useEnterConfirma();
  return (
    <>
      <MigracaoLocalStorage />
      <div className="mb-4 empty:mb-0">
        <AlertaFechamentoCaixa />
      </div>
      <Outlet />
    </>
  );
}

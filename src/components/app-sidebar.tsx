import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  Droplets,
  FileBarChart,
  Truck,

  HandCoins,
  LayoutDashboard,
  LogOut,
  Package,
  PieChart,
  Receipt,
  RefreshCcw,
  ShoppingCart,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const grupos = [
  {
    label: "Visão geral",
    itens: [{ titulo: "Dashboard Geral", url: "/", icon: LayoutDashboard }],
  },
  {
    label: "Operação",
    itens: [
      { titulo: "Vendas", url: "/pedidos", icon: ShoppingCart },
      { titulo: "Estoque", url: "/estoque", icon: Warehouse },
      { titulo: "Caixa", url: "/caixa", icon: Wallet },
      { titulo: "Produtos", url: "/produtos", icon: Package },
      { titulo: "Vasilhames", url: "/vasilhames", icon: RefreshCcw },
      { titulo: "Clientes", url: "/clientes", icon: Users },
      { titulo: "Entregadores", url: "/entregadores", icon: Truck },
      { titulo: "Categorias", url: "/categorias", icon: Tag },
    ],
  },
  {
    label: "Gestão financeira",
    itens: [
      { titulo: "Financeiro", url: "/financeiro", icon: PieChart },
      { titulo: "Despesas", url: "/despesas", icon: Receipt },
      { titulo: "Comissões", url: "/comissoes", icon: HandCoins },
      { titulo: "Relatórios", url: "/relatorios", icon: FileBarChart },
    ],
  },

];



export function AppSidebar() {
  const { user, sair } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <Droplets className="size-5" />
          </div>
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-semibold">AquaERP</p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              Distribuidora de Bebidas
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {grupos.map((grupo) => (
          <SidebarGroup key={grupo.label}>
            <SidebarGroupLabel>{grupo.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {grupo.itens.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.url}
                      tooltip={item.titulo}
                    >
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4 group-data-[collapsible=icon]:hidden">
        {user ? (
          <div className="flex min-w-0 flex-col gap-2">
            <p className="truncate text-xs text-sidebar-foreground/70">{user.email}</p>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start gap-2 px-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={async () => {
                await sair();
                toast.success("Sessão encerrada.");
                navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="size-4" /> Sair
            </Button>
          </div>
        ) : (
          <p className="text-xs text-sidebar-foreground/60">
            Versão 1.0 · Operação e Gestão Financeira
          </p>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

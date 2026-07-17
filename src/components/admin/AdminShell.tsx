import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  Tags,
  Ribbon,
  ShoppingBag,
  Users,
  Image as ImageIcon,
  Ticket,
  Star,
  Settings,
  User,
  LogOut,
  Menu,
  Home,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type NavRoute =
  | "/admin"
  | "/admin/homepage"
  | "/admin/produtos"
  | "/admin/categorias"
  | "/admin/marcas"
  | "/admin/pedidos"
  | "/admin/clientes"
  | "/admin/banners"
  | "/admin/cupons"
  | "/admin/avaliacoes"
  | "/admin/configuracoes"
  | "/admin/perfil";

type NavItem = { to: NavRoute; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/homepage", label: "Homepage", icon: Home },
  { to: "/admin/produtos", label: "Produtos", icon: Package },
  { to: "/admin/categorias", label: "Categorias", icon: Tags },
  { to: "/admin/marcas", label: "Marcas", icon: Ribbon },
  { to: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
  { to: "/admin/clientes", label: "Clientes", icon: Users },
  { to: "/admin/banners", label: "Banners", icon: ImageIcon },
  { to: "/admin/cupons", label: "Cupons", icon: Ticket },
  { to: "/admin/avaliacoes", label: "Avaliações", icon: Star },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  { to: "/admin/perfil", label: "Perfil", icon: User },
];

function SidebarBody({ onNavigate, email }: { onNavigate?: () => void; email?: string | null }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Sessão encerrada");
    navigate({ to: "/auth" });
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-border/60 bg-card/50">
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-5">
        <Link to="/" className="flex items-center gap-2" onClick={onNavigate}>
          <span className="font-display text-lg font-bold tracking-widest text-gradient-silver">FM</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Admin</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const isActive = item.exact
            ? path === item.to
            : path === item.to || path.startsWith(item.to + "/");
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                isActive
                  ? "bg-gold/10 text-gold"
                  : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              )}
            >
              {isActive && (
                <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold" />
              )}
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/60 p-3">
        <Link
          to="/"
          onClick={onNavigate}
          className="mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          Ver loja
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
        {email && <p className="mt-2 truncate px-3 text-[11px] text-muted-foreground">{email}</p>}
      </div>
    </aside>
  );
}

export function AdminShell({
  children,
  email,
}: {
  children: React.ReactNode;
  email: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <SidebarBody email={email} />
      </div>

      {/* Mobile drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarBody onNavigate={() => setMobileOpen(false)} email={email} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/85 px-4 backdrop-blur-xl md:px-6 lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-widest text-gradient-silver">FM</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Admin</span>
          </Link>
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-10">{children}</main>
      </div>
    </div>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, Heart, User } from "lucide-react";
import { useCart, cartCount } from "@/store/cart";

type NavItem = { to: string; label: string; icon: typeof Home; badge?: boolean };
const items: NavItem[] = [
  { to: "/", label: "Início", icon: Home },
  { to: "/produtos", label: "Buscar", icon: Search },
  { to: "/carrinho", label: "Sacola", icon: ShoppingBag, badge: true },
  { to: "/conta/favoritos", label: "Favoritos", icon: Heart },
  { to: "/conta", label: "Conta", icon: User },
];

export function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useCart((s) => cartCount(s.items));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
      <ul className="safe-bottom mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map(({ to, label, icon: Icon, badge }) => {
          const active = to === "/" ? path === "/" : path.startsWith(to);
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="relative">
                  <Icon className={`h-5 w-5 ${active ? "stroke-[2.4]" : ""}`} />
                  {badge && count > 0 && (
                    <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-bold text-gold-foreground">
                      {count}
                    </span>
                  )}
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

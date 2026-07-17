import { Link } from "@tanstack/react-router";
import { Search, ShoppingBag, User, Menu } from "lucide-react";
import { useCart, cartCount } from "@/store/cart";
import logo from "@/assets/fm-imports-logo.jpg";

export function Header() {
  const count = useCart((s) => cartCount(s.items));

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="relative mx-auto flex h-20 max-w-7xl items-center gap-4 px-4 md:px-6">
        <button className="md:hidden -ml-2 p-2" aria-label="Menu">
          <Menu className="h-5 w-5" />
        </button>

        <nav className="hide-on-mobile flex items-center gap-6 text-sm">
          <Link to="/produtos" className="text-muted-foreground transition-colors hover:text-foreground">
            Novidades
          </Link>
          <Link to="/categoria/$slug" params={{ slug: "camisetas" }} className="text-muted-foreground transition-colors hover:text-foreground">
            Camisetas
          </Link>
          <Link to="/categoria/$slug" params={{ slug: "tenis" }} className="text-muted-foreground transition-colors hover:text-foreground">
            Tênis
          </Link>
          <Link to="/categoria/$slug" params={{ slug: "perfumes" }} className="text-muted-foreground transition-colors hover:text-foreground">
            Perfumes
          </Link>
          <Link to="/categoria/$slug" params={{ slug: "relogios" }} className="text-muted-foreground transition-colors hover:text-foreground">
            Relógios
          </Link>
        </nav>

        <Link
          to="/"
          aria-label="FM IMPORTS"
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        >
          <img src={logo} alt="FM IMPORTS" className="h-14 w-auto object-contain md:h-16" />
        </Link>

        <div className="ml-auto flex items-center gap-1">
          <Link to="/produtos" className="p-2 text-muted-foreground hover:text-foreground" aria-label="Buscar">
            <Search className="h-5 w-5" />
          </Link>
          <Link to="/auth" className="p-2 text-muted-foreground hover:text-foreground hide-on-mobile" aria-label="Conta">
            <User className="h-5 w-5" />
          </Link>
          <Link to="/carrinho" className="relative p-2 text-foreground" aria-label="Carrinho">
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-gold-foreground">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}


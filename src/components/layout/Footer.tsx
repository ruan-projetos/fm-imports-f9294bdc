import { Instagram, MessageCircle, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { whatsappLink } from "@/lib/format";
import { STORE_WHATSAPP, STORE_INSTAGRAM, STORE_LOCATION_URL } from "@/lib/whatsapp";
import logoAsset from "@/assets/fm-imports-logo.jpg.asset.json";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background pb-24 pt-16 md:pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <img
              src={logoAsset.url}
              alt="FM IMPORTS"
              className="h-14 w-auto object-contain"
              loading="lazy"
            />
            <p className="mt-4 text-sm text-muted-foreground">
              Moda premium importada. Sofisticação, exclusividade e elegância.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Loja
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/produtos" className="hover:text-gold">Todos os produtos</Link></li>
              <li><Link to="/produtos" className="hover:text-gold">Novidades</Link></li>
              <li><Link to="/produtos" className="hover:text-gold">Mais vendidos</Link></li>
              <li><Link to="/produtos" className="hover:text-gold">Promoções</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ajuda
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li><Link to="/conta/pedidos" className="hover:text-gold">Meus pedidos</Link></li>
              <li><Link to="/conta" className="hover:text-gold">Minha conta</Link></li>
              <li>Formas de pagamento</li>
              <li>Política de privacidade</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Contato
            </h4>
            <div className="mt-4 flex gap-3">
              <a
                href={whatsappLink(STORE_WHATSAPP, "Olá! Vim pelo site 👑")}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={`https://instagram.com/${STORE_INSTAGRAM}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href={STORE_LOCATION_URL}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
                aria-label="Como chegar"
              >
                <MapPin className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              (88) 9 8190-7458 · @{STORE_INSTAGRAM}
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground md:flex-row md:justify-between">
          <span>© {new Date().getFullYear()} FM IMPORTS. Todos os direitos reservados.</span>
          <span className="text-gold">👑 Coleção premium</span>
        </div>
      </div>
    </footer>
  );
}

import { useQuery } from "@tanstack/react-query";
import { Instagram, MessageCircle } from "lucide-react";
import { settingsQuery } from "@/lib/queries";
import { whatsappLink } from "@/lib/format";

export function Footer() {
  const { data: settings } = useQuery(settingsQuery);
  const wa = (settings?.whatsapp_number as string) ?? "5588981907468";
  const ig = (settings?.instagram_handle as string) ?? "f_m_imports";
  return (
    <footer className="mt-24 border-t border-border/60 bg-background pb-24 pt-16 md:pb-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-10 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-2xl font-bold tracking-widest text-gradient-silver">
                FM
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
                Imports
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Moda premium importada. Sofisticação, exclusividade e elegância.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Loja
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Novidades</li>
              <li>Mais vendidos</li>
              <li>Promoções</li>
              <li>Categorias</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Ajuda
            </h4>
            <ul className="mt-4 space-y-2 text-sm">
              <li>Meus pedidos</li>
              <li>Trocas e devoluções</li>
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
                href={whatsappLink(wa, "Olá! Vim pelo site 👑")}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
                aria-label="WhatsApp"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
              <a
                href={`https://instagram.com/${ig}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-border transition-colors hover:border-gold hover:text-gold"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              88 9 8190-7468 · @{ig}
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

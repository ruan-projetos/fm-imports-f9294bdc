import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Instagram, MessageCircle } from "lucide-react";
import {
  bannersQuery,
  categoriesQuery,
  homeSettingsQuery,
  homeSectionsQuery,
} from "@/lib/queries";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { HomeSectionRenderer } from "@/components/home/HomeSectionRenderer";
import { STORE_WHATSAPP, STORE_INSTAGRAM, STORE_LOCATION_URL } from "@/lib/whatsapp";
import { whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: banners } = useQuery(bannersQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: settings } = useQuery(homeSettingsQuery);
  const { data: sections } = useQuery(homeSectionsQuery);

  return (
    <>
      <HeroCarousel banners={banners} />
      <CategoryStrip categories={categories} />

      {sections?.map((s) => <HomeSectionRenderer key={s.id} section={s} />)}

      {/* Coupon card */}
      {settings?.coupon_active && settings.coupon_title && (
        <section className="mx-auto max-w-7xl px-4 md:px-6">
          <div
            className="relative overflow-hidden rounded-3xl border p-8 md:p-14"
            style={{
              borderColor: `${settings.coupon_color ?? "#D4AF37"}66`,
              background:
                "linear-gradient(to bottom right, hsl(var(--card)), hsl(var(--background)), hsl(var(--card)))",
            }}
          >
            <div className="relative z-10 max-w-lg">
              <span
                className="text-[11px] font-medium uppercase tracking-[0.3em]"
                style={{ color: settings.coupon_color ?? "#D4AF37" }}
              >
                👑 Cupom exclusivo
              </span>
              <h3 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
                {settings.coupon_title}
              </h3>
              {settings.coupon_text && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {settings.coupon_text
                    .split("{code}")
                    .flatMap((part, i, arr) =>
                      i < arr.length - 1
                        ? [
                            part,
                            <span
                              key={i}
                              className="font-mono font-semibold"
                              style={{ color: settings.coupon_color ?? "#D4AF37" }}
                            >
                              {settings.coupon_code}
                            </span>,
                          ]
                        : [part],
                    )}
                </p>
              )}
            </div>
            <div
              className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full blur-3xl"
              style={{ backgroundColor: `${settings.coupon_color ?? "#D4AF37"}1a` }}
            />
          </div>
        </section>
      )}

      {/* Visite nossa loja */}
      <section className="mx-auto max-w-7xl px-4 py-16 md:px-6">
        <div className="overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br from-card via-background to-card p-8 md:p-14">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
                Visite nossa loja
              </span>
              <h3 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
                Conheça a FM IMPORTS pessoalmente
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Estamos em Quixeré/CE. Venha conferir de perto nossa coleção premium
                e ser atendido pela nossa equipe.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={STORE_LOCATION_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-black"
                >
                  <MapPin className="h-4 w-4" /> Como chegar
                </a>
                <a
                  href={whatsappLink(STORE_WHATSAPP, "Olá! Vim pelo site 👑")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-gold hover:text-gold"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
                <a
                  href={`https://instagram.com/${STORE_INSTAGRAM}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:border-gold hover:text-gold"
                >
                  <Instagram className="h-4 w-4" /> @{STORE_INSTAGRAM}
                </a>
              </div>
            </div>
            <a
              href={STORE_LOCATION_URL}
              target="_blank"
              rel="noreferrer"
              className="group relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/30"
              aria-label="Abrir no Google Maps"
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,theme(colors.gold/20),transparent_70%)]" />
              <div className="relative flex flex-col items-center gap-2 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full gradient-gold text-black shadow-gold transition-transform group-hover:scale-110">
                  <MapPin className="h-6 w-6" />
                </div>
                <p className="mt-2 font-display text-lg font-semibold">Quixeré · Ceará</p>
                <p className="text-xs text-muted-foreground">Toque para abrir no Google Maps</p>
              </div>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

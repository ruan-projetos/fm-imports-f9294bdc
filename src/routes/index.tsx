import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Instagram, MessageCircle } from "lucide-react";
import {
  bannersQuery,
  categoriesQuery,
  featuredProductsQuery,
  newProductsQuery,
  bestsellerProductsQuery,
  saleProductsQuery,
  brandsQuery,
} from "@/lib/queries";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { ProductRow } from "@/components/product/ProductRow";
import { STORE_WHATSAPP, STORE_INSTAGRAM, STORE_LOCATION_URL } from "@/lib/whatsapp";
import { whatsappLink } from "@/lib/format";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { data: banners } = useQuery(bannersQuery);
  const { data: categories } = useQuery(categoriesQuery);
  const { data: brands } = useQuery(brandsQuery);
  const featured = useQuery(featuredProductsQuery);
  const news = useQuery(newProductsQuery);
  const bestsellers = useQuery(bestsellerProductsQuery);
  const sale = useQuery(saleProductsQuery);

  return (
    <>
      <HeroCarousel banners={banners} />
      <CategoryStrip categories={categories} />

      <ProductRow
        title="Em destaque"
        subtitle="Selecionados pela curadoria FM"
        products={featured.data}
        isLoading={featured.isLoading}
        viewAllHref="/produtos"
      />

      <ProductRow
        title="Novidades"
        subtitle="Chegou agora na loja"
        products={news.data}
        isLoading={news.isLoading}
        viewAllHref="/produtos"
      />

      {/* Promo strip */}
      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-gold/40 bg-gradient-to-br from-card via-background to-card p-8 md:p-14">
          <div className="relative z-10 max-w-lg">
            <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
              👑 Cupom exclusivo
            </span>
            <h3 className="mt-3 font-display text-3xl font-semibold md:text-4xl">
              10% off na primeira compra
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Use o código <span className="font-mono font-semibold text-gold">BEMVINDO10</span> no
              checkout.
            </p>
          </div>
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
        </div>
      </section>

      <ProductRow
        title="Mais vendidos"
        subtitle="Os favoritos da coleção"
        products={bestsellers.data}
        isLoading={bestsellers.isLoading}
        viewAllHref="/produtos"
      />

      <ProductRow
        title="Promoções"
        subtitle="Oportunidades por tempo limitado"
        products={sale.data}
        isLoading={sale.isLoading}
        viewAllHref="/produtos"
      />

      {/* Brands */}
      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
          Marcas
        </h2>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
          {brands?.map((b) => (
            <span key={b.id} className="font-display text-lg font-semibold tracking-widest text-muted-foreground/70">
              {b.name.toUpperCase()}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}

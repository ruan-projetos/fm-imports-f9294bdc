import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { ProductCard, ProductCardSkeleton } from "./ProductCard";
import type { ProductWithImage } from "@/lib/queries";

export function ProductRow({
  title,
  subtitle,
  products,
  isLoading,
  viewAllHref,
}: {
  title: string;
  subtitle?: string;
  products: ProductWithImage[] | undefined;
  isLoading?: boolean;
  viewAllHref?: string;
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-semibold md:text-3xl">{title}</h2>
          {subtitle && (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-gold hover:opacity-80"
          >
            Ver todos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      <div className="mt-6 -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 no-scrollbar md:grid md:mx-0 md:snap-none md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {isLoading &&
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-[60vw] shrink-0 snap-start md:w-auto">
              <ProductCardSkeleton />
            </div>
          ))}
        {products?.map((p) => (
          <div key={p.id} className="w-[60vw] shrink-0 snap-start md:w-auto">
            <ProductCard product={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

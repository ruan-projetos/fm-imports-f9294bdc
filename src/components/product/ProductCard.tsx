import { Link } from "@tanstack/react-router";
import { formatBRL } from "@/lib/format";
import type { ProductWithImage } from "@/lib/queries";

export function ProductCard({ product }: { product: ProductWithImage }) {
  const hasSale = product.sale_price != null && product.sale_price < product.base_price;
  const price = hasSale ? product.sale_price! : product.base_price;
  const discount = hasSale
    ? Math.round(((product.base_price - product.sale_price!) / product.base_price) * 100)
    : 0;

  return (
    <Link
      to="/produtos/$slug"
      params={{ slug: product.slug }}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-card">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full shimmer" />
        )}

        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.is_new && (
            <span className="rounded-full bg-background/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold backdrop-blur">
              Novo
            </span>
          )}
          {hasSale && (
            <span className="rounded-full bg-gold px-2.5 py-0.5 text-[10px] font-bold text-gold-foreground">
              -{discount}%
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1">
        <h3 className="line-clamp-1 text-sm font-medium">{product.name}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{formatBRL(price)}</span>
          {hasSale && (
            <span className="text-xs text-muted-foreground line-through">
              {formatBRL(product.base_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="aspect-[3/4] w-full rounded-2xl shimmer" />
      <div className="mt-3 h-3 w-3/4 rounded shimmer" />
      <div className="mt-2 h-3 w-1/3 rounded shimmer" />
    </div>
  );
}

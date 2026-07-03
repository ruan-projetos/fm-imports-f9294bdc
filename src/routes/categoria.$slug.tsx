import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { productsByCategoryQuery } from "@/lib/queries";
import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";

export const Route = createFileRoute("/categoria/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const { data, isLoading } = useQuery(productsByCategoryQuery(slug));

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">
        ← Voltar
      </Link>
      <div className="mt-4 mb-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
          Categoria
        </span>
        <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
          {data?.category?.name ?? slug}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data?.products.length ?? 0} produtos
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        {data?.products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {!isLoading && data?.products.length === 0 && (
        <div className="rounded-2xl border border-border py-20 text-center text-muted-foreground">
          Nenhum produto encontrado nesta categoria ainda.
        </div>
      )}
    </div>
  );
}

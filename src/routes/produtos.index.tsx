import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { allProductsQuery } from "@/lib/queries";
import { ProductCard, ProductCardSkeleton } from "@/components/product/ProductCard";

export const Route = createFileRoute("/produtos/")({
  head: () => ({
    meta: [
      { title: "Todos os produtos · FM IMPORTS" },
      { name: "description", content: "Explore toda a coleção FM IMPORTS." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { data, isLoading } = useQuery(allProductsQuery);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <div className="mb-8">
        <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
          Catálogo
        </span>
        <h1 className="mt-2 font-display text-4xl font-semibold md:text-5xl">
          Todos os produtos
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {data?.length ?? 0} peças disponíveis
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-6">
        {isLoading &&
          Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        {data?.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

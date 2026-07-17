import { useQuery } from "@tanstack/react-query";
import { homeSectionProductsQuery, brandsQuery, type HomeSection } from "@/lib/queries";
import { ProductRow } from "@/components/product/ProductRow";

export function HomeSectionRenderer({ section }: { section: HomeSection }) {
  if (section.type === "brands") return <BrandsSection section={section} />;
  if (section.type === "products") return <ProductsSection section={section} />;
  return <CustomSection section={section} />;
}

function ProductsSection({ section }: { section: HomeSection }) {
  const q = useQuery(homeSectionProductsQuery(section));
  if (!q.isLoading && (!q.data || q.data.length === 0)) return null;
  return (
    <ProductRow
      title={section.title}
      subtitle={section.subtitle ?? undefined}
      products={q.data}
      isLoading={q.isLoading}
      viewAllHref={section.view_all_href ?? undefined}
    />
  );
}

function BrandsSection({ section }: { section: HomeSection }) {
  const { data: brands } = useQuery(brandsQuery);
  if (!brands || brands.length === 0) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 md:px-6">
      <h2 className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-muted-foreground">
        {section.title}
      </h2>
      {section.subtitle && (
        <p className="mt-2 text-center text-sm text-muted-foreground">{section.subtitle}</p>
      )}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
        {brands.slice(0, section.item_limit).map((b) => (
          <span
            key={b.id}
            className="font-display text-lg font-semibold tracking-widest text-muted-foreground/70"
          >
            {b.name.toUpperCase()}
          </span>
        ))}
      </div>
    </section>
  );
}

function CustomSection({ section }: { section: HomeSection }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
      <h2 className="font-display text-2xl font-semibold md:text-3xl">{section.title}</h2>
      {section.subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{section.subtitle}</p>
      )}
    </section>
  );
}

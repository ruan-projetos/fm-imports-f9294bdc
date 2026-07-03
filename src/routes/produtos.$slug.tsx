import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Heart, ShoppingBag, Star, Check } from "lucide-react";
import { toast } from "sonner";
import { productDetailQuery } from "@/lib/queries";
import { formatBRL } from "@/lib/format";
import { useCart } from "@/store/cart";

export const Route = createFileRoute("/produtos/$slug")({
  loader: async ({ params, context }) => {
    const data = await context.queryClient.ensureQueryData(productDetailQuery(params.slug));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} · FM IMPORTS` },
          { name: "description", content: loaderData.short_description ?? loaderData.name },
          { property: "og:title", content: loaderData.name },
          {
            property: "og:image",
            content: loaderData.images?.[0]?.url ?? "",
          },
        ]
      : [{ title: "Produto · FM IMPORTS" }],
  }),
  notFoundComponent: () => (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-display text-2xl">Produto não encontrado</h1>
    </div>
  ),
  component: ProductDetail,
});

function ProductDetail() {
  const params = Route.useParams();
  const { data: product } = useQuery(productDetailQuery(params.slug));
  const [imgIdx, setImgIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const add = useCart((s) => s.add);
  const router = useRouter();

  if (!product) return null;

  const hasColor = product.variants.some((v) => v.color);
  const hasSize = product.variants.some((v) => v.size);

  const colors = Array.from(
    new Map(
      product.variants
        .filter((v) => v.color)
        .map((v) => [v.color, { color: v.color!, hex: v.color_hex }]),
    ).values(),
  );
  const sizesForColor = product.variants
    .filter((v) => (hasColor ? v.color === selectedColor : true))
    .map((v) => ({ size: v.size, stock: v.stock, id: v.id }));

  const matchedVariant = product.variants.find(
    (v) =>
      (!hasColor || v.color === selectedColor) &&
      (!hasSize || v.size === selectedSize),
  );

  const hasSale =
    product.sale_price != null && product.sale_price < product.base_price;
  const price = hasSale ? product.sale_price! : product.base_price;

  function handleAdd() {
    if (hasColor && !selectedColor) return toast.error("Selecione uma cor");
    if (hasSize && !selectedSize) return toast.error("Selecione um tamanho");
    if (!matchedVariant) return toast.error("Variação indisponível");
    if (matchedVariant.stock <= 0) return toast.error("Sem estoque");
    add({
      productId: product.id,
      variantId: matchedVariant.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.url ?? null,
      color: matchedVariant.color,
      size: matchedVariant.size,
      unitPrice: price,
      quantity: 1,
      maxStock: matchedVariant.stock,
    });
    toast.success("Adicionado à sacola", {
      action: {
        label: "Ver sacola",
        onClick: () => router.navigate({ to: "/carrinho" }),
      },
    });
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/5] overflow-hidden rounded-3xl bg-card">
            <img
              src={product.images[imgIdx]?.url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
              {product.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setImgIdx(i)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-colors ${
                    imgIdx === i ? "border-gold" : "border-transparent"
                  }`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          {product.brand && (
            <span className="text-[11px] font-medium uppercase tracking-[0.3em] text-gold">
              {product.brand.name}
            </span>
          )}
          <h1 className="mt-2 font-display text-3xl font-semibold md:text-4xl">
            {product.name}
          </h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-3.5 w-3.5 ${
                    i < Math.round(product.rating) ? "fill-gold text-gold" : "text-muted"
                  }`}
                />
              ))}
            </div>
            <span>{product.rating.toFixed(1)}</span>
            <span>·</span>
            <span>{product.review_count} avaliações</span>
          </div>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="font-display text-3xl font-bold">{formatBRL(price)}</span>
            {hasSale && (
              <span className="text-base text-muted-foreground line-through">
                {formatBRL(product.base_price)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Em até 12x sem juros no cartão
          </p>

          {product.short_description && (
            <p className="mt-5 text-sm text-muted-foreground">{product.short_description}</p>
          )}

          {hasColor && (
            <div className="mt-8">
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Cor {selectedColor && <span className="ml-2 text-foreground">· {selectedColor}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {colors.map((c) => (
                  <button
                    key={c.color}
                    onClick={() => {
                      setSelectedColor(c.color);
                      setSelectedSize(null);
                    }}
                    className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${
                      selectedColor === c.color
                        ? "border-gold bg-gold/10 text-gold"
                        : "border-border text-muted-foreground hover:border-foreground"
                    }`}
                  >
                    {c.hex && (
                      <span
                        className="h-3 w-3 rounded-full border border-white/20"
                        style={{ backgroundColor: c.hex }}
                      />
                    )}
                    {c.color}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasSize && (
            <div className="mt-6">
              <div className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tamanho {selectedSize && <span className="ml-2 text-foreground">· {selectedSize}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {sizesForColor.map((s) => (
                  <button
                    key={s.id}
                    disabled={s.stock <= 0}
                    onClick={() => setSelectedSize(s.size)}
                    className={`min-w-[3rem] rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      s.stock <= 0
                        ? "cursor-not-allowed border-border/40 text-muted-foreground/40 line-through"
                        : selectedSize === s.size
                          ? "border-gold bg-gold text-gold-foreground"
                          : "border-border hover:border-foreground"
                    }`}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchedVariant && matchedVariant.stock > 0 && matchedVariant.stock <= 5 && (
            <p className="mt-4 flex items-center gap-1.5 text-xs text-gold">
              <Check className="h-3.5 w-3.5" />
              Últimas {matchedVariant.stock} unidades
            </p>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={handleAdd}
              className="flex flex-1 items-center justify-center gap-2 rounded-full gradient-gold py-4 text-sm font-semibold text-black shadow-gold transition-transform hover:scale-[1.02]"
            >
              <ShoppingBag className="h-4 w-4" />
              Adicionar à sacola
            </button>
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full border border-border text-muted-foreground hover:border-gold hover:text-gold"
              aria-label="Favoritar"
            >
              <Heart className="h-5 w-5" />
            </button>
          </div>

          {product.description && (
            <div className="mt-10 border-t border-border pt-8">
              <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Descrição
              </h2>
              <p className="text-sm leading-relaxed text-foreground/90">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

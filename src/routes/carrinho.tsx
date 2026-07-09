import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart, cartTotal } from "@/store/cart";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/carrinho")({
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQuantity = useCart((s) => s.setQuantity);
  const remove = useCart((s) => s.remove);
  const total = cartTotal(items);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border">
          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="mt-6 font-display text-2xl font-semibold">Sua sacola está vazia</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Explore nossa curadoria e adicione peças que combinam com você.
        </p>
        <Link
          to="/produtos"
          className="mt-6 inline-flex items-center justify-center rounded-full gradient-gold px-6 py-3 text-sm font-semibold text-black"
        >
          Explorar produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
      <h1 className="font-display text-3xl font-semibold md:text-4xl">Sua sacola</h1>
      <p className="mt-1 text-sm text-muted-foreground">{items.length} itens</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-3">
          {items.map((it) => (
            <li
              key={it.variantId}
              className="flex gap-4 rounded-2xl border border-border bg-card p-3 md:p-4"
            >
              <Link
                to="/produtos/$slug"
                params={{ slug: it.slug }}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-background"
              >
                {it.image && <img src={it.image} alt="" className="h-full w-full object-cover" />}
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  <Link
                    to="/produtos/$slug"
                    params={{ slug: it.slug }}
                    className="line-clamp-1 text-sm font-medium hover:text-gold"
                  >
                    {it.name}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[it.color, it.size].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold">{formatBRL(it.unitPrice)}</p>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <button
                      onClick={() => setQuantity(it.variantId, it.quantity - 1)}
                      className="p-2"
                      aria-label="Diminuir"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[2ch] text-center text-sm font-semibold">
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(it.variantId, it.quantity + 1)}
                      className="p-2"
                      aria-label="Aumentar"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(it.variantId)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 md:sticky md:top-24">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Resumo do pedido
          </h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatBRL(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span className="text-gold">Calculado no checkout</span>
            </div>
          </div>
          <div className="my-5 border-t border-border" />
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium">Total</span>
            <span className="font-display text-2xl font-bold">{formatBRL(total)}</span>
          </div>
          <Link
            to="/checkout"
            className="mt-6 flex w-full items-center justify-center rounded-full gradient-gold py-3.5 text-sm font-semibold text-black transition hover:opacity-95"
          >
            Finalizar compra
          </Link>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Entregas em Quixeré e região · PIX ou pagar na entrega
          </p>
        </aside>
      </div>
    </div>
  );
}

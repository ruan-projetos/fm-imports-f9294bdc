import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MessageCircle, Loader2, ShoppingBag, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatBRL } from "@/lib/format";
import { buildOrderMessage, openWhatsApp, STORE_WHATSAPP } from "@/lib/whatsapp";

export const Route = createFileRoute("/conta/pedidos")({
  ssr: false,
  component: MyOrdersPage,
});

function MyOrdersPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/conta/pedidos" } });
        return;
      }
      setUserId(data.user.id);
      setReady(true);
    });
  }, [navigate]);

  const q = useQuery({
    queryKey: ["my-orders", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!ready || q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const orders = q.data ?? [];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-28 md:px-6 md:py-14">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Meus pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">{orders.length} pedido{orders.length === 1 ? "" : "s"}</p>
        </div>
        <Link to="/conta" className="text-xs text-muted-foreground hover:text-foreground">
          ← Minha conta
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border">
            <ShoppingBag className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Você ainda não tem pedidos.</p>
          <Link
            to="/produtos"
            className="mt-6 rounded-full gradient-gold px-6 py-3 text-sm font-semibold text-black"
          >
            Explorar produtos
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {orders.map((o) => {
            const items = (o.order_items ?? []) as Array<{
              quantity: number;
              unit_price: number | string;
              product_snapshot: { name?: string; color?: string; size?: string } | null;
            }>;
            const isPickup = o.delivery_type === "pickup";
            const paymentLabel = o.payment_method === "pix" ? "PIX" : o.payment_method === "on_delivery" ? "Pagar na entrega" : (o.payment_method ?? "—");

            function sendWhatsApp(e: React.MouseEvent) {
              e.preventDefault();
              const msg = buildOrderMessage(
                {
                  order_number: o.order_number,
                  total: o.total,
                  delivery_type: o.delivery_type,
                  payment_method: o.payment_method,
                  customer_snapshot: o.customer_snapshot,
                  delivery_address: o.delivery_address,
                },
                items.map((it) => ({
                  quantity: it.quantity,
                  unit_price: it.unit_price,
                  product_snapshot: it.product_snapshot,
                })),
              );
              openWhatsApp(STORE_WHATSAPP, msg);
            }

            return (
              <li key={o.id}>
                <Link
                  to="/pedido/$id"
                  params={{ id: o.id }}
                  className="block rounded-2xl border border-border bg-card p-4 transition hover:border-gold/50 md:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold text-gold">#{o.order_number}</span>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString("pt-BR")} · {items.length} {items.length === 1 ? "item" : "itens"}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>
                      {isPickup ? "Retirar na loja" : "Entrega FM"} · {paymentLabel}
                    </span>
                    <span className="text-base font-semibold text-foreground">
                      {formatBRL(Number(o.total))}
                    </span>
                  </div>

                  <button
                    onClick={sendWhatsApp}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:opacity-80"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    Acompanhar pelo WhatsApp
                  </button>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, Loader2, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatBRL } from "@/lib/format";
import { buildOrderMessage, openWhatsApp, STORE_WHATSAPP } from "@/lib/whatsapp";

export const Route = createFileRoute("/pedido/$id")({
  ssr: false,
  component: OrderConfirmationPage,
});

function OrderConfirmationPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const q = useQuery({
    queryKey: ["order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const o = q.data;
  if (!o) {
    return (
      <div className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-semibold">Pedido não encontrado</h1>
        <button
          onClick={() => navigate({ to: "/" })}
          className="mt-6 rounded-full border border-border px-5 py-2 text-sm"
        >
          Voltar para a loja
        </button>
      </div>
    );
  }

  const items = (o.order_items ?? []) as Array<{
    id: string;
    quantity: number;
    unit_price: number | string;
    product_snapshot: { name?: string; color?: string; size?: string; image?: string } | null;
  }>;

  function sendWhatsApp() {
    if (!o) return;
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

  const isPickup = o.delivery_type === "pickup";
  const paymentLabel = o.payment_method === "pix" ? "PIX (via WhatsApp)" : o.payment_method === "on_delivery" ? "Pagar na entrega" : (o.payment_method ?? "—");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 pb-28 md:px-6 md:py-14">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold">Pedido criado com sucesso</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enviamos os detalhes automaticamente para nossa equipe pelo WhatsApp.
        </p>
        <p className="mt-3 font-mono text-sm font-semibold text-gold">#{o.order_number}</p>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card p-5 md:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Status
          </h2>
          <StatusBadge status={o.status} />
        </div>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Forma de entrega" value={isPickup ? "Retirar na loja" : "Entrega FM IMPORTS"} />
          <Info label="Forma de pagamento" value={paymentLabel} />
          <Info label="Data" value={new Date(o.created_at).toLocaleString("pt-BR")} />
          <Info label="Total" value={formatBRL(Number(o.total))} />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-5 md:p-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Produtos
        </h2>
        <ul className="mt-3 divide-y divide-border/40">
          {items.map((it) => {
            const s = it.product_snapshot ?? {};
            return (
              <li key={it.id} className="flex items-center gap-3 py-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {s.image ? <img src={s.image} alt="" className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium">{s.name ?? "Item"}</p>
                  <p className="text-xs text-muted-foreground">
                    {[s.color, s.size].filter(Boolean).join(" · ")} · Qtd {it.quantity}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatBRL(Number(it.unit_price) * it.quantity)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <button
        onClick={sendWhatsApp}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full gradient-gold py-3.5 text-sm font-semibold text-black"
      >
        <MessageCircle className="h-4 w-4" />
        Acompanhar pelo WhatsApp
      </button>

      <div className="mt-3 flex gap-3">
        <Link to="/conta/pedidos" className="flex-1 rounded-full border border-border py-3 text-center text-sm">
          Meus pedidos
        </Link>
        <Link to="/produtos" className="flex-1 rounded-full border border-border py-3 text-center text-sm">
          Continuar comprando
        </Link>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}

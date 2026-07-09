import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft, MessageCircle, Truck, Store } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Enums } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { buildStatusMessage, openWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/pedidos/$id")({ component: OrderDetail });

type OrderStatus = Enums<"order_status">;
const STATUSES: readonly OrderStatus[] = [
  "pending",
  "awaiting_store_confirmation",
  "awaiting_pix_payment",
  "payment_confirmed",
  "paid",
  "processing",
  "separating",
  "shipped",
  "out_for_delivery",
  "ready_for_pickup",
  "delivered",
  "cancelled",
  "refunded",
] as const;

const STATUS_LABEL: Record<string, string> = {
  pending: "Novo pedido",
  awaiting_store_confirmation: "Aguardando confirmação da loja",
  awaiting_pix_payment: "Aguardando pagamento PIX",
  payment_confirmed: "Pagamento confirmado",
  paid: "Pago",
  processing: "Processando",
  separating: "Separando pedido",
  shipped: "Enviado",
  out_for_delivery: "Saiu para entrega",
  ready_for_pickup: "Disponível para retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

type CustomerSnapshot = { name?: string; email?: string; phone?: string };
type DeliveryAddress = {
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  reference?: string;
};
type ProductSnapshot = { name?: string; image?: string; color?: string; size?: string };

type OrderWithItems = Tables<"orders"> & {
  order_items: Tables<"order_items">[];
};

function OrderDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin", "order", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as OrderWithItems;
    },
  });

  const update = useMutation({
    mutationFn: async (status: OrderStatus) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "order", id] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const o = q.data;
  const cust = (o?.customer_snapshot ?? {}) as CustomerSnapshot;
  const addr = (o?.delivery_address ?? null) as DeliveryAddress | null;
  const isPickup = o?.delivery_type === "pickup";
  const phone = o?.customer_phone ?? cust.phone ?? "";

  function messageCustomer(customStatus?: string) {
    if (!o || !phone) {
      toast.error("Sem WhatsApp do cliente");
      return;
    }
    const status = customStatus ?? o.status;
    const msg = buildStatusMessage(o.order_number, status);
    openWhatsApp(phone, msg);
  }

  return (
    <div>
      <PageHeader
        title={o?.order_number ?? "Pedido"}
        description={o ? new Date(o.created_at).toLocaleString("pt-BR") : ""}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate({ to: "/admin/pedidos" })}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
            </Button>
            {phone && (
              <Button onClick={() => messageCustomer()}>
                <MessageCircle className="mr-1.5 h-4 w-4" /> Enviar mensagem
              </Button>
            )}
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Itens</h3>
          <ul className="divide-y divide-border/40">
            {(o?.order_items ?? []).map((it) => {
              const snap = (it.product_snapshot ?? {}) as ProductSnapshot;
              return (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {snap.image && <img src={snap.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{snap.name ?? "Item"}</p>
                    <p className="text-xs text-muted-foreground">
                      {snap.color ?? ""} {snap.size ? `· ${snap.size}` : ""} · Qtd {it.quantity}
                    </p>
                  </div>
                  <span className="font-semibold">{formatBRL(Number(it.unit_price) * it.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border/40 pt-4 text-sm">
            <Row label="Subtotal" value={formatBRL(Number(o?.subtotal ?? 0))} />
            <Row label="Desconto" value={`- ${formatBRL(Number(o?.discount ?? 0))}`} />
            <Row label="Total" value={formatBRL(Number(o?.total ?? 0))} strong />
          </div>
          {o?.notes && (
            <div className="mt-4 rounded-lg border border-border/40 bg-background p-3 text-xs">
              <span className="font-semibold">Observações:</span> {o.notes}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="mb-3 font-semibold">Status</h3>
            {o?.status && (
              <div className="mb-3">
                <StatusBadge status={o.status} />
              </div>
            )}
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={o?.status ?? "pending"}
              onChange={(e) => update.mutate(e.target.value as OrderStatus)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s] ?? s}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm">
            <h3 className="mb-3 font-semibold">Cliente</h3>
            <p className="font-medium">{cust.name ?? "—"}</p>
            {phone && (
              <a
                href={`https://wa.me/${phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs text-gold hover:underline"
              >
                <MessageCircle className="h-3 w-3" /> {phone}
              </a>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm">
            <h3 className="mb-3 flex items-center gap-2 font-semibold">
              {isPickup ? <Store className="h-4 w-4 text-gold" /> : <Truck className="h-4 w-4 text-gold" />}
              {isPickup ? "Retirar na loja" : "Entrega FM IMPORTS"}
            </h3>
            {!isPickup && addr && (
              <>
                <p>{[addr.street, addr.number].filter(Boolean).join(", ")}</p>
                {addr.complement && <p className="text-muted-foreground">{addr.complement}</p>}
                <p className="text-muted-foreground">
                  {addr.neighborhood}{addr.city ? ` — ${addr.city}` : ""}
                </p>
                {addr.reference && (
                  <p className="mt-1 text-xs text-muted-foreground">Ref: {addr.reference}</p>
                )}
              </>
            )}
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm">
            <h3 className="mb-3 font-semibold">Pagamento</h3>
            <p>{paymentMethodLabel(o?.payment_method)}</p>
            {o?.payment_status && (
              <p className="mt-1">
                <StatusBadge status={o.payment_status} />
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function paymentMethodLabel(pm?: string | null) {
  if (pm === "pix") return "PIX (via WhatsApp)";
  if (pm === "on_delivery") return "Pagar na entrega";
  return pm ?? "—";
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"flex items-center justify-between " + (strong ? "text-base font-semibold" : "text-muted-foreground")}>
      <span>{label}</span>
      <span className={strong ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

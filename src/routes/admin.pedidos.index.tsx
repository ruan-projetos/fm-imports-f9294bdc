import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Enums } from "@/integrations/supabase/types";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatBRL } from "@/lib/format";
import { buildStatusMessage, openWhatsApp } from "@/lib/whatsapp";

export const Route = createFileRoute("/admin/pedidos/")({ component: OrdersList });

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
  awaiting_store_confirmation: "Aguardando confirmação",
  awaiting_pix_payment: "Aguardando PIX",
  payment_confirmed: "Pagto confirmado",
  paid: "Pago",
  processing: "Processando",
  separating: "Separando",
  shipped: "Enviado",
  out_for_delivery: "Saiu p/ entrega",
  ready_for_pickup: "P/ retirada",
  delivered: "Entregue",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

type CustomerSnapshot = { name?: string; email?: string; phone?: string };
type DeliveryAddress = { city?: string };

type Order = {
  id: string;
  order_number: string;
  status: OrderStatus;
  payment_status: string;
  payment_method: string | null;
  delivery_type: string | null;
  customer_phone: string | null;
  total: number;
  created_at: string;
  customer_snapshot: CustomerSnapshot | null;
  delivery_address: DeliveryAddress | null;
};

function OrdersList() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deliveryFilter, setDeliveryFilter] = useState<string>("");
  const [paymentFilter, setPaymentFilter] = useState<string>("");

  const q = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,order_number,status,payment_status,payment_method,delivery_type,customer_phone,total,created_at,customer_snapshot,delivery_address",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Order[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    return (q.data ?? []).filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (deliveryFilter && r.delivery_type !== deliveryFilter) return false;
      if (paymentFilter && r.payment_method !== paymentFilter) return false;
      return true;
    });
  }, [q.data, statusFilter, deliveryFilter, paymentFilter]);

  function messageCustomer(o: Order, e: React.MouseEvent) {
    e.stopPropagation();
    const phone = o.customer_phone ?? o.customer_snapshot?.phone ?? "";
    if (!phone) {
      toast.error("Sem WhatsApp do cliente");
      return;
    }
    openWhatsApp(phone, buildStatusMessage(o.order_number, o.status));
  }

  const cols: Column<Order>[] = [
    {
      key: "num",
      header: "Número",
      sortAccessor: (r) => r.order_number,
      render: (r) => <span className="font-mono text-sm font-semibold">{r.order_number}</span>,
    },
    { key: "cust", header: "Cliente", render: (r) => r.customer_snapshot?.name ?? "—" },
    {
      key: "city",
      header: "Cidade",
      render: (r) => <span className="text-xs">{r.delivery_address?.city ?? "—"}</span>,
    },
    {
      key: "del",
      header: "Entrega",
      render: (r) => (
        <span className="text-xs">{r.delivery_type === "pickup" ? "Retirada" : "Entrega"}</span>
      ),
    },
    {
      key: "pay",
      header: "Pagamento",
      render: (r) => (
        <span className="text-xs">
          {r.payment_method === "pix"
            ? "PIX"
            : r.payment_method === "on_delivery"
              ? "Na entrega"
              : (r.payment_method ?? "—")}
        </span>
      ),
    },
    {
      key: "st",
      header: "Status",
      render: (r) => (
        <select
          value={r.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => update.mutate({ id: r.id, status: e.target.value as OrderStatus })}
          className="rounded-md border border-input bg-background px-2 py-1 text-[11px]"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s] ?? s}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "date",
      header: "Data",
      sortAccessor: (r) => r.created_at,
      render: (r) => new Date(r.created_at).toLocaleDateString("pt-BR"),
    },
    {
      key: "total",
      header: "Total",
      sortAccessor: (r) => Number(r.total),
      render: (r) => <span className="font-semibold">{formatBRL(Number(r.total))}</span>,
    },
    {
      key: "wa",
      header: "",
      render: (r) => {
        const phone = r.customer_phone ?? r.customer_snapshot?.phone ?? "";
        if (!phone) return null;
        return (
          <button
            onClick={(e) => messageCustomer(r, e)}
            className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2.5 py-1 text-[11px] font-medium text-gold hover:bg-gold/10"
            aria-label="Enviar mensagem"
          >
            <MessageCircle className="h-3 w-3" />
          </button>
        );
      },
    },
  ];

  const toolbar = (
    <>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
      >
        <option value="">Todos os status</option>
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s] ?? s}
          </option>
        ))}
      </select>
      <select
        value={deliveryFilter}
        onChange={(e) => setDeliveryFilter(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
      >
        <option value="">Entrega e retirada</option>
        <option value="delivery">Entrega FM</option>
        <option value="pickup">Retirada</option>
      </select>
      <select
        value={paymentFilter}
        onChange={(e) => setPaymentFilter(e.target.value)}
        className="rounded-md border border-input bg-background px-2 py-1.5 text-xs"
      >
        <option value="">Todos pagamentos</option>
        <option value="pix">PIX</option>
        <option value="on_delivery">Na entrega</option>
      </select>
    </>
  );

  return (
    <div>
      <PageHeader title="Pedidos" description="Acompanhe e gerencie todos os pedidos." />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="Nenhum pedido ainda"
          description="Assim que houver vendas, aparecem aqui."
        />
      ) : (
        <DataTable
          data={filtered}
          loading={q.isLoading}
          columns={cols}
          rowKey={(r) => r.id}
          toolbar={toolbar}
          searchAccessor={(r) =>
            `${r.order_number} ${r.customer_snapshot?.name ?? ""} ${r.customer_phone ?? ""} ${r.delivery_address?.city ?? ""}`
          }
          onRowClick={(r) => navigate({ to: "/admin/pedidos/$id", params: { id: r.id } })}
        />
      )}
    </div>
  );
}

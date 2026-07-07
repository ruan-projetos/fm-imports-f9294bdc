import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/pedidos/")({ component: OrdersList });

type Order = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total: number;
  created_at: string;
  customer_snapshot: any;
};

function OrdersList() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["admin", "orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,status,payment_status,payment_method,total,created_at,customer_snapshot")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const cols: Column<Order>[] = [
    { key: "num", header: "Número", sortAccessor: (r) => r.order_number, render: (r) => <span className="font-mono text-sm font-semibold">{r.order_number}</span> },
    { key: "cust", header: "Cliente", render: (r) => (r.customer_snapshot as any)?.name ?? "—" },
    { key: "pay", header: "Pagamento", render: (r) => <span className="text-xs">{r.payment_method ?? "—"}</span> },
    { key: "st", header: "Status", render: (r) => <StatusBadge status={r.status} /> },
    { key: "date", header: "Data", sortAccessor: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString("pt-BR") },
    { key: "total", header: "Total", sortAccessor: (r) => Number(r.total), render: (r) => <span className="font-semibold">{formatBRL(Number(r.total))}</span> },
  ];

  return (
    <div>
      <PageHeader title="Pedidos" description="Acompanhe e gerencie todos os pedidos." />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState icon={ShoppingBag} title="Nenhum pedido ainda" description="Assim que houver vendas, aparecem aqui." />
      ) : (
        <DataTable
          data={q.data}
          loading={q.isLoading}
          columns={cols}
          rowKey={(r) => r.id}
          searchAccessor={(r) => `${r.order_number} ${(r.customer_snapshot as any)?.name ?? ""}`}
          onRowClick={(r) => navigate({ to: "/admin/pedidos/$id", params: { id: r.id } })}
        />
      )}
    </div>
  );
}

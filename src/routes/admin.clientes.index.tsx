import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/")({ component: CustomersList });

type Customer = {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  orders_count: number;
  spent: number;
  last_order: string | null;
  created_at: string;
};

function CustomersList() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["admin", "customers"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_customers_list");
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const cols: Column<Customer>[] = [
    { key: "name", header: "Nome", sortAccessor: (r) => r.full_name ?? "", render: (r) => <span className="font-medium">{r.full_name ?? "—"}</span> },
    { key: "phone", header: "Telefone", render: (r) => r.phone ?? "—" },
    { key: "orders", header: "Pedidos", sortAccessor: (r) => r.orders_count, render: (r) => r.orders_count },
    { key: "spent", header: "Gasto", sortAccessor: (r) => Number(r.spent), render: (r) => formatBRL(Number(r.spent)) },
    { key: "last", header: "Último acesso", render: (r) => (r.last_order ? new Date(r.last_order).toLocaleDateString("pt-BR") : "—") },
    { key: "since", header: "Cliente desde", sortAccessor: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString("pt-BR") },
  ];

  return (
    <div>
      <PageHeader title="Clientes" description="Todos os clientes cadastrados na FM IMPORTS." />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState icon={Users} title="Nenhum cliente ainda" />
      ) : (
        <DataTable
          data={q.data}
          loading={q.isLoading}
          columns={cols}
          rowKey={(r) => r.user_id}
          searchAccessor={(r) => `${r.full_name ?? ""} ${r.phone ?? ""}`}
          onRowClick={(r) => navigate({ to: "/admin/clientes/$id" as any, params: { id: r.user_id } as any })}
        />
      )}
    </div>
  );
}

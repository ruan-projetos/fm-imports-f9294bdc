import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/clientes/$id")({ component: CustomerDetail });

function CustomerDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();

  const profile = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      return data;
    },
  });

  const orders = useQuery({
    queryKey: ["admin", "customer-orders", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id,order_number,status,total,created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addresses = useQuery({
    queryKey: ["admin", "customer-addr", id],
    queryFn: async () => {
      const { data } = await supabase.from("addresses").select("*").eq("user_id", id);
      return data ?? [];
    },
  });

  if (profile.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-gold" /></div>;
  }

  return (
    <div>
      <PageHeader
        title={profile.data?.full_name ?? "Cliente"}
        description={profile.data?.phone ?? ""}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/admin/clientes" as any })}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="mb-3 font-semibold">Pedidos ({orders.data?.length ?? 0})</h3>
          {(orders.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem pedidos.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {orders.data!.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium">{o.order_number}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="font-semibold">{formatBRL(Number(o.total))}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="mb-3 font-semibold">Endereços</h3>
          {(addresses.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum endereço.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {addresses.data!.map((a: any) => (
                <li key={a.id} className="rounded-lg border border-border/40 bg-background/40 p-3">
                  <p className="font-medium">{a.label ?? "Endereço"}</p>
                  <p className="text-muted-foreground">{a.street}, {a.number} — {a.city}/{a.state}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

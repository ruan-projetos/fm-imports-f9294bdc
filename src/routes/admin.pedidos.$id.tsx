import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/pedidos/$id")({ component: OrderDetail });

const STATUSES = ["pending", "paid", "shipped", "delivered", "canceled"] as const;

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
      return data as any;
    },
  });

  const update = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "order", id] });
      qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (q.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  const o = q.data;
  const cust = o?.customer_snapshot as any;
  const addr = o?.address_snapshot as any;

  return (
    <div>
      <PageHeader
        title={o?.order_number ?? "Pedido"}
        description={new Date(o?.created_at).toLocaleString("pt-BR")}
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/admin/pedidos" as any })}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Voltar
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
          <h3 className="mb-3 font-semibold">Itens</h3>
          <ul className="divide-y divide-border/40">
            {(o?.order_items ?? []).map((it: any) => {
              const snap = it.product_snapshot as any;
              return (
                <li key={it.id} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {snap?.image && <img src={snap.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{snap?.name ?? "Item"}</p>
                    <p className="text-xs text-muted-foreground">
                      {snap?.color ?? ""} {snap?.size ? `· ${snap.size}` : ""} · Qtd {it.quantity}
                    </p>
                  </div>
                  <span className="font-semibold">{formatBRL(Number(it.subtotal))}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 space-y-1 border-t border-border/40 pt-4 text-sm">
            <Row label="Subtotal" value={formatBRL(Number(o?.subtotal ?? 0))} />
            <Row label="Desconto" value={`- ${formatBRL(Number(o?.discount ?? 0))}`} />
            <Row label="Frete" value={formatBRL(Number(o?.shipping ?? 0))} />
            <Row label="Total" value={formatBRL(Number(o?.total ?? 0))} strong />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="mb-3 font-semibold">Status</h3>
            <div className="mb-3"><StatusBadge status={o?.status} /></div>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={o?.status}
              onChange={(e) => update.mutate(e.target.value as any)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm">
            <h3 className="mb-3 font-semibold">Cliente</h3>
            <p>{cust?.name ?? "—"}</p>
            <p className="text-muted-foreground">{cust?.email ?? ""}</p>
            <p className="text-muted-foreground">{cust?.phone ?? ""}</p>
          </div>

          {addr && (
            <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm">
              <h3 className="mb-3 font-semibold">Endereço</h3>
              <p>{addr.street}, {addr.number}</p>
              {addr.complement && <p className="text-muted-foreground">{addr.complement}</p>}
              <p className="text-muted-foreground">{addr.neighborhood} — {addr.city}/{addr.state}</p>
              <p className="text-muted-foreground">CEP {addr.zip}</p>
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-card p-5 text-sm">
            <h3 className="mb-3 font-semibold">Pagamento</h3>
            <p>{o?.payment_method ?? "—"}</p>
            <p className="mt-1"><StatusBadge status={o?.payment_status} /></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={"flex items-center justify-between " + (strong ? "text-base font-semibold" : "text-muted-foreground")}>
      <span>{label}</span>
      <span className={strong ? "text-foreground" : ""}>{value}</span>
    </div>
  );
}

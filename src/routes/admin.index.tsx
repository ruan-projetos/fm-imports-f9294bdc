import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  AlertTriangle,
  TrendingUp,
  Timer,
  XCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { KpiCard } from "@/components/admin/KpiCard";
import { PageHeader } from "@/components/admin/PageHeader";
import { formatBRL } from "@/lib/format";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/")({ component: Dashboard });

const GOLD = "#e5b74a";
const PIE_COLORS = ["#e5b74a", "#8b7ec8", "#6dc7c1", "#e88b6d", "#a3a3a3", "#66b26e"];

type KpiPayload = {
  revenue_total?: number;
  revenue_month?: number;
  orders_total?: number;
  orders_pending?: number;
  customers_total?: number;
  products_total?: number;
  low_stock?: number;
  out_of_stock?: number;
};

type CustomerSnapshot = { name?: string };

function Dashboard() {
  const kpis = useQuery({
    queryKey: ["admin", "kpis"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_kpis");
      if (error) throw error;
      return (data ?? {}) as KpiPayload;
    },
  });

  const sales = useQuery({
    queryKey: ["admin", "sales", 30],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_sales_by_day", { days: 30 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const topProducts = useQuery({
    queryKey: ["admin", "topProducts"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_top_products", { lim: 5 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const topCategories = useQuery({
    queryKey: ["admin", "topCategories"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_top_categories", { lim: 6 });
      if (error) throw error;
      return data ?? [];
    },
  });

  const recentOrders = useQuery({
    queryKey: ["admin", "orders", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id,order_number,total,status,created_at,customer_snapshot")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data ?? [];
    },
  });

  const k = kpis.data;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Visão geral em tempo real da FM IMPORTS."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard
          label="Receita total"
          value={k ? formatBRL(Number(k.revenue_total ?? 0)) : "—"}
          icon={DollarSign}
          accent="gold"
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Receita do mês"
          value={k ? formatBRL(Number(k.revenue_month ?? 0)) : "—"}
          icon={TrendingUp}
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Pedidos"
          value={k?.orders_total ?? 0}
          icon={ShoppingBag}
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Pedidos pendentes"
          value={k?.orders_pending ?? 0}
          icon={Timer}
          loading={kpis.isLoading}
        />
        <KpiCard label="Clientes" value={k?.customers_total ?? 0} icon={Users} loading={kpis.isLoading} />
        <KpiCard label="Produtos ativos" value={k?.products_total ?? 0} icon={Package} loading={kpis.isLoading} />
        <KpiCard
          label="Estoque baixo"
          value={k?.low_stock ?? 0}
          icon={AlertTriangle}
          accent="danger"
          hint="≤ 5 unidades"
          loading={kpis.isLoading}
        />
        <KpiCard
          label="Sem estoque"
          value={k?.out_of_stock ?? 0}
          icon={XCircle}
          accent="danger"
          loading={kpis.isLoading}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-semibold">Vendas — últimos 30 dias</h3>
          <p className="mb-4 text-xs text-muted-foreground">Receita diária dos pedidos pagos.</p>
          {sales.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sales.data}>
                  <defs>
                    <linearGradient id="g-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis
                    dataKey="day"
                    stroke="rgba(255,255,255,0.35)"
                    fontSize={11}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  />
                  <YAxis stroke="rgba(255,255,255,0.35)" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0 0% 8%)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => new Date(v).toLocaleDateString("pt-BR")}
                    formatter={(v: any) => [formatBRL(Number(v)), "Receita"]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke={GOLD} strokeWidth={2} fill="url(#g-rev)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="font-display text-lg font-semibold">Top categorias</h3>
          <p className="mb-4 text-xs text-muted-foreground">Unidades vendidas.</p>
          {topCategories.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (topCategories.data ?? []).length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              Sem dados ainda.
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topCategories.data}
                    dataKey="sold"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {(topCategories.data ?? []).map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(0 0% 8%)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border/60 bg-card p-5">
          <h3 className="mb-4 font-display text-lg font-semibold">Pedidos recentes</h3>
          {recentOrders.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (recentOrders.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum pedido registrado.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {recentOrders.data!.map((o: any) => (
                <li key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{o.order_number}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {(o.customer_snapshot as any)?.name ?? "Cliente"}
                    </p>
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
          <h3 className="mb-4 font-display text-lg font-semibold">Mais vendidos</h3>
          {topProducts.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (topProducts.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda ainda.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {topProducts.data!.map((p: any) => (
                <li key={p.product_id} className="flex items-center gap-3 py-2.5">
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-muted">
                    {p.image && <img src={p.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sold} vendida{p.sold === 1 ? "" : "s"}</p>
                  </div>
                  <span className="text-sm font-semibold text-gold">{formatBRL(Number(p.revenue))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

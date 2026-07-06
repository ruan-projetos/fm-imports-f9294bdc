import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Copy, Trash2, Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { Button } from "@/components/ui/button";
import { formatBRL } from "@/lib/format";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/produtos/")({ component: ProductsList });

type Row = {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  sale_price: number | null;
  active: boolean;
  is_featured: boolean;
  is_new: boolean;
  categories: { name: string } | null;
  brands: { name: string } | null;
  product_images: { url: string; sort_order: number }[];
  product_variants: { stock: number }[];
};

function ProductsList() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [toDelete, setToDelete] = useState<Row | null>(null);

  const q = useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,name,slug,base_price,sale_price,active,is_featured,is_new,categories(name),brands(name),product_images(url,sort_order),product_variants(stock)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const { data: src, error } = await supabase
        .from("products")
        .select("*, product_variants(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      const { product_variants, id: _id, created_at, updated_at, slug, name, ...rest } = src as any;
      const newName = `${name} (cópia)`;
      const newSlug = `${slug}-copia-${Date.now().toString(36)}`;
      const { data: created, error: cErr } = await supabase
        .from("products")
        .insert({ ...rest, name: newName, slug: newSlug, active: false })
        .select()
        .single();
      if (cErr) throw cErr;
      if (product_variants?.length) {
        const rows = product_variants.map((v: any) => ({
          product_id: created.id,
          color: v.color,
          color_hex: v.color_hex,
          size: v.size,
          stock: v.stock,
          price_override: v.price_override,
        }));
        await supabase.from("product_variants").insert(rows);
      }
      return created.id;
    },
    onSuccess: (id) => {
      toast.success("Produto duplicado");
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
      navigate({ to: "/admin/produtos/$id" as any, params: { id } as any });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: Column<Row>[] = [
    {
      key: "image",
      header: "",
      className: "w-14",
      render: (r) => {
        const img = r.product_images?.sort((a, b) => a.sort_order - b.sort_order)[0]?.url;
        return (
          <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
            {img ? <img src={img} alt="" className="h-full w-full object-cover" /> : null}
          </div>
        );
      },
    },
    {
      key: "name",
      header: "Produto",
      sortAccessor: (r) => r.name,
      render: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {r.categories?.name ?? "—"} {r.brands?.name ? `· ${r.brands.name}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Preço",
      sortAccessor: (r) => Number(r.sale_price ?? r.base_price),
      render: (r) =>
        r.sale_price ? (
          <div>
            <span className="font-semibold text-gold">{formatBRL(Number(r.sale_price))}</span>
            <span className="ml-1 text-xs text-muted-foreground line-through">
              {formatBRL(Number(r.base_price))}
            </span>
          </div>
        ) : (
          <span className="font-semibold">{formatBRL(Number(r.base_price))}</span>
        ),
    },
    {
      key: "stock",
      header: "Estoque",
      sortAccessor: (r) => r.product_variants.reduce((s, v) => s + (v.stock ?? 0), 0),
      render: (r) => {
        const total = r.product_variants.reduce((s, v) => s + (v.stock ?? 0), 0);
        return (
          <span className={total === 0 ? "text-red-400" : total <= 5 ? "text-amber-400" : ""}>
            {total} un.
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.active ? "active" : "inactive"} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-32",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Link
            to={"/admin/produtos/$id" as any}
            params={{ id: r.id } as any}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Editar"
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil className="h-4 w-4" />
          </Link>
          <button
            onClick={(e) => {
              e.stopPropagation();
              duplicate.mutate(r.id);
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label="Duplicar"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setToDelete(r);
            }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Remover"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Produtos"
        description="Gerencie o catálogo completo — imagens, variações e estoque."
        actions={
          <Button asChild className="gradient-gold text-black hover:opacity-90">
            <Link to={"/admin/produtos/novo" as any}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo produto
            </Link>
          </Button>
        }
      />

      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum produto ainda"
          description="Comece cadastrando seu primeiro produto para deixá-lo disponível na loja."
          action={
            <Button asChild className="gradient-gold text-black">
              <Link to={"/admin/produtos/novo" as any}>
                <Plus className="mr-1.5 h-4 w-4" />
                Novo produto
              </Link>
            </Button>
          }
        />
      ) : (
        <DataTable
          data={q.data}
          loading={q.isLoading}
          columns={columns}
          searchAccessor={(r) => `${r.name} ${r.slug} ${r.categories?.name ?? ""} ${r.brands?.name ?? ""}`}
          searchPlaceholder="Pesquisar produtos…"
          rowKey={(r) => r.id}
          onRowClick={(r) => navigate({ to: "/admin/produtos/$id" as any, params: { id: r.id } as any })}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir "${toDelete?.name}"?`}
        description="Esta ação não pode ser desfeita. Todas as variações e imagens serão removidas."
        destructive
        confirmLabel="Excluir"
        onConfirm={async () => {
          if (!toDelete) return;
          await del.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

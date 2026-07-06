import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Trash2, Check, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const Route = createFileRoute("/admin/avaliacoes")({ component: ReviewsPage });

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  approved: boolean;
  created_at: string;
  product_id: string;
  user_id: string;
  products?: { name: string } | null;
};

function ReviewsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Review[];
    },
  });

  const setApproval = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase.from("reviews").update({ approved }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reviews").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removida");
      qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
  });

  const cols: Column<Review>[] = [
    {
      key: "rating",
      header: "Nota",
      sortAccessor: (r) => r.rating,
      render: (r) => (
        <div className="flex gap-0.5 text-gold">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={"h-3.5 w-3.5 " + (i < r.rating ? "fill-current" : "opacity-30")} />
          ))}
        </div>
      ),
    },
    { key: "prod", header: "Produto", render: (r) => <span className="font-medium">{r.products?.name ?? "—"}</span> },
    { key: "comment", header: "Comentário", render: (r) => <span className="line-clamp-2 max-w-md text-sm">{r.comment ?? "—"}</span> },
    { key: "date", header: "Data", sortAccessor: (r) => r.created_at, render: (r) => new Date(r.created_at).toLocaleDateString("pt-BR") },
    { key: "st", header: "Status", render: (r) => <StatusBadge status={r.approved ? "approved" : "pending"} /> },
    {
      key: "a",
      header: "",
      className: "w-32",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setApproval.mutate({ id: r.id, approved: !r.approved })}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            aria-label={r.approved ? "Ocultar" : "Aprovar"}
          >
            {r.approved ? <EyeOff className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          </button>
          <button
            onClick={() => del.mutate(r.id)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Avaliações" description="Modere avaliações antes de publicá-las." />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState icon={Star} title="Nenhuma avaliação" />
      ) : (
        <DataTable data={q.data} loading={q.isLoading} columns={cols} rowKey={(r) => r.id} searchAccessor={(r) => `${r.comment ?? ""} ${r.products?.name ?? ""}`} />
      )}
    </div>
  );
}

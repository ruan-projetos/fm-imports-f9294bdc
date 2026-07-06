import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Ribbon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/marcas")({ component: BrandsPage });

type Brand = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  sort_order: number;
  active: boolean;
};

function BrandsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Brand> | null>(null);
  const [toDelete, setToDelete] = useState<Brand | null>(null);

  const q = useQuery({
    queryKey: ["admin", "brands"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });

  const save = useMutation({
    mutationFn: async (b: Partial<Brand>) => {
      const payload = {
        name: b.name!,
        slug: b.slug || slugify(b.name!),
        description: b.description ?? null,
        logo_url: b.logo_url ?? null,
        sort_order: b.sort_order ?? 0,
        active: b.active ?? true,
      };
      if (b.id) {
        const { error } = await supabase.from("brands").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("brands").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Marca salva");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
      qc.invalidateQueries({ queryKey: ["brands"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("brands").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marca removida");
      qc.invalidateQueries({ queryKey: ["admin", "brands"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const columns: Column<Brand>[] = [
    {
      key: "logo",
      header: "",
      className: "w-14",
      render: (r) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
          {r.logo_url && <img src={r.logo_url} alt="" className="h-full w-full object-cover" />}
        </div>
      ),
    },
    {
      key: "name",
      header: "Marca",
      sortAccessor: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">/{r.slug}</p>
        </div>
      ),
    },
    { key: "sort", header: "Ordem", sortAccessor: (r) => r.sort_order, render: (r) => r.sort_order },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.active ? "active" : "inactive"} /> },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button onClick={() => setEditing(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => setToDelete(r)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Marcas"
        actions={
          <Button className="gradient-gold text-black hover:opacity-90" onClick={() => setEditing({ active: true })}>
            <Plus className="mr-1.5 h-4 w-4" /> Nova marca
          </Button>
        }
      />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState icon={Ribbon} title="Nenhuma marca" description="Cadastre marcas para agrupar seus produtos." />
      ) : (
        <DataTable data={q.data} loading={q.isLoading} columns={columns} rowKey={(r) => r.id} searchAccessor={(r) => r.name} />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar marca" : "Nova marca"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div>
                <Label className="mb-2 block">Logo</Label>
                <ImageUploader
                  bucket="brands"
                  single
                  images={editing.logo_url ? [{ url: editing.logo_url }] : []}
                  onChange={(imgs) => setEditing({ ...editing, logo_url: imgs[0]?.url ?? null })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="text-sm">Ativa</span>
                <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button className="gradient-gold text-black" onClick={() => editing && save.mutate(editing)} disabled={!editing?.name}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir "${toDelete?.name}"?`}
        destructive
        onConfirm={async () => {
          if (toDelete) await del.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

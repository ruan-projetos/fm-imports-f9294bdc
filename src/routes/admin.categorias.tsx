import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/categorias")({ component: CategoriesPage });

type Cat = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  icon: string | null;
  sort_order: number;
  active: boolean;
};

function CategoriesPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);
  const [toDelete, setToDelete] = useState<Cat | null>(null);

  const q = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Cat>) => {
      const payload = {
        name: c.name!,
        slug: c.slug || slugify(c.name!),
        description: c.description ?? null,
        image_url: c.image_url ?? null,
        icon: c.icon ?? null,
        sort_order: c.sort_order ?? 0,
        active: c.active ?? true,
      };
      if (c.id) {
        const { error } = await supabase.from("categories").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Categoria salva");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Categoria removida");
      qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const columns: Column<Cat>[] = [
    {
      key: "img",
      header: "",
      className: "w-14",
      render: (r) => (
        <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
          {r.image_url && <img src={r.image_url} alt="" className="h-full w-full object-cover" />}
        </div>
      ),
    },
    {
      key: "name",
      header: "Nome",
      sortAccessor: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">/{r.slug}</p>
        </div>
      ),
    },
    { key: "sort", header: "Ordem", sortAccessor: (r) => r.sort_order, render: (r) => r.sort_order },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge status={r.active ? "active" : "inactive"} />,
    },
    {
      key: "actions",
      header: "",
      className: "w-24",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <button
            onClick={() => setEditing(r)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setToDelete(r)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const isNew = !editing?.id;

  return (
    <div>
      <PageHeader
        title="Categorias"
        description="Organize a navegação da loja."
        actions={
          <Button
            className="gradient-gold text-black hover:opacity-90"
            onClick={() => setEditing({ active: true, sort_order: (q.data?.length ?? 0) })}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova categoria
          </Button>
        }
      />

      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState
          icon={Tags}
          title="Nenhuma categoria"
          description="Adicione categorias para organizar seus produtos."
          action={
            <Button onClick={() => setEditing({ active: true })} className="gradient-gold text-black">
              <Plus className="mr-1.5 h-4 w-4" /> Nova categoria
            </Button>
          }
        />
      ) : (
        <DataTable
          data={q.data}
          loading={q.isLoading}
          columns={columns}
          searchAccessor={(r) => r.name + " " + r.slug}
          rowKey={(r) => r.id}
        />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{isNew ? "Nova categoria" : "Editar categoria"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
                  placeholder={slugify(editing.name ?? "")}
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={2}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={editing.sort_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Ícone</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.icon ?? ""}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value || null })}
                  >
                    <option value="">— nenhum —</option>
                    {ICON_OPTIONS.map((o) => (
                      <option key={o.key} value={o.key}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {editing.icon && (
                    <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-md border border-border bg-card">
                      <CategoryIcon name={editing.icon} className="h-5 w-5 text-gold" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Imagem</Label>
                <ImageUploader
                  bucket="categories"
                  single
                  images={editing.image_url ? [{ url: editing.image_url }] : []}
                  onChange={(imgs) => setEditing({ ...editing, image_url: imgs[0]?.url ?? null })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="text-sm">Ativa</span>
                <Switch
                  checked={editing.active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              className="gradient-gold text-black"
              onClick={() => editing && save.mutate(editing)}
              disabled={save.isPending || !editing?.name}
            >
              Salvar
            </Button>
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

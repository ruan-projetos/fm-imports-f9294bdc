import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/admin/banners")({ component: BannersPage });

type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  image_url: string;
  link_url: string | null;
  position: string;
  sort_order: number;
  active: boolean;
};

function BannersPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Banner> | null>(null);
  const [toDelete, setToDelete] = useState<Banner | null>(null);

  const q = useQuery({
    queryKey: ["admin", "banners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("banners").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
  });

  const save = useMutation({
    mutationFn: async (b: Partial<Banner>) => {
      const payload = {
        title: b.title ?? null,
        subtitle: b.subtitle ?? null,
        cta_label: b.cta_label ?? null,
        image_url: b.image_url ?? "",
        link_url: b.link_url ?? null,
        position: b.position ?? "hero",
        sort_order: b.sort_order ?? 0,
        active: b.active ?? true,
      };
      if (b.id) {
        const { error } = await supabase.from("banners").update(payload).eq("id", b.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Banner salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
      qc.invalidateQueries({ queryKey: ["banners", "hero"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["admin", "banners"] });
    },
  });

  const cols: Column<Banner>[] = [
    {
      key: "img",
      header: "",
      className: "w-20",
      render: (r) => (
        <div className="h-10 w-16 overflow-hidden rounded-md bg-muted">
          {r.image_url && <img src={r.image_url} className="h-full w-full object-cover" alt="" />}
        </div>
      ),
    },
    { key: "title", header: "Título", sortAccessor: (r) => r.title ?? "", render: (r) => <span className="font-medium">{r.title ?? "—"}</span> },
    { key: "pos", header: "Posição", render: (r) => <span className="text-xs uppercase text-muted-foreground">{r.position}</span> },
    { key: "sort", header: "Ordem", sortAccessor: (r) => r.sort_order, render: (r) => r.sort_order },
    { key: "st", header: "Status", render: (r) => <StatusBadge status={r.active ? "active" : "inactive"} /> },
    {
      key: "a",
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
        title="Banners"
        description="Controle as chamadas da home e páginas internas."
        actions={
          <Button className="gradient-gold text-black hover:opacity-90" onClick={() => setEditing({ active: true, position: "hero" })}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo banner
          </Button>
        }
      />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState icon={ImageIcon} title="Nenhum banner" />
      ) : (
        <DataTable data={q.data} loading={q.isLoading} columns={cols} rowKey={(r) => r.id} searchAccessor={(r) => r.title ?? ""} />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar banner" : "Novo banner"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Título</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Subtítulo</Label>
                <Input value={editing.subtitle ?? ""} onChange={(e) => setEditing({ ...editing, subtitle: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Texto do botão</Label>
                  <Input value={editing.cta_label ?? ""} onChange={(e) => setEditing({ ...editing, cta_label: e.target.value })} />
                </div>
                <div>
                  <Label>Link</Label>
                  <Input value={editing.link_url ?? ""} onChange={(e) => setEditing({ ...editing, link_url: e.target.value })} placeholder="/produtos" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Posição</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.position ?? "hero"}
                    onChange={(e) => setEditing({ ...editing, position: e.target.value })}
                  >
                    <option value="hero">Hero</option>
                    <option value="mid">Meio</option>
                    <option value="bottom">Rodapé</option>
                  </select>
                </div>
                <div>
                  <Label>Ordem</Label>
                  <Input type="number" value={editing.sort_order ?? 0} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Imagem</Label>
                <ImageUploader
                  bucket="banners"
                  single
                  images={editing.image_url ? [{ url: editing.image_url }] : []}
                  onChange={(imgs) => setEditing({ ...editing, image_url: imgs[0]?.url ?? "" })}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                <span className="text-sm">Ativo</span>
                <Switch checked={editing.active ?? true} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button className="gradient-gold text-black" onClick={() => editing && save.mutate(editing)} disabled={!editing?.image_url}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Excluir banner?"
        destructive
        onConfirm={async () => {
          if (toDelete) await del.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

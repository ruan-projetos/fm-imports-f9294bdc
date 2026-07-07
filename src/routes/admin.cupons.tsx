import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Pencil, Trash2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/EmptyState";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatBRL } from "@/lib/format";

export const Route = createFileRoute("/admin/cupons")({ component: CouponsPage });

type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_order: number;
  expires_at: string | null;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
};

function CouponsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [toDelete, setToDelete] = useState<Coupon | null>(null);

  const q = useQuery({
    queryKey: ["admin", "coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Coupon[];
    },
  });

  const save = useMutation({
    mutationFn: async (c: Partial<Coupon>) => {
      const payload = {
        code: (c.code ?? "").toUpperCase().trim(),
        description: c.description ?? null,
        discount_type: c.discount_type ?? "percent",
        discount_value: c.discount_value ?? 0,
        min_order: c.min_order ?? 0,
        expires_at: c.expires_at || null,
        usage_limit: c.usage_limit ?? null,
        active: c.active ?? true,
      };
      if (c.id) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", c.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Cupom salvo");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
  });

  const cols: Column<Coupon>[] = [
    { key: "code", header: "Código", sortAccessor: (r) => r.code, render: (r) => <span className="font-mono font-semibold text-gold">{r.code}</span> },
    {
      key: "value",
      header: "Desconto",
      render: (r) =>
        r.discount_type === "percent" ? `${r.discount_value}%` : formatBRL(Number(r.discount_value)),
    },
    { key: "min", header: "Mín. pedido", render: (r) => formatBRL(Number(r.min_order)) },
    { key: "uses", header: "Usos", render: (r) => `${r.used_count}${r.usage_limit ? ` / ${r.usage_limit}` : ""}` },
    {
      key: "exp",
      header: "Validade",
      render: (r) => (r.expires_at ? new Date(r.expires_at).toLocaleDateString("pt-BR") : "—"),
    },
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
        title="Cupons"
        actions={
          <Button className="gradient-gold text-black hover:opacity-90" onClick={() => setEditing({ active: true, discount_type: "percent", discount_value: 10 })}>
            <Plus className="mr-1.5 h-4 w-4" /> Novo cupom
          </Button>
        }
      />
      {!q.isLoading && (q.data ?? []).length === 0 ? (
        <EmptyState icon={Ticket} title="Nenhum cupom" description="Crie cupons de desconto para suas campanhas." />
      ) : (
        <DataTable data={q.data} loading={q.isLoading} columns={cols} rowKey={(r) => r.id} searchAccessor={(r) => r.code} />
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar cupom" : "Novo cupom"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div>
                <Label>Código</Label>
                <Input
                  value={editing.code ?? ""}
                  onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                  className="font-mono uppercase"
                />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tipo</Label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editing.discount_type ?? "percent"}
                    onChange={(e) => setEditing({ ...editing, discount_type: e.target.value as "percent" | "fixed" })}
                  >
                    <option value="percent">Porcentagem (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.discount_value ?? 0}
                    onChange={(e) => setEditing({ ...editing, discount_value: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Pedido mínimo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editing.min_order ?? 0}
                    onChange={(e) => setEditing({ ...editing, min_order: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Limite de usos</Label>
                  <Input
                    type="number"
                    value={editing.usage_limit ?? ""}
                    onChange={(e) => setEditing({ ...editing, usage_limit: e.target.value ? Number(e.target.value) : null })}
                    placeholder="Ilimitado"
                  />
                </div>
              </div>
              <div>
                <Label>Validade</Label>
                <Input
                  type="date"
                  value={editing.expires_at ? editing.expires_at.slice(0, 10) : ""}
                  onChange={(e) => setEditing({ ...editing, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
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
            <Button className="gradient-gold text-black" onClick={() => editing && save.mutate(editing)} disabled={!editing?.code}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir cupom "${toDelete?.code}"?`}
        destructive
        onConfirm={async () => {
          if (toDelete) await del.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

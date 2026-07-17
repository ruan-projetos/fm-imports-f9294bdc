import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Tags,
  Ribbon,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { HomeSection, HomeSettings } from "@/lib/queries";

export const Route = createFileRoute("/admin/homepage")({ component: HomepagePage });

type Cat = { id: string; name: string };
type BrandLite = { id: string; name: string };
type ProductLite = { id: string; name: string; slug: string };

const SOURCES: { value: HomeSection["source"]; label: string }[] = [
  { value: "manual", label: "Manual (escolher produtos)" },
  { value: "featured", label: "Em destaque" },
  { value: "newest", label: "Mais recentes" },
  { value: "bestsellers", label: "Mais vendidos" },
  { value: "promotions", label: "Promoções" },
  { value: "category", label: "Categoria específica" },
  { value: "brand", label: "Marca específica" },
];

function HomepagePage() {
  const qc = useQueryClient();

  const settingsQ = useQuery({
    queryKey: ["admin", "home_settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_settings").select("*").limit(1).maybeSingle();
      if (error) throw error;
      return data as HomeSettings | null;
    },
  });

  const sectionsQ = useQuery({
    queryKey: ["admin", "home_sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("home_sections").select("*").order("sort_order");
      if (error) throw error;
      return (data ?? []) as HomeSection[];
    },
  });

  const [editingSection, setEditingSection] = useState<Partial<HomeSection> | null>(null);
  const [toDelete, setToDelete] = useState<HomeSection | null>(null);
  const [couponDraft, setCouponDraft] = useState<Partial<HomeSettings> | null>(null);

  const saveCoupon = useMutation({
    mutationFn: async (s: Partial<HomeSettings>) => {
      if (!settingsQ.data?.id) throw new Error("Settings não encontrado");
      const { error } = await supabase
        .from("home_settings")
        .update({
          coupon_active: s.coupon_active ?? true,
          coupon_title: s.coupon_title ?? null,
          coupon_text: s.coupon_text ?? null,
          coupon_code: s.coupon_code ?? null,
          coupon_color: s.coupon_color ?? null,
        })
        .eq("id", settingsQ.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cupom atualizado");
      setCouponDraft(null);
      qc.invalidateQueries({ queryKey: ["admin", "home_settings"] });
      qc.invalidateQueries({ queryKey: ["home_settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSection = useMutation({
    mutationFn: async (s: Partial<HomeSection>) => {
      const payload = {
        key: s.key || `section-${Date.now()}`,
        title: s.title!,
        subtitle: s.subtitle ?? null,
        type: s.type ?? "products",
        source: s.source ?? "manual",
        source_ref: s.source_ref ?? null,
        view_all_href: s.view_all_href ?? null,
        item_limit: s.item_limit ?? 8,
        sort_order: s.sort_order ?? 0,
        active: s.active ?? true,
      };
      if (s.id) {
        const { error } = await supabase.from("home_sections").update(payload).eq("id", s.id);
        if (error) throw error;
        return s.id;
      }
      const { data, error } = await supabase.from("home_sections").insert(payload).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      toast.success("Seção salva");
      setEditingSection(null);
      qc.invalidateQueries({ queryKey: ["admin", "home_sections"] });
      qc.invalidateQueries({ queryKey: ["home_sections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("home_sections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Seção removida");
      qc.invalidateQueries({ queryKey: ["admin", "home_sections"] });
      qc.invalidateQueries({ queryKey: ["home_sections"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function reorder(section: HomeSection, dir: -1 | 1) {
    const list = sectionsQ.data ?? [];
    const idx = list.findIndex((s) => s.id === section.id);
    const swap = list[idx + dir];
    if (!swap) return;
    await supabase.from("home_sections").update({ sort_order: swap.sort_order }).eq("id", section.id);
    await supabase.from("home_sections").update({ sort_order: section.sort_order }).eq("id", swap.id);
    qc.invalidateQueries({ queryKey: ["admin", "home_sections"] });
    qc.invalidateQueries({ queryKey: ["home_sections"] });
  }

  async function toggleActive(section: HomeSection) {
    await supabase.from("home_sections").update({ active: !section.active }).eq("id", section.id);
    qc.invalidateQueries({ queryKey: ["admin", "home_sections"] });
    qc.invalidateQueries({ queryKey: ["home_sections"] });
  }

  const settings = settingsQ.data;
  const coupon = couponDraft ?? settings ?? {};

  return (
    <div className="space-y-8">
      <PageHeader
        title="Homepage"
        description="Gerencie todo o conteúdo da página inicial sem alterar código."
      />

      {/* Atalhos */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ShortcutCard to="/admin/banners" icon={ImageIcon} title="Banners" description="Editar carrossel principal" />
        <ShortcutCard to="/admin/categorias" icon={Tags} title="Categorias" description="Nome, ícone, ordem e visibilidade" />
        <ShortcutCard to="/admin/marcas" icon={Ribbon} title="Marcas" description="Logos e ordem exibida" />
      </div>

      {/* Cupom da Home */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Card de cupom</h2>
            <p className="text-sm text-muted-foreground">Aparece entre as seções da Home.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Ativo</span>
            <Switch
              checked={coupon.coupon_active ?? true}
              onCheckedChange={(v) => setCouponDraft({ ...(coupon as HomeSettings), coupon_active: v })}
            />
          </div>
        </div>
        {settingsQ.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Título</Label>
              <Input
                value={coupon.coupon_title ?? ""}
                onChange={(e) =>
                  setCouponDraft({ ...(coupon as HomeSettings), coupon_title: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={coupon.coupon_code ?? ""}
                onChange={(e) =>
                  setCouponDraft({ ...(coupon as HomeSettings), coupon_code: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2">
              <Label>Texto (use {"{code}"} para inserir o código)</Label>
              <Textarea
                rows={2}
                value={coupon.coupon_text ?? ""}
                onChange={(e) =>
                  setCouponDraft({ ...(coupon as HomeSettings), coupon_text: e.target.value })
                }
              />
            </div>
            <div>
              <Label>Cor (hex)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={coupon.coupon_color ?? "#D4AF37"}
                  onChange={(e) =>
                    setCouponDraft({ ...(coupon as HomeSettings), coupon_color: e.target.value })
                  }
                />
                <div
                  className="h-10 w-10 shrink-0 rounded-md border border-border"
                  style={{ backgroundColor: coupon.coupon_color ?? "#D4AF37" }}
                />
              </div>
            </div>
          </div>
        )}
        {couponDraft && (
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCouponDraft(null)}>
              Descartar
            </Button>
            <Button
              className="gradient-gold text-black"
              disabled={saveCoupon.isPending}
              onClick={() => saveCoupon.mutate(couponDraft)}
            >
              Salvar cupom
            </Button>
          </div>
        )}
      </section>

      {/* Seções da Home */}
      <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Seções da Home</h2>
            <p className="text-sm text-muted-foreground">
              Reordene, esconda ou crie novas seções. Cada seção pode puxar produtos automaticamente ou permitir seleção manual.
            </p>
          </div>
          <Button
            className="gradient-gold text-black"
            onClick={() =>
              setEditingSection({
                active: true,
                type: "products",
                source: "manual",
                item_limit: 8,
                sort_order: (sectionsQ.data?.length ?? 0) * 10 + 10,
              })
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nova seção
          </Button>
        </div>

        <div className="space-y-2">
          {(sectionsQ.data ?? []).map((s, i) => (
            <div
              key={s.id}
              className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/40 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{s.title}</span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.type}
                  </span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {s.source}
                  </span>
                  {!s.active && (
                    <span className="rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-destructive">
                      Oculta
                    </span>
                  )}
                </div>
                {s.subtitle && <p className="text-xs text-muted-foreground">{s.subtitle}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  disabled={i === 0}
                  onClick={() => reorder(s, -1)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
                  title="Subir"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
                <button
                  disabled={i === (sectionsQ.data?.length ?? 0) - 1}
                  onClick={() => reorder(s, 1)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground disabled:opacity-30"
                  title="Descer"
                >
                  <ArrowDown className="h-4 w-4" />
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  title={s.active ? "Ocultar" : "Mostrar"}
                >
                  {s.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditingSection(s)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setToDelete(s)}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!sectionsQ.isLoading && (sectionsQ.data ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
              Nenhuma seção. Adicione a primeira.
            </p>
          )}
        </div>
      </section>

      <SectionDialog
        editing={editingSection}
        onOpenChange={(o) => !o && setEditingSection(null)}
        onSave={(s) => saveSection.mutate(s)}
        saving={saveSection.isPending}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir seção "${toDelete?.title}"?`}
        destructive
        onConfirm={async () => {
          if (toDelete) await delSection.mutateAsync(toDelete.id);
          setToDelete(null);
        }}
      />
    </div>
  );
}

function ShortcutCard({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: "/admin/banners" | "/admin/categorias" | "/admin/marcas";
  icon: typeof ImageIcon;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-border/60 bg-card/40 p-4 transition-colors hover:border-gold/60"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gold/10 text-gold">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-gold" />
    </Link>
  );
}

function SectionDialog({
  editing,
  onOpenChange,
  onSave,
  saving,
}: {
  editing: Partial<HomeSection> | null;
  onOpenChange: (o: boolean) => void;
  onSave: (s: Partial<HomeSection>) => void;
  saving: boolean;
}) {
  const [state, setState] = useState<Partial<HomeSection> | null>(editing);
  // reset local state whenever editing changes
  const editingId = editing?.id ?? null;
  const currentId = state?.id ?? null;
  if (editing && editingId !== currentId) {
    setState(editing);
  }
  if (!editing && state) {
    setState(null);
  }

  const categoriesQ = useQuery({
    queryKey: ["admin", "categories_lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as Cat[];
    },
  });

  const brandsQ = useQuery({
    queryKey: ["admin", "brands_lite"],
    queryFn: async () => {
      const { data, error } = await supabase.from("brands").select("id,name").order("name");
      if (error) throw error;
      return (data ?? []) as BrandLite[];
    },
  });

  return (
    <Dialog open={!!editing} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing?.id ? "Editar seção" : "Nova seção"}</DialogTitle>
        </DialogHeader>
        {state && (
          <div className="space-y-4">
            <div>
              <Label>Título</Label>
              <Input
                value={state.title ?? ""}
                onChange={(e) => setState({ ...state, title: e.target.value })}
              />
            </div>
            <div>
              <Label>Subtítulo</Label>
              <Input
                value={state.subtitle ?? ""}
                onChange={(e) => setState({ ...state, subtitle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={state.type ?? "products"}
                  onChange={(e) =>
                    setState({ ...state, type: e.target.value as HomeSection["type"] })
                  }
                >
                  <option value="products">Produtos</option>
                  <option value="brands">Marcas</option>
                  <option value="custom">Custom (só título)</option>
                </select>
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={state.sort_order ?? 0}
                  onChange={(e) =>
                    setState({ ...state, sort_order: Number(e.target.value) })
                  }
                />
              </div>
            </div>

            {state.type === "products" && (
              <>
                <div>
                  <Label>Fonte dos produtos</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={state.source ?? "manual"}
                    onChange={(e) =>
                      setState({
                        ...state,
                        source: e.target.value as HomeSection["source"],
                        source_ref: null,
                      })
                    }
                  >
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {state.source === "category" && (
                  <div>
                    <Label>Categoria</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={state.source_ref ?? ""}
                      onChange={(e) => setState({ ...state, source_ref: e.target.value || null })}
                    >
                      <option value="">— selecione —</option>
                      {categoriesQ.data?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {state.source === "brand" && (
                  <div>
                    <Label>Marca</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={state.source_ref ?? ""}
                      onChange={(e) => setState({ ...state, source_ref: e.target.value || null })}
                    >
                      <option value="">— selecione —</option>
                      {brandsQ.data?.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Limite</Label>
                    <Input
                      type="number"
                      value={state.item_limit ?? 8}
                      onChange={(e) =>
                        setState({ ...state, item_limit: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <Label>Link "Ver todos"</Label>
                    <Input
                      value={state.view_all_href ?? ""}
                      placeholder="/produtos"
                      onChange={(e) =>
                        setState({ ...state, view_all_href: e.target.value || null })
                      }
                    />
                  </div>
                </div>

                {state.source === "manual" && state.id && (
                  <ManualProductsPicker sectionId={state.id} />
                )}
                {state.source === "manual" && !state.id && (
                  <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                    Salve a seção primeiro para escolher os produtos manualmente.
                  </p>
                )}
              </>
            )}

            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <span className="text-sm">Ativa</span>
              <Switch
                checked={state.active ?? true}
                onCheckedChange={(v) => setState({ ...state, active: v })}
              />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="gradient-gold text-black"
            disabled={saving || !state?.title}
            onClick={() => state && onSave(state)}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ManualProductsPicker({ sectionId }: { sectionId: string }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const selectedQ = useQuery({
    queryKey: ["admin", "home_section_products", sectionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("home_section_products")
        .select("product_id, sort_order, product:products(id,name,slug)")
        .eq("section_id", sectionId)
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as { product_id: string; sort_order: number; product: ProductLite }[];
    },
  });

  const searchQ = useQuery({
    queryKey: ["admin", "products_search", search],
    enabled: search.length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug")
        .ilike("name", `%${search}%`)
        .limit(10);
      if (error) throw error;
      return (data ?? []) as ProductLite[];
    },
  });

  async function add(p: ProductLite) {
    const nextOrder = (selectedQ.data?.length ?? 0) * 10 + 10;
    const { error } = await supabase
      .from("home_section_products")
      .insert({ section_id: sectionId, product_id: p.id, sort_order: nextOrder });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "home_section_products", sectionId] });
    qc.invalidateQueries({ queryKey: ["home_section_products"] });
  }

  async function remove(productId: string) {
    const { error } = await supabase
      .from("home_section_products")
      .delete()
      .eq("section_id", sectionId)
      .eq("product_id", productId);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin", "home_section_products", sectionId] });
    qc.invalidateQueries({ queryKey: ["home_section_products"] });
  }

  const selectedIds = new Set(selectedQ.data?.map((r) => r.product_id) ?? []);

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <Label>Produtos selecionados</Label>
      <div className="mt-2 space-y-1">
        {selectedQ.data?.map((r) => (
          <div
            key={r.product_id}
            className="flex items-center justify-between rounded-md bg-background/40 px-2 py-1.5 text-sm"
          >
            <span className="truncate">{r.product?.name ?? "—"}</span>
            <button
              onClick={() => remove(r.product_id)}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {!selectedQ.isLoading && (selectedQ.data?.length ?? 0) === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum produto selecionado.</p>
        )}
      </div>
      <div className="mt-3">
        <Label>Adicionar produto</Label>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome…"
        />
        {search.length >= 2 && (
          <div className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/60 p-1">
            {searchQ.data?.filter((p) => !selectedIds.has(p.id)).map((p) => (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-muted/40"
              >
                <Plus className="h-3.5 w-3.5 text-gold" />
                <span className="truncate">{p.name}</span>
              </button>
            ))}
            {searchQ.data?.length === 0 && (
              <p className="p-2 text-xs text-muted-foreground">Nenhum resultado.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

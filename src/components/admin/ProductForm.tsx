import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageUploader, type UploadedImage } from "@/components/admin/ImageUploader";
import { slugify } from "@/lib/slug";

export type ProductVariantValue = {
  id?: string;
  color: string;
  color_hex: string;
  size: string;
  stock: number;
  price_override: number | null;
};

export type ProductFormValues = {
  name: string;
  slug: string;
  short_description: string;
  description: string;
  category_id: string;
  brand_id: string;
  base_price: number;
  sale_price: number | null;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  active: boolean;
  images: UploadedImage[];
  variants: ProductVariantValue[];
};

export function blankValues(): ProductFormValues {
  return {
    name: "",
    slug: "",
    short_description: "",
    description: "",
    category_id: "",
    brand_id: "",
    base_price: 0,
    sale_price: null,
    is_featured: false,
    is_new: false,
    is_bestseller: false,
    active: true,
    images: [],
    variants: [],
  };
}

interface Props {
  values: ProductFormValues;
  onChange: (v: ProductFormValues) => void;
  onSubmit: () => void;
  saving: boolean;
}

export function ProductForm({ values, onChange, onSubmit, saving }: Props) {
  const cats = useQuery({
    queryKey: ["admin", "cats-list"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("id,name").order("name");
      return data ?? [];
    },
  });
  const brands = useQuery({
    queryKey: ["admin", "brands-list"],
    queryFn: async () => {
      const { data } = await supabase.from("brands").select("id,name").order("name");
      return data ?? [];
    },
  });

  const setV = (patch: Partial<ProductFormValues>) => onChange({ ...values, ...patch });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="preco">Preços</TabsTrigger>
          <TabsTrigger value="variacoes">Variações</TabsTrigger>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
            <Field label="Nome" required>
              <Input value={values.name} onChange={(e) => setV({ name: e.target.value })} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Categoria">
                <select
                  value={values.category_id}
                  onChange={(e) => setV({ category_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {(cats.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Marca">
                <select
                  value={values.brand_id}
                  onChange={(e) => setV({ brand_id: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">—</option>
                  {(brands.data ?? []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Descrição curta">
              <Input
                value={values.short_description}
                onChange={(e) => setV({ short_description: e.target.value })}
                placeholder="Aparece nos cards da loja"
              />
            </Field>
            <Field label="Descrição completa">
              <Textarea
                rows={6}
                value={values.description}
                onChange={(e) => setV({ description: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-4">
              <Toggle
                label="Ativo"
                value={values.active}
                onChange={(v) => setV({ active: v })}
              />
              <Toggle
                label="Destaque"
                value={values.is_featured}
                onChange={(v) => setV({ is_featured: v })}
              />
              <Toggle label="Novidade" value={values.is_new} onChange={(v) => setV({ is_new: v })} />
              <Toggle
                label="Mais vendido"
                value={values.is_bestseller}
                onChange={(v) => setV({ is_bestseller: v })}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="preco" className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5 grid gap-4 sm:grid-cols-2">
            <Field label="Preço base (R$)" required>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={values.base_price}
                onChange={(e) => setV({ base_price: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Preço promocional (R$)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={values.sale_price ?? ""}
                onChange={(e) =>
                  setV({ sale_price: e.target.value === "" ? null : Number(e.target.value) })
                }
                placeholder="Vazio se sem promoção"
              />
            </Field>
          </div>
        </TabsContent>

        <TabsContent value="variacoes" className="space-y-4">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Variações de cor e tamanho</h3>
                <p className="text-xs text-muted-foreground">Cada combinação tem estoque próprio.</p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  setV({
                    variants: [
                      ...values.variants,
                      { color: "", color_hex: "", size: "", stock: 0, price_override: null },
                    ],
                  })
                }
                variant="outline"
                size="sm"
              >
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </div>
            {values.variants.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma variação. Adicione ao menos uma para permitir vendas.
              </p>
            ) : (
              <div className="space-y-2">
                <div className="hidden grid-cols-[1fr_60px_1fr_100px_120px_40px] gap-2 px-1 text-[11px] uppercase tracking-wide text-muted-foreground sm:grid">
                  <span>Cor</span>
                  <span>Hex</span>
                  <span>Tamanho</span>
                  <span>Estoque</span>
                  <span>Preço extra</span>
                  <span />
                </div>
                {values.variants.map((v, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-2 gap-2 rounded-lg border border-border/60 bg-background/40 p-2 sm:grid-cols-[1fr_60px_1fr_100px_120px_40px]"
                  >
                    <Input
                      value={v.color}
                      placeholder="Cor"
                      onChange={(e) => updateVariant(values, idx, { color: e.target.value }, onChange)}
                    />
                    <Input
                      value={v.color_hex}
                      placeholder="#000"
                      onChange={(e) => updateVariant(values, idx, { color_hex: e.target.value }, onChange)}
                    />
                    <Input
                      value={v.size}
                      placeholder="Tamanho"
                      onChange={(e) => updateVariant(values, idx, { size: e.target.value }, onChange)}
                    />
                    <Input
                      type="number"
                      min={0}
                      value={v.stock}
                      onChange={(e) => updateVariant(values, idx, { stock: Number(e.target.value) }, onChange)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={v.price_override ?? ""}
                      placeholder="—"
                      onChange={(e) =>
                        updateVariant(
                          values,
                          idx,
                          { price_override: e.target.value === "" ? null : Number(e.target.value) },
                          onChange,
                        )
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        onChange({ ...values, variants: values.variants.filter((_, i) => i !== idx) })
                      }
                      className="flex items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="imagens">
          <div className="rounded-2xl border border-border/60 bg-card p-5">
            <h3 className="mb-1 font-semibold">Galeria</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Envie até 8 imagens. Arraste para reordenar. A primeira é a capa.
            </p>
            <ImageUploader
              bucket="products"
              images={values.images}
              onChange={(images) => setV({ images })}
              max={8}
            />
          </div>
        </TabsContent>

        <TabsContent value="seo">
          <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-4">
            <Field label="Slug (URL)">
              <Input
                value={values.slug}
                onChange={(e) => setV({ slug: slugify(e.target.value) })}
                placeholder={slugify(values.name) || "gerado-do-nome"}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                URL: /produtos/{values.slug || slugify(values.name) || "..."}
              </p>
            </Field>
          </div>
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-4 mt-6 flex justify-end gap-2">
        <Button type="submit" disabled={saving} className="gradient-gold text-black hover:opacity-90">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
}

function updateVariant(
  values: ProductFormValues,
  idx: number,
  patch: Partial<ProductVariantValue>,
  onChange: (v: ProductFormValues) => void,
) {
  const next = [...values.variants];
  next[idx] = { ...next[idx], ...patch };
  onChange({ ...values, variants: next });
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <Label className="mb-1.5 block text-xs uppercase tracking-wide text-muted-foreground">
        {label} {required && <span className="text-gold">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border/60 bg-background/40 px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch checked={value} onCheckedChange={onChange} />
    </label>
  );
}

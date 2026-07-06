import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm, type ProductFormValues, blankValues } from "@/components/admin/ProductForm";
import { Button } from "@/components/ui/button";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/produtos/$id")({ component: EditProduct });

function EditProduct() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [values, setValues] = useState<ProductFormValues>(blankValues());

  const q = useQuery({
    queryKey: ["admin", "product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(*), product_variants(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (q.data) {
      setValues({
        name: q.data.name,
        slug: q.data.slug,
        description: q.data.description ?? "",
        short_description: q.data.short_description ?? "",
        category_id: q.data.category_id ?? "",
        brand_id: q.data.brand_id ?? "",
        base_price: Number(q.data.base_price),
        sale_price: q.data.sale_price ? Number(q.data.sale_price) : null,
        is_featured: q.data.is_featured,
        is_new: q.data.is_new,
        is_bestseller: q.data.is_bestseller,
        active: q.data.active,
        images: (q.data.product_images ?? [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((i: any) => ({ id: i.id, url: i.url })),
        variants: (q.data.product_variants ?? []).map((v: any) => ({
          id: v.id,
          color: v.color ?? "",
          color_hex: v.color_hex ?? "",
          size: v.size ?? "",
          stock: v.stock,
          price_override: v.price_override ? Number(v.price_override) : null,
        })),
      });
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: async (v: ProductFormValues) => {
      const slug = v.slug || slugify(v.name);
      const { error } = await supabase
        .from("products")
        .update({
          name: v.name,
          slug,
          description: v.description || null,
          short_description: v.short_description || null,
          category_id: v.category_id || null,
          brand_id: v.brand_id || null,
          base_price: v.base_price,
          sale_price: v.sale_price,
          is_featured: v.is_featured,
          is_new: v.is_new,
          is_bestseller: v.is_bestseller,
          active: v.active,
        })
        .eq("id", id);
      if (error) throw error;

      // Sync images: delete missing, insert new, upsert sort_order
      const existingImgIds = new Set((q.data?.product_images ?? []).map((i: any) => i.id));
      const keptIds = new Set(v.images.filter((i) => i.id).map((i) => i.id!));
      const toDelete = [...existingImgIds].filter((eid) => !keptIds.has(eid as string));
      if (toDelete.length) {
        await supabase.from("product_images").delete().in("id", toDelete as string[]);
      }
      for (let i = 0; i < v.images.length; i++) {
        const img = v.images[i];
        if (img.id) {
          await supabase.from("product_images").update({ sort_order: i }).eq("id", img.id);
        } else {
          await supabase.from("product_images").insert({ product_id: id, url: img.url, sort_order: i });
        }
      }

      // Sync variants
      const existingVarIds = new Set((q.data?.product_variants ?? []).map((v: any) => v.id));
      const keptVarIds = new Set(v.variants.filter((v) => v.id).map((v) => v.id!));
      const toDelVars = [...existingVarIds].filter((vid) => !keptVarIds.has(vid as string));
      if (toDelVars.length) {
        await supabase.from("product_variants").delete().in("id", toDelVars as string[]);
      }
      for (const va of v.variants) {
        if (va.id) {
          await supabase
            .from("product_variants")
            .update({
              color: va.color || null,
              color_hex: va.color_hex || null,
              size: va.size || null,
              stock: va.stock,
              price_override: va.price_override,
            })
            .eq("id", va.id);
        } else {
          await supabase.from("product_variants").insert({
            product_id: id,
            color: va.color || null,
            color_hex: va.color_hex || null,
            size: va.size || null,
            stock: va.stock,
            price_override: va.price_override,
          });
        }
      }
    },
    onSuccess: () => {
      toast.success("Produto atualizado");
      qc.invalidateQueries({ queryKey: ["admin", "product", id] });
      qc.invalidateQueries({ queryKey: ["admin", "products"] });
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

  return (
    <div>
      <PageHeader
        title={q.data?.name ?? "Editar produto"}
        description="Atualize dados, variações, imagens e SEO."
        actions={
          <Button variant="outline" onClick={() => navigate({ to: "/admin/produtos" as any })}>
            Voltar
          </Button>
        }
      />
      <ProductForm
        values={values}
        onChange={setValues}
        onSubmit={() => save.mutate(values)}
        saving={save.isPending}
      />
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/PageHeader";
import { ProductForm, type ProductFormValues, blankValues } from "@/components/admin/ProductForm";
import { slugify } from "@/lib/slug";

export const Route = createFileRoute("/admin/produtos/novo")({ component: NewProduct });

function NewProduct() {
  const navigate = useNavigate();
  const [values, setValues] = useState<ProductFormValues>(blankValues());

  const save = useMutation({
    mutationFn: async (v: ProductFormValues) => {
      const slug = v.slug || slugify(v.name);
      const { data: prod, error } = await supabase
        .from("products")
        .insert({
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
        .select("id")
        .single();
      if (error) throw error;
      if (v.images.length) {
        await supabase.from("product_images").insert(
          v.images.map((img, idx) => ({
            product_id: prod.id,
            url: img.url,
            sort_order: idx,
          })),
        );
      }
      if (v.variants.length) {
        await supabase.from("product_variants").insert(
          v.variants.map((va) => ({
            product_id: prod.id,
            color: va.color || null,
            color_hex: va.color_hex || null,
            size: va.size || null,
            stock: va.stock,
            price_override: va.price_override,
          })),
        );
      }
      return prod.id;
    },
    onSuccess: (id) => {
      toast.success("Produto criado");
      navigate({ to: "/admin/produtos/$id", params: { id } as any });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader title="Novo produto" description="Preencha as informações e salve." />
      <ProductForm
        values={values}
        onChange={setValues}
        onSubmit={() => save.mutate(values)}
        saving={save.isPending}
      />
    </div>
  );
}

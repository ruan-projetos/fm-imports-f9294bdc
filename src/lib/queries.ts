import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Category = {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type Banner = {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_label: string | null;
  image_url: string;
  link_url: string | null;
  position: string;
  sort_order: number;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  base_price: number;
  sale_price: number | null;
  is_featured: boolean;
  is_new: boolean;
  is_bestseller: boolean;
  rating: number;
  review_count: number;
  sales_count: number;
  category_id: string | null;
  brand_id: string | null;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  color: string | null;
  color_hex: string | null;
  size: string | null;
  sku: string | null;
  stock: number;
  price_override: number | null;
};

export type ProductImage = {
  id: string;
  product_id: string;
  url: string;
  alt_text: string | null;
  sort_order: number;
};

export type ProductWithImage = Product & { image: string | null };

const productSelect =
  "id,name,slug,short_description,description,base_price,sale_price,is_featured,is_new,is_bestseller,rating,review_count,sales_count,category_id,brand_id,product_images(url,sort_order)";

function normalizeProduct(row: any): ProductWithImage {
  const imgs = (row.product_images ?? []).sort(
    (a: any, b: any) => a.sort_order - b.sort_order,
  );
  return {
    ...row,
    image: imgs[0]?.url ?? null,
  };
}

export const bannersQuery = queryOptions({
  queryKey: ["banners", "hero"],
  queryFn: async (): Promise<Banner[]> => {
    const { data, error } = await supabase
      .from("banners")
      .select("*")
      .eq("active", true)
      .eq("position", "hero")
      .order("sort_order");
    if (error) throw error;
    return data as Banner[];
  },
});

export const categoriesQuery = queryOptions({
  queryKey: ["categories"],
  queryFn: async (): Promise<Category[]> => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data as Category[];
  },
});

export const brandsQuery = queryOptions({
  queryKey: ["brands"],
  queryFn: async (): Promise<Brand[]> => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (error) throw error;
    return data as Brand[];
  },
});

export const settingsQuery = queryOptions({
  queryKey: ["site_settings"],
  queryFn: async (): Promise<Record<string, any>> => {
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) throw error;
    const out: Record<string, any> = {};
    for (const row of data ?? []) out[row.key] = row.value;
    return out;
  },
});

type ProductListBuilder = (q: any) => any;

function productListQuery(key: string[], build: ProductListBuilder) {
  return queryOptions({
    queryKey: key,
    queryFn: async (): Promise<ProductWithImage[]> => {
      const base = supabase
        .from("products")
        .select(productSelect)
        .eq("active", true);
      const { data, error } = await build(base);
      if (error) throw error;
      return (data ?? []).map(normalizeProduct);
    },
  });
}

export const featuredProductsQuery = productListQuery(
  ["products", "featured"],
  (q) => q.eq("is_featured", true).limit(8),
);

export const newProductsQuery = productListQuery(["products", "new"], (q) =>
  q.eq("is_new", true).order("created_at", { ascending: false }).limit(8),
);

export const bestsellerProductsQuery = productListQuery(
  ["products", "bestseller"],
  (q) => q.eq("is_bestseller", true).order("sales_count", { ascending: false }).limit(8),
);

export const saleProductsQuery = productListQuery(["products", "sale"], (q) =>
  q.not("sale_price", "is", null).limit(8),
);

export const allProductsQuery = productListQuery(["products", "all"], (q) =>
  q.order("created_at", { ascending: false }),
);

export function productsByCategoryQuery(slug: string) {
  return queryOptions({
    queryKey: ["products", "category", slug],
    queryFn: async (): Promise<{
      category: Category | null;
      products: ProductWithImage[];
    }> => {
      const { data: cat } = await supabase
        .from("categories")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!cat) return { category: null, products: [] };
      const { data, error } = await supabase
        .from("products")
        .select(productSelect)
        .eq("active", true)
        .eq("category_id", cat.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return { category: cat as Category, products: (data ?? []).map(normalizeProduct) };
    },
  });
}

export function productDetailQuery(slug: string) {
  return queryOptions({
    queryKey: ["product", slug],
    queryFn: async (): Promise<
      | (Product & {
          images: ProductImage[];
          variants: ProductVariant[];
          category: Category | null;
          brand: Brand | null;
        })
      | null
    > => {
      const { data, error } = await supabase
        .from("products")
        .select(
          "*, product_images(*), product_variants(*), categories(*), brands(*)",
        )
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const images = ((data as any).product_images ?? []).sort(
        (a: any, b: any) => a.sort_order - b.sort_order,
      );
      return {
        ...(data as any),
        images,
        variants: (data as any).product_variants ?? [],
        category: (data as any).categories,
        brand: (data as any).brands,
      };
    },
  });
}

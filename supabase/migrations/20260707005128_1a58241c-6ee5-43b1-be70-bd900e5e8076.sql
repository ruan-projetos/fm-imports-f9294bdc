-- Fix admin_top_products and admin_top_categories: order_items has no `subtotal` column.
-- Revenue is quantity * unit_price.

CREATE OR REPLACE FUNCTION public.admin_top_products(lim integer DEFAULT 5)
 RETURNS TABLE(product_id uuid, name text, image text, sold bigint, revenue numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.name,
    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1),
    COALESCE(SUM(oi.quantity), 0)::bigint,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric
  FROM products p
  LEFT JOIN product_variants v ON v.product_id = p.id
  LEFT JOIN order_items oi ON oi.variant_id = v.id
  LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid','shipped','delivered')
  GROUP BY p.id
  ORDER BY sold DESC NULLS LAST
  LIMIT lim;
END $function$;

CREATE OR REPLACE FUNCTION public.admin_top_categories(lim integer DEFAULT 5)
 RETURNS TABLE(category_id uuid, name text, sold bigint, revenue numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.name,
    COALESCE(SUM(oi.quantity), 0)::bigint,
    COALESCE(SUM(oi.quantity * oi.unit_price), 0)::numeric
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id
  LEFT JOIN product_variants v ON v.product_id = p.id
  LEFT JOIN order_items oi ON oi.variant_id = v.id
  LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid','shipped','delivered')
  GROUP BY c.id
  ORDER BY sold DESC NULLS LAST
  LIMIT lim;
END $function$;
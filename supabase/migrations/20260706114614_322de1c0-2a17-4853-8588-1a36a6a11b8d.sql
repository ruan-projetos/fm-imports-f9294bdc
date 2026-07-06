
-- ============ FASE 2 — Admin: policies, colunas e RPCs ============

-- Reviews: campo de moderação
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved boolean NOT NULL DEFAULT true;

-- Ajustar read pública para mostrar apenas aprovadas (admin usa policy admin)
DROP POLICY IF EXISTS reviews_public_read ON public.reviews;
CREATE POLICY reviews_public_read ON public.reviews FOR SELECT USING (approved = true);

-- Admin: leitura/gestão total de reviews (além do dono)
DROP POLICY IF EXISTS reviews_admin_all ON public.reviews;
CREATE POLICY reviews_admin_all ON public.reviews FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin: leitura de profiles / addresses / user_roles / orders / order_items / notifications
DROP POLICY IF EXISTS profiles_admin_read ON public.profiles;
CREATE POLICY profiles_admin_read ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS addresses_admin_read ON public.addresses;
CREATE POLICY addresses_admin_read ON public.addresses FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS orders_admin_read ON public.orders;
CREATE POLICY orders_admin_read ON public.orders FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS order_items_admin_read ON public.order_items;
CREATE POLICY order_items_admin_read ON public.order_items FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS notifications_admin_all ON public.notifications;
CREATE POLICY notifications_admin_all ON public.notifications FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ Trigger: order_number automático ============
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'FM-' || to_char(now(), 'YYYYMMDD') || '-' ||
      lpad((floor(random()*100000))::text, 5, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_order_number ON public.orders;
CREATE TRIGGER trg_set_order_number BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_order_number();

-- ============ RPCs de dashboard (SECURITY DEFINER + has_role check) ============
CREATE OR REPLACE FUNCTION public.admin_kpis()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'revenue_total', COALESCE((SELECT SUM(total) FROM orders WHERE status IN ('paid','shipped','delivered')), 0),
    'revenue_month', COALESCE((SELECT SUM(total) FROM orders WHERE status IN ('paid','shipped','delivered') AND created_at >= date_trunc('month', now())), 0),
    'orders_total', (SELECT COUNT(*) FROM orders),
    'orders_pending', (SELECT COUNT(*) FROM orders WHERE status = 'pending'),
    'customers_total', (SELECT COUNT(*) FROM user_roles WHERE role = 'customer'),
    'products_total', (SELECT COUNT(*) FROM products WHERE active = true),
    'low_stock', (SELECT COUNT(*) FROM product_variants WHERE stock > 0 AND stock <= 5),
    'out_of_stock', (SELECT COUNT(*) FROM product_variants WHERE stock = 0)
  ) INTO result;
  RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_sales_by_day(days integer DEFAULT 30)
RETURNS TABLE(day date, revenue numeric, orders_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT d::date AS day,
         COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('paid','shipped','delivered')), 0)::numeric AS revenue,
         COUNT(o.id) AS orders_count
  FROM generate_series((now() - (days || ' days')::interval)::date, now()::date, '1 day') AS d
  LEFT JOIN orders o ON o.created_at::date = d::date
  GROUP BY d
  ORDER BY d;
END $$;

CREATE OR REPLACE FUNCTION public.admin_top_products(lim integer DEFAULT 5)
RETURNS TABLE(product_id uuid, name text, image text, sold bigint, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.name,
    (SELECT url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1),
    COALESCE(SUM(oi.quantity), 0)::bigint,
    COALESCE(SUM(oi.subtotal), 0)::numeric
  FROM products p
  LEFT JOIN product_variants v ON v.product_id = p.id
  LEFT JOIN order_items oi ON oi.variant_id = v.id
  LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid','shipped','delivered')
  GROUP BY p.id
  ORDER BY sold DESC NULLS LAST
  LIMIT lim;
END $$;

CREATE OR REPLACE FUNCTION public.admin_top_categories(lim integer DEFAULT 5)
RETURNS TABLE(category_id uuid, name text, sold bigint, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.name,
    COALESCE(SUM(oi.quantity), 0)::bigint,
    COALESCE(SUM(oi.subtotal), 0)::numeric
  FROM categories c
  LEFT JOIN products p ON p.category_id = c.id
  LEFT JOIN product_variants v ON v.product_id = p.id
  LEFT JOIN order_items oi ON oi.variant_id = v.id
  LEFT JOIN orders o ON o.id = oi.order_id AND o.status IN ('paid','shipped','delivered')
  GROUP BY c.id
  ORDER BY sold DESC NULLS LAST
  LIMIT lim;
END $$;

CREATE OR REPLACE FUNCTION public.admin_customers_list()
RETURNS TABLE(user_id uuid, full_name text, phone text, orders_count bigint, spent numeric, last_order timestamptz, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.phone,
    COALESCE(COUNT(o.id), 0)::bigint,
    COALESCE(SUM(o.total) FILTER (WHERE o.status IN ('paid','shipped','delivered')), 0)::numeric,
    MAX(o.created_at),
    p.created_at
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id AND ur.role = 'customer'
  LEFT JOIN orders o ON o.user_id = p.id
  GROUP BY p.id
  ORDER BY p.created_at DESC;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_kpis() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_sales_by_day(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_products(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_top_categories(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_customers_list() TO authenticated;

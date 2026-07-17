
-- 1. Update existing category icons
UPDATE public.categories SET icon = CASE slug
  WHEN 'camisas' THEN 'shirt'
  WHEN 'camisetas' THEN 'shirt'
  WHEN 'shorts' THEN 'shorts'
  WHEN 'bermudas' THEN 'bermudas'
  WHEN 'calcas' THEN 'pants'
  WHEN 'tenis' THEN 'footprints'
  WHEN 'bones' THEN 'cap'
  WHEN 'perfumes' THEN 'sparkles'
  WHEN 'relogios' THEN 'watch'
  WHEN 'pulseiras' THEN 'gem'
  WHEN 'acessorios' THEN 'gem'
  ELSE icon
END;

-- 2. home_settings singleton
CREATE TABLE public.home_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_title text,
  hero_subtitle text,
  hero_cta_label text,
  hero_cta_href text,
  hero_image_url text,
  coupon_active boolean NOT NULL DEFAULT true,
  coupon_title text,
  coupon_text text,
  coupon_code text,
  coupon_color text,
  singleton boolean NOT NULL DEFAULT true UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_settings TO authenticated;
GRANT ALL ON public.home_settings TO service_role;
ALTER TABLE public.home_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_settings_public_read" ON public.home_settings FOR SELECT USING (true);
CREATE POLICY "home_settings_admin_all" ON public.home_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_home_settings_updated_at BEFORE UPDATE ON public.home_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. home_sections
CREATE TABLE public.home_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  title text NOT NULL,
  subtitle text,
  type text NOT NULL DEFAULT 'products',
  source text NOT NULL DEFAULT 'manual',
  source_ref uuid,
  view_all_href text,
  item_limit integer NOT NULL DEFAULT 8,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.home_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_sections TO authenticated;
GRANT ALL ON public.home_sections TO service_role;
ALTER TABLE public.home_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_sections_public_read" ON public.home_sections FOR SELECT USING (active = true);
CREATE POLICY "home_sections_admin_all" ON public.home_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER update_home_sections_updated_at BEFORE UPDATE ON public.home_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. home_section_products
CREATE TABLE public.home_section_products (
  section_id uuid NOT NULL REFERENCES public.home_sections(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (section_id, product_id)
);
GRANT SELECT ON public.home_section_products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_section_products TO authenticated;
GRANT ALL ON public.home_section_products TO service_role;
ALTER TABLE public.home_section_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "home_section_products_public_read" ON public.home_section_products FOR SELECT USING (true);
CREATE POLICY "home_section_products_admin_all" ON public.home_section_products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. Seed home_settings singleton (matching current hardcoded values)
INSERT INTO public.home_settings (
  hero_title, hero_subtitle, hero_cta_label, hero_cta_href, hero_image_url,
  coupon_active, coupon_title, coupon_text, coupon_code, coupon_color
) VALUES (
  NULL, NULL, NULL, NULL, NULL,
  true,
  '10% off na primeira compra',
  'Use o código {code} no checkout.',
  'BEMVINDO10',
  '#D4AF37'
);

-- 6. Seed default sections matching current Home
INSERT INTO public.home_sections (key, title, subtitle, type, source, item_limit, sort_order, active, view_all_href) VALUES
  ('featured', 'Em destaque', 'Selecionados pela curadoria FM', 'products', 'featured', 8, 10, true, '/produtos'),
  ('new', 'Novidades', 'Chegou agora na loja', 'products', 'newest', 8, 20, true, '/produtos'),
  ('bestsellers', 'Mais vendidos', 'Os favoritos da coleção', 'products', 'bestsellers', 8, 40, true, '/produtos'),
  ('promo', 'Promoções', 'Oportunidades por tempo limitado', 'products', 'promotions', 8, 50, true, '/produtos'),
  ('brands', 'Marcas', NULL, 'brands', 'manual', 20, 70, true, NULL);

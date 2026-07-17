
# FM IMPORTS — Home dinâmica + CMS administrativo

Objetivo: tornar a Home 100% editável pelo painel `/admin`, sem alterar o layout visual atual, e corrigir os ícones das categorias.

## 1. Ícones específicos por categoria

- Adicionar coluna `icon` (text) em `categories` — armazena o nome do ícone Lucide (ex: `Shirt`, `Watch`, `Footprints`).
- Criar mapa `src/lib/category-icons.tsx` que traduz o nome do ícone → componente Lucide (fallback `Shirt`).
- Atualizar `CategoryChips`/`CategoryGrid` na Home para usar esse mapa em vez do ícone fixo.
- Seed: atualizar categorias existentes com ícones corretos:
  - Camisetas → `Shirt`
  - Shorts / Bermudas → `PersonStanding` (ou `Shirt` variante) — usar `Square` estilizado se não houver melhor
  - Calças → `PersonStanding`
  - Tênis → `Footprints`
  - Bonés → `HardHat` (ou usar SVG custom) — melhor: `Crown`? Escolher entre lucide: `HardHat`
  - Relógios → `Watch`
  - Acessórios → `Gem` ou `Link` (corrente)
- No admin de categorias, adicionar seletor de ícone (input com preview + lista curada dos principais lucide-icons de moda).

## 2. Schema — CMS da Home

Novas tabelas em `public` (todas com RLS: leitura pública quando `active=true`, escrita apenas admin via `has_role`).

### `home_settings` (singleton — key/value simples)
- `hero_title`, `hero_subtitle`, `hero_cta_label`, `hero_cta_href`, `hero_image_url`
- `coupon_active` (bool), `coupon_title`, `coupon_text`, `coupon_code`, `coupon_color` (hex)

### `home_sections`
- `id uuid`
- `key text unique` — identificador estável (ex: `featured`, `new`, `bestsellers`, `promo`, `brands`, custom)
- `title text`, `subtitle text`
- `type text` — enum: `products` | `brands` | `custom`
- `source text` — `manual` | `bestsellers` | `newest` | `promotions` | `category` | `brand`
- `source_ref uuid` — categoria/marca quando aplicável
- `sort_order int`
- `active bool`
- `limit int` (default 8)

### `home_section_products`
- `section_id uuid → home_sections`
- `product_id uuid → products`
- `sort_order int`
- PK (section_id, product_id)

Marcas já existem em `brands` (com `active`, `sort_order`) — reutilizar; a seção `brands` renderiza a partir dela.

Categorias já têm `sort_order` e `active` — reutilizar; adicionar `icon`.

## 3. Painel `/admin/homepage`

Novo item no menu com sub-rotas:
- `/admin/homepage` — visão geral + arrastar-e-soltar ordem das seções (edição via input `sort_order` para simplicidade inicial)
- `/admin/homepage/banner` — edita `home_settings` do hero (com upload de imagem em bucket `banners`)
- `/admin/homepage/cupom` — edita bloco de cupom
- `/admin/homepage/categorias` — CRUD (reaproveita listagem existente `/admin/categorias`, apenas linka)
- `/admin/homepage/marcas` — link para `/admin/marcas`
- `/admin/homepage/secoes` — lista `home_sections`, criar/editar/remover, escolher fonte e produtos manuais (multi-select)

## 4. Home — consumo dinâmico

`src/routes/index.tsx` passa a ler:
- `home_settings` (1 row) → hero + cupom
- `home_sections` ordenadas → renderizar cada uma:
  - `products` + `source=manual` → join `home_section_products` → `products`
  - `products` + `source=bestsellers|newest|promotions` → queries derivadas
  - `products` + `source=category|brand` → filtra por `source_ref`
  - `brands` → lista `brands` ativas
  - `custom` → placeholder (título/subtítulo apenas — extensível)

Fallback: se tabela vazia, seed inicial popula com os valores atuais para não quebrar a Home.

## 5. Migração e seed

Uma única migração:
1. `ALTER TABLE categories ADD COLUMN icon text`.
2. Cria as 3 tabelas + GRANTs + RLS (leitura anon quando `active=true` para `home_sections`; leitura pública total para `home_settings` singleton; escrita admin via `has_role`).
3. INSERT do singleton `home_settings` com os textos atuais do hero e cupom.
4. INSERT das 5 seções padrão (`featured`, `new`, `bestsellers`, `promo`, `brands`) com títulos atuais.
5. UPDATE de `categories.icon` para cada categoria conhecida por nome.

## 6. Não regride

- Layout visual e classes Tailwind da Home permanecem.
- Se qualquer seção estiver desativada/vazia, o bloco é omitido silenciosamente.
- Componentes atuais (`ProductCard`, `SectionHeading` etc.) são reaproveitados.

## Detalhes técnicos

- Queries via `@tanstack/react-query` no client (Home é pública, SSR-safe usando cliente publishable).
- Admin usa `supabase` client já autenticado; formulários com `react-hook-form` + `zod` seguindo o padrão dos CRUDs existentes.
- Upload de imagem do hero → bucket `banners` (já existe) via `ImageUploader`.
- Selector de ícone: lista fixa de ~20 ícones Lucide relevantes (Shirt, Watch, Footprints, Gem, Crown, HardHat, ShoppingBag, Sparkles, Glasses, Backpack, etc.) com preview.

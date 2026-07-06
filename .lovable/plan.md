
# Fase 2 — Painel Administrativo FM IMPORTS

Objetivo: entregar uma área `/admin` completa, protegida por role, com identidade visual da Fase 1 (dark + dourado), inspirada em Shopify/Stripe/Linear. Loja pública não é alterada.

---

## 1. Arquitetura de rotas

Camada admin usando pathless layout **dentro** do gate `_authenticated` para reaproveitar a proteção de sessão do integration:

```text
src/routes/
├─ _authenticated/
│  ├─ route.tsx                 (managed — não editar)
│  └─ _admin/
│     ├─ route.tsx              layout admin: verifica has_role('admin'), renderiza <AdminShell/>
│     ├─ admin.index.tsx        Dashboard
│     ├─ admin.produtos.index.tsx
│     ├─ admin.produtos.novo.tsx
│     ├─ admin.produtos.$id.tsx        (editor com abas: geral / variações / imagens / SEO)
│     ├─ admin.categorias.tsx
│     ├─ admin.marcas.tsx
│     ├─ admin.pedidos.index.tsx
│     ├─ admin.pedidos.$id.tsx
│     ├─ admin.clientes.index.tsx
│     ├─ admin.clientes.$id.tsx
│     ├─ admin.banners.tsx
│     ├─ admin.cupons.tsx
│     ├─ admin.avaliacoes.tsx
│     ├─ admin.configuracoes.tsx
│     └─ admin.perfil.tsx
```

`_admin/route.tsx` faz `beforeLoad` client-side chamando um serverFn `getMyRole` (com `requireSupabaseAuth`) e redireciona não-admins para `/`.

---

## 2. Backend / Banco

Migration incremental (não recria tabelas da Fase 1):

- **Storage buckets** (via tool): `products` (público), `banners` (público), `categories` (público), `brands` (público), `avatars` (público).
- **Políticas RLS** em `storage.objects`: leitura pública nos 5 buckets; INSERT/UPDATE/DELETE apenas para `has_role(auth.uid(),'admin')`.
- **Coluna extra**: `reviews.approved boolean default false` + `categories.icon text`.
- **Policies admin faltantes**: garantir que admin tem ALL em `products, product_variants, product_images, categories, brands, banners, coupons, reviews, site_settings, orders, order_items, notifications, addresses (SELECT), profiles (SELECT), user_roles (SELECT/UPDATE)`.
- **Trigger** `set_order_number` (gera `FM-YYYYMMDD-XXXX`) e `slugify` helper para categorias/marcas/produtos.
- **View/RPCs** para o dashboard:
  - `admin_kpis()` → receita_total, receita_mes, pedidos_total, pedidos_pendentes, clientes, produtos, low_stock, out_of_stock.
  - `admin_sales_by_day(days int)` → série temporal.
  - `admin_top_products(limit int)`.
  - `admin_top_categories(limit int)`.
  - Todas `SECURITY DEFINER` com check `has_role`.

---

## 3. Server functions (`src/lib/admin.functions.ts`)

Todas com `.middleware([requireSupabaseAuth])` + checagem `has_role`:

- `getMyRole`
- `getDashboardKpis`, `getSalesSeries`, `getTopProducts`, `getTopCategories`
- `listProductsAdmin(filter)`, `getProductAdmin(id)`, `upsertProduct`, `duplicateProduct`, `deleteProduct`
- `upsertVariant`, `deleteVariant`, `bulkUpdateStock`
- `upsertProductImage`, `reorderProductImages`, `deleteProductImage`
- `listCategories/upsertCategory/deleteCategory` (idem marcas)
- `listOrders`, `getOrder`, `updateOrderStatus`
- `listCustomers`, `getCustomer`
- CRUD `banners`, `coupons`
- `listReviews`, `setReviewApproval`, `deleteReview`
- `getSettings`, `updateSettings` (upsert em `site_settings` chave/valor)

Uploads: cliente usa `supabase.storage.from(bucket).upload(...)` diretamente (RLS aplica), depois grava a URL via serverFn.

---

## 4. UI / Design System

Reutiliza tokens da Fase 1. Novos primitivos em `src/components/admin/`:

- `AdminShell` — grid: `Sidebar` fixa (desktop) + `Sheet` drawer (mobile) + `Topbar` (breadcrumbs, busca global, avatar/menu).
- `AdminSidebar` — usa `shadcn/ui/sidebar` collapsible=icon, ícones Lucide, item ativo com bar dourada à esquerda.
- `KpiCard`, `StatDelta`, `SectionHeader`, `DataTable` (busca + filtros + paginação + ordenação + skeleton + empty state), `ConfirmDialog`, `ImageUploader` (drag&drop + reorder via dnd-kit), `VariantMatrix` (grid cor×tamanho), `StatusBadge`, `PageContainer`.
- Toasts via `sonner`.
- Gráficos: `recharts` (Area, Bar, Donut) com tema dark + accent dourado.
- Micro-animações via `framer-motion` (fade/slide sutis).

---

## 5. Telas — detalhes-chave

**Dashboard**: 8 KpiCards em grid responsivo, 2 gráficos grandes (vendas 30d, categorias donut), 2 tabelas (últimos pedidos, produtos low-stock).

**Produtos**: DataTable com thumb, nome, categoria, preço, estoque agregado, status. Ações: editar, duplicar, excluir. Editor em Tabs: Geral / Preços / Variações (matriz cor×tamanho editável inline) / Imagens (upload + reorder + capa) / SEO (slug, tags, meta).

**Pedidos**: tabela + detalhe com timeline de status (pending→paid→shipped→delivered), snapshot de endereço, itens com thumb, botões para avançar status.

**Clientes**: lista com métricas agregadas via join (count pedidos, sum total). Detalhe: dados, endereços, pedidos.

**Configurações**: form único salvando em `site_settings` (chaves: `store`, `contact`, `social`, `payment`, `footer`).

---

## 6. Dependências novas

`recharts`, `@dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities`, `date-fns` (já pode estar), `framer-motion`.

---

## 7. Ordem de execução

1. Migration (buckets, policies, colunas, RPCs).
2. `admin.functions.ts` + helpers.
3. `AdminShell` + sidebar/topbar + primitivos (`DataTable`, `KpiCard`, `ImageUploader`, `ConfirmDialog`).
4. Dashboard.
5. Produtos (CRUD + variações + imagens).
6. Categorias, Marcas, Banners, Cupons.
7. Pedidos + Clientes.
8. Avaliações + Configurações + Perfil.
9. Link "Admin" no header quando `has_role('admin')`.
10. Revisão responsiva + polish + atualização de `CHANGELOG.md`, `README.md`, `DATABASE.md`.

---

## 8. Perguntas rápidas antes de codar

1. **Email do admin inicial** — qual email deve receber a role `admin` no seed? (posso criar um serverFn `promoteToAdmin` protegido por chave, ou já plantar via SQL o `user_roles` do UID que você indicar depois do cadastro).
2. **Login social Google** — habilito agora ou mantenho só email/senha nesta fase?
3. **Checkout (WhatsApp + Mercado Pago)** — esta fase é só admin; o checkout do cliente fica para a Fase 3 conforme roadmap original, correto? (o pedido de agora foca no painel — quero confirmar antes de escopo creep).

Sem bloqueio: posso começar assumindo (1) você promove seu usuário depois via SQL, (2) só email/senha, (3) checkout na Fase 3.

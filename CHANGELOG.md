# Changelog — FM IMPORTS

Formato baseado em [Keep a Changelog](https://keepachangelog.com/). Cada fase do roadmap gera uma entrada aqui.

---

## [Fase 1] — Fundação — 2026-07-04

Entrega da base técnica e visual da plataforma. Loja navegável (home + catálogo + detalhe + carrinho + auth), banco completo com RLS e PWA instalável.

### Adicionado — Infraestrutura & Backend
- **Lovable Cloud (Supabase)** habilitado como backend único (Postgres + Auth + Storage + RLS).
- **16 tabelas** criadas com Row-Level Security e GRANTs corretos por role:
  `profiles`, `user_roles`, `addresses`, `categories`, `brands`,
  `products`, `product_images`, `product_variants`,
  `reviews`, `favorites`, `banners`, `coupons`,
  `orders`, `order_items`, `notifications`, `site_settings`.
- **Enum `app_role`** (`admin` | `customer`) em tabela dedicada `user_roles` (evita privilege escalation).
- **Função `has_role(uuid, app_role)`** `SECURITY DEFINER` para políticas RLS não-recursivas.
- **Trigger `handle_new_user`** em `auth.users` — cria `profiles` + atribui role `customer` a cada novo cadastro.
- **Trigger `update_updated_at_column`** aplicada a todas as tabelas com `updated_at`.
- Seeds iniciais: **6 categorias**, **5 marcas**, **~10 produtos** com variações de cor/tamanho, **2 banners** e configurações do site (`site_settings`).
- Documentação de schema completa em [`DATABASE.md`](./DATABASE.md).

### Adicionado — Design System
- Paleta dark-first (Preto profundo / Off-white / Grafite / **Dourado coroa**) em `src/styles.css` via tokens semânticos HSL/OKLCH.
- Tipografia: **Space Grotesk** (display) + **Inter** (body), carregados via `<link>` em `__root.tsx`.
- Utilitários: `gradient-gold`, `shimmer`, `glass`, `text-gold`.
- Grid 8pt, radius 12–16px, sombras discretas.

### Adicionado — PWA
- `public/manifest.webmanifest` com ícones, cores e display `standalone`.
- Meta tags de PWA (apple-touch, theme-color) no root.
- Pronto para instalar em Android/iOS ("Adicionar à Tela Inicial").

### Adicionado — Frontend / Rotas
- **Layout base**: `Header` responsivo, `BottomNav` mobile, `Footer`, `WhatsAppFab` flutuante.
- **Home** (`/`): `HeroCarousel` (banners do banco), `CategoryStrip`, seções de Destaques / Novidades / Mais Vendidos.
- **Catálogo** (`/produtos`): grid responsivo com filtros por categoria/marca.
- **Categoria** (`/categoria/$slug`): listagem filtrada.
- **Detalhe do produto** (`/produtos/$slug`): galeria, seleção de cor/tamanho, controle de estoque por variação, adicionar ao carrinho.
- **Carrinho** (`/carrinho`): CRUD de itens, quantidades, total; persistente via Zustand + localStorage.
- **Auth** (`/auth`): login e cadastro por email/senha.

### Adicionado — Camada de Dados
- **TanStack Query** + `src/lib/queries.ts` centralizando fetchers públicos (produtos, categorias, banners, marcas).
- **Zustand** (`src/store/cart.ts`) para carrinho persistente entre sessões.
- Cliente Supabase configurado (browser + server) com bearer middleware.

### Segurança
- RLS **habilitado em todas as tabelas** do schema `public`.
- Políticas separam leitura pública (produtos ativos, categorias, banners) de dados do usuário (`auth.uid()`) e dados admin (via `has_role`).
- Nenhum secret client-side; publishable key apenas no browser.

### Próximos passos — Fase 2 (Compra)
- Checkout dual: **WhatsApp** (`wa.me`) + **Mercado Pago** (Pix + Cartão) via `createServerFn` + webhook em `/api/public/webhooks/mercadopago`.
- Sistema de **cupons** aplicáveis no checkout.
- Área do cliente completa: pedidos, endereços, favoritos, notificações.
- Trigger `on_order_paid` para decrementar `product_variants.stock` quando `orders.status → 'paid'`.
- Emails transacionais (confirmação de pedido).

### Próximos passos — Fase 3 (Admin)
- Dashboard `/admin` gated por `has_role(auth.uid(), 'admin')` com KPIs (faturamento, ticket médio, pedidos/dia) via Recharts.
- CRUDs: produtos + variações + upload multi-imagem (Storage bucket `products`), categorias, marcas, banners, cupons.
- Gestão de pedidos (mudança de status, rastreio).
- Relatórios: mais vendidos, faturamento mensal, top categorias.

### Próximos passos — Fase 4 (Polish)
- Reviews e produtos relacionados.
- Busca inteligente com ranking (Postgres full-text search).
- Animações Framer Motion refinadas + skeleton/shimmer em todas as listas.
- Testes end-to-end (Playwright).
- Notificações push (PWA).

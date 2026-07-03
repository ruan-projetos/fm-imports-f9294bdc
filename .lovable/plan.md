
# FM IMPORTS — Plataforma E-commerce Premium (PWA)

Projeto grande. Antes de codar, aqui está a arquitetura completa e o plano faseado. Vou entregar em fases porque uma única entrega monolítica sacrificaria qualidade — cada fase é utilizável e revisável.

## 1. Stack e decisões

- Frontend: React 19 + TypeScript + Vite + TailwindCSS v4 + shadcn/ui (já no template TanStack Start).
- Roteamento: TanStack Router (file-based) — o template não usa React Router DOM; mantemos o padrão do projeto.
- Data: TanStack Query + server functions.
- Forms: React Hook Form + Zod.
- Backend: **Lovable Cloud** (Postgres + Auth + Storage + RLS) — cobre 100% do que foi pedido, sem contas externas.
- Pagamentos: **Mercado Pago** via secret key + Edge/server function (Pix + Cartão). Não é integração nativa da Lovable — vamos usar API do MP com secret configurado.
- WhatsApp: link `wa.me` com mensagem pré-formatada (sem API oficial, mais simples e sem custo).
- PWA: manifest + ícones + service worker controlado (via skill PWA) para "Adicionar à Tela Inicial" e cache offline básico do shell.

## 2. Identidade visual (Design System)

Baseado na logo FM IMPORTS:
- **Preto profundo** `oklch(0.12 0 0)` — background primário
- **Off-white** `oklch(0.98 0 0)` — foreground
- **Grafite** `oklch(0.22 0 0)` — surfaces/cards
- **Cinza médio** `oklch(0.55 0 0)` — muted
- **Dourado coroa** `oklch(0.78 0.13 85)` — accent exclusivo (CTAs premium, badges, detalhes)
- Tipografia: **Space Grotesk** (display) + **Inter** (body) — moderno, elegante, legível
- Radius: 12–16px, sombras discretas, grid 8pt
- Animações: Framer Motion (fade/slide sutis), skeleton shimmer, bottom sheet mobile
- Dark-first (a marca é escura por natureza)

## 3. Estrutura de banco (Supabase)

```text
profiles (id → auth.users, full_name, phone, avatar_url, created_at)
user_roles (id, user_id, role: 'admin'|'customer')  — enum app_role
addresses (id, user_id, label, street, number, complement, neighborhood, city, state, zip, is_default)

categories (id, name, slug, image_url, sort_order, active)
brands (id, name, slug, logo_url, active)

products (id, name, slug, description, category_id, brand_id, base_price, sale_price,
          is_featured, is_new, is_bestseller, active, created_at)
product_images (id, product_id, url, sort_order)
product_variants (id, product_id, color, size, sku, stock, price_override)
  UNIQUE(product_id, color, size)

reviews (id, product_id, user_id, rating, comment, created_at)
favorites (id, user_id, product_id)

banners (id, title, subtitle, image_url, link_url, position, active, sort_order)
coupons (id, code, discount_type: 'percent'|'fixed', discount_value, min_order,
         expires_at, usage_limit, used_count, active)

carts (id, user_id, created_at)  — ou localStorage p/ guest
cart_items (id, cart_id, variant_id, quantity)

orders (id, user_id, order_number, status, payment_method, payment_status,
        subtotal, discount, shipping, total, coupon_code, address_snapshot jsonb,
        mp_preference_id, created_at)
order_items (id, order_id, variant_id, product_snapshot jsonb, quantity, unit_price)

notifications (id, user_id, title, body, read, created_at)
```

RLS: customer vê só seus dados; admin (via `has_role`) vê tudo. Trigger para decrementar `product_variants.stock` quando `orders.status → 'paid'`.

## 4. Estrutura de rotas

```text
src/routes/
  __root.tsx                    layout + PWA meta + auth listener
  index.tsx                     home (banners, destaques, categorias, etc.)
  produtos.index.tsx            listagem + filtros
  produtos.$slug.tsx            detalhe do produto
  categoria.$slug.tsx           listagem por categoria
  marca.$slug.tsx               listagem por marca
  busca.tsx                     resultados
  carrinho.tsx
  checkout.tsx
  auth.tsx                      login/cadastro (email+senha + Google)
  _authenticated/
    conta.index.tsx             perfil
    conta.pedidos.tsx
    conta.pedidos.$id.tsx
    conta.enderecos.tsx
    conta.favoritos.tsx
    conta.cupons.tsx
    conta.notificacoes.tsx
  _admin/                       (gate por role='admin')
    admin.index.tsx             dashboard (KPIs, gráficos)
    admin.produtos.*            CRUD produtos + variações + imagens
    admin.categorias.tsx
    admin.marcas.tsx
    admin.banners.tsx
    admin.cupons.tsx
    admin.pedidos.*
    admin.clientes.tsx
    admin.estoque.tsx
    admin.relatorios.tsx
  api/public/webhooks/mercadopago.ts
```

## 5. Fases de entrega

**Fase 1 — Fundação (esta entrega)**
- Habilitar Lovable Cloud
- Design system completo em `styles.css` (paleta preto/dourado, fonts, tokens)
- Schema completo do banco + RLS + seeds (categorias, marcas, ~15 produtos fictícios com variações)
- PWA (manifest + ícones + meta)
- Layout base: header mobile-first, bottom nav, footer
- Home funcional consumindo dados reais (banners, destaques, categorias, novidades, mais vendidos)
- Listagem + detalhe de produto com galeria, variações cor/tamanho, estoque
- Auth (email + Google) + perfil básico

**Fase 2 — Compra**
- Carrinho persistente
- Cupons
- Checkout dual (WhatsApp / Mercado Pago Pix+Cartão)
- Webhook MP → atualiza pedido → decrementa estoque
- Área do cliente completa (pedidos, endereços, favoritos, notificações)

**Fase 3 — Admin**
- Dashboard estilo Vercel/Linear (KPIs, gráficos Recharts)
- CRUDs completos (produtos com upload multi-imagem, variações, banners, cupons, categorias, marcas)
- Gestão de pedidos + estoque manual
- Relatórios (mais vendidos, faturamento, categorias top)

**Fase 4 — Polish**
- Reviews, produtos relacionados, busca inteligente com ranking
- Animações Framer Motion refinadas
- Skeleton/shimmer em todas as listas
- Testes de fluxo end-to-end

## 6. Confirmações rápidas antes de começar a Fase 1

1. **Mercado Pago**: você tem uma conta MP e pode fornecer o `MERCADO_PAGO_ACCESS_TOKEN` quando chegarmos na Fase 2? (podemos deixar mockado na Fase 1)
2. **WhatsApp da loja**: uso o número da logo `+55 88 98190-7468` como destino padrão do checkout WhatsApp e do "Acompanhar Entrega"?
3. **Admin inicial**: crio um usuário admin usando seu email? Se sim, qual email? (fica com role `admin` no seed)
4. **Login social**: habilito Google (recomendado) ou só email/senha na Fase 1?

Assim que você responder (mesmo que "toca o padrão em tudo"), eu inicio a Fase 1 imediatamente — habilito Cloud, monto schema, seed e a loja navegável.

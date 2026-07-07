# Documentação do Banco de Dados — FM IMPORTS

Banco Postgres gerenciado pelo **Lovable Cloud** (Supabase). Todas as tabelas ficam no schema `public` com **Row-Level Security habilitada** e políticas por role.

---

## Diagrama de relacionamentos (alto nível)

```text
                          ┌──────────────┐
                          │ auth.users   │  (gerenciado pelo Cloud)
                          └──────┬───────┘
                                 │ 1:1
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                  ▼
        ┌──────────┐       ┌────────────┐    ┌───────────┐
        │ profiles │       │ user_roles │    │ addresses │
        └──────────┘       └────────────┘    └───────────┘
                                 │ has_role()
                                 ▼ (admin/customer)

┌────────────┐   ┌────────┐    ┌──────────────┐
│ categories │   │ brands │    │   banners    │
└─────┬──────┘   └───┬────┘    └──────────────┘
      │              │
      └──────┬───────┘
             ▼
      ┌──────────────┐   1:N   ┌──────────────────┐
      │   products   │────────▶│ product_images   │
      │              │   1:N   ├──────────────────┤
      │              │────────▶│ product_variants │──┐
      └──────┬───────┘         └──────────────────┘  │
             │ 1:N                                    │
             ├─────▶ reviews                          │
             └─────▶ favorites                        │
                                                      │ variant_id
                            ┌─────────────────────────┘
                            ▼
                     ┌─────────────┐   1:N   ┌──────────────┐
                     │   orders    │────────▶│ order_items  │
                     └──────┬──────┘         └──────────────┘
                            │
                     coupons (código aplicado)

              ┌────────────────┐    ┌────────────────┐
              │ notifications  │    │ site_settings  │
              └────────────────┘    └────────────────┘
```

---

## Enums

| Enum | Valores |
| --- | --- |
| `app_role` | `admin`, `customer` |

---

## Tabelas

### 1. `profiles` — Perfil público do usuário
Estende `auth.users` com dados exibíveis. Criado automaticamente pelo trigger `handle_new_user`.

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | FK → `auth.users.id` ON DELETE CASCADE |
| `full_name` | `text` | |
| `phone` | `text` | |
| `avatar_url` | `text` | |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | trigger atualiza |

**RLS:** usuário lê/edita apenas o próprio; leitura pública opcional.

---

### 2. `user_roles` — Autorização (NUNCA em `profiles`)

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | default `gen_random_uuid()` |
| `user_id` | `uuid` | FK → `auth.users.id` ON DELETE CASCADE |
| `role` | `app_role` | |
| `created_at` | `timestamptz` | |

`UNIQUE (user_id, role)`. Consultado pela função `has_role(_user_id, _role) SECURITY DEFINER`.

---

### 3. `addresses` — Endereços de entrega do cliente

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `user_id` | `uuid` → `auth.users` |
| `label` | `text` (ex.: "Casa") |
| `recipient` | `text` |
| `street`, `number`, `complement` | `text` |
| `neighborhood`, `city`, `state`, `zip` | `text` |
| `is_default` | `boolean` |
| `created_at`, `updated_at` | `timestamptz` |

**RLS:** apenas o dono.

---

### 4. `categories`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | |
| `name` | `text` | |
| `slug` | `text` | UNIQUE — usado em `/categoria/$slug` |
| `description` | `text` | |
| `image_url` | `text` | |
| `sort_order` | `int` | |
| `active` | `boolean` | default `true` |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS:** leitura pública (active); escrita apenas admin.

---

### 5. `brands`

Mesma estrutura de `categories` — `name`, `slug`, `logo_url`, `active`, `sort_order`.

---

### 6. `products`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | |
| `name` | `text` | |
| `slug` | `text` | UNIQUE |
| `description` | `text` | |
| `category_id` | `uuid` → `categories` | |
| `brand_id` | `uuid` → `brands` | nullable |
| `base_price` | `numeric(10,2)` | |
| `sale_price` | `numeric(10,2)` | nullable |
| `is_featured`, `is_new`, `is_bestseller` | `boolean` | |
| `active` | `boolean` | |
| `tags` | `text[]` | |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS:** leitura pública (active); escrita admin.

---

### 7. `product_images`

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `product_id` | `uuid` → `products` ON DELETE CASCADE |
| `url` | `text` |
| `alt` | `text` |
| `sort_order` | `int` |

---

### 8. `product_variants` — Estoque por combinação cor × tamanho

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | |
| `product_id` | `uuid` → `products` ON DELETE CASCADE | |
| `color` | `text` | |
| `size` | `text` | |
| `sku` | `text` | UNIQUE |
| `stock` | `int` | default `0` |
| `price_override` | `numeric(10,2)` | opcional |

`UNIQUE (product_id, color, size)`. Trigger `on_order_paid` (Fase 2) decrementa `stock` automaticamente.

---

### 9. `reviews`

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `product_id` | `uuid` → `products` |
| `user_id` | `uuid` → `auth.users` |
| `rating` | `int` (1–5) |
| `comment` | `text` |
| `created_at` | `timestamptz` |

**RLS:** leitura pública; usuário cria/edita/deleta apenas os seus.

---

### 10. `favorites`

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `user_id` | `uuid` → `auth.users` |
| `product_id` | `uuid` → `products` |
| `created_at` | `timestamptz` |

`UNIQUE (user_id, product_id)`. **RLS:** apenas o dono.

---

### 11. `banners`

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `title`, `subtitle` | `text` |
| `image_url` | `text` |
| `link_url` | `text` |
| `position` | `text` (ex.: `hero`, `mid`) |
| `sort_order` | `int` |
| `active` | `boolean` |
| `created_at`, `updated_at` | `timestamptz` |

---

### 12. `coupons`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | |
| `code` | `text` | UNIQUE, case-insensitive |
| `discount_type` | `text` | `percent` ou `fixed` |
| `discount_value` | `numeric` | |
| `min_order` | `numeric` | |
| `expires_at` | `timestamptz` | validado por trigger (não CHECK) |
| `usage_limit` | `int` | |
| `used_count` | `int` | |
| `active` | `boolean` | |

---

### 13. `orders`

| Coluna | Tipo | Notas |
| --- | --- | --- |
| `id` (PK) | `uuid` | |
| `order_number` | `text` | UNIQUE, gerado no create |
| `user_id` | `uuid` → `auth.users` | |
| `status` | `text` | `pending` · `paid` · `shipped` · `delivered` · `canceled` |
| `payment_method` | `text` | `whatsapp` · `mercadopago_pix` · `mercadopago_card` |
| `payment_status` | `text` | `pending` · `approved` · `rejected` |
| `subtotal`, `discount`, `shipping`, `total` | `numeric(10,2)` | |
| `coupon_code` | `text` | snapshot |
| `address_snapshot` | `jsonb` | endereço congelado no momento do pedido |
| `mp_preference_id`, `mp_payment_id` | `text` | ids do Mercado Pago |
| `notes` | `text` | |
| `created_at`, `updated_at` | `timestamptz` | |

**RLS:** cliente vê apenas os próprios; admin vê todos (via `has_role`).

---

### 14. `order_items`

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `order_id` | `uuid` → `orders` ON DELETE CASCADE |
| `variant_id` | `uuid` → `product_variants` |
| `product_snapshot` | `jsonb` (nome, imagem, cor, tamanho) |
| `quantity` | `int` |
| `unit_price` | `numeric(10,2)` |
| `subtotal` | `numeric(10,2)` |

Snapshot preserva o histórico mesmo se o produto for editado/removido.

---

### 15. `notifications`

| Coluna | Tipo |
| --- | --- |
| `id` (PK) | `uuid` |
| `user_id` | `uuid` → `auth.users` |
| `title`, `body` | `text` |
| `link` | `text` |
| `read` | `boolean` |
| `created_at` | `timestamptz` |

---

### 16. `site_settings` — Configurações globais (chave/valor)

| Coluna | Tipo |
| --- | --- |
| `key` (PK) | `text` (ex.: `whatsapp_number`, `store_name`) |
| `value` | `jsonb` |
| `updated_at` | `timestamptz` |

**RLS:** leitura pública; escrita apenas admin.

---

## Funções

| Função | Assinatura | Uso |
| --- | --- | --- |
| `has_role` | `(uuid, app_role) → boolean` | `SECURITY DEFINER`; usada em políticas RLS para verificar admin sem recursão |
| `handle_new_user` | `trigger → auth.users` | cria `profiles` + atribui role `customer` |
| `update_updated_at_column` | `trigger` | atualiza `updated_at` automaticamente |

---

## Políticas RLS (padrão)

Três audiências:

- **Público (`anon` + `authenticated`)** — SELECT em `products`, `categories`, `brands`, `banners`, `product_images`, `product_variants`, `reviews`, `site_settings` quando `active = true`.
- **Dono (`auth.uid() = user_id`)** — CRUD em `profiles`, `addresses`, `favorites`, `carts`, `orders` (SELECT), `notifications`, `reviews` (próprias).
- **Admin (`has_role(auth.uid(), 'admin')`)** — CRUD total em todas as tabelas de catálogo, banners, cupons, e SELECT/UPDATE em todos os pedidos.

Todas as tabelas têm `GRANT SELECT, INSERT, UPDATE, DELETE ... TO authenticated` + `GRANT ALL ... TO service_role`, e `GRANT SELECT ... TO anon` apenas nas tabelas com leitura pública.

---

## APIs / Camada de acesso

O app não expõe REST próprio — todo acesso passa por três canais:

### 1. Data API do Supabase (PostgREST)
Usado direto pelo cliente browser via `@/integrations/supabase/client`. RLS aplica. Casos: leitura de catálogo, banners, favoritos do usuário, notificações.

### 2. `createServerFn` (TanStack Start)
Server functions tipadas para lógica sensível. Autenticadas via `requireSupabaseAuth` (bearer token). **Fase 2:** criar pedido, aplicar cupom, iniciar pagamento MP.

### 3. Server routes públicos (`src/routes/api/public/*`)
Endpoints HTTP para chamadas externas. **Fase 2:** `/api/public/webhooks/mercadopago` — recebe notificação de pagamento, valida assinatura, atualiza `orders.status` → `paid`, dispara trigger de estoque.

### APIs externas integradas (Fase 2+)
| Serviço | Uso | Autenticação |
| --- | --- | --- |
| **Mercado Pago Preferences API** | Criar preferência Pix/Cartão | `MP_ACCESS_TOKEN` (secret) |
| **Mercado Pago Webhook** | Confirmar pagamento | Assinatura HMAC |
| **WhatsApp `wa.me`** | Redirecionar pedido para atendimento | — (link público) |

---

## Migrations

Todas versionadas em `supabase/migrations/`. Cada migration segue a ordem obrigatória:

1. `CREATE TABLE public.<name>(...)`
2. `GRANT` (authenticated / service_role / anon quando aplicável)
3. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
4. `CREATE POLICY ...`

Nunca modificar schemas gerenciados (`auth`, `storage`, `realtime`, `supabase_functions`, `vault`).

---

## Atualização 2026-07-07 (Fase 2 — Hotfix)

### RPC corrigido

`admin_top_products(lim)` e `admin_top_categories(lim)` foram reescritos:

- **Antes:** somavam `oi.subtotal` — coluna que **não existe** em `order_items`.
- **Depois:** `SUM(oi.quantity * oi.unit_price)`.

`order_items` armazena apenas `quantity` e `unit_price`; o subtotal é sempre derivado.

### Enum `order_status` — valores oficiais

`'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'`

Atenção: **`cancelled`** com dois L (grafia britânica), alinhada ao enum do banco. Componente `StatusBadge` foi atualizado para refletir esta grafia.

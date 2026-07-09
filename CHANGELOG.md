# Changelog — FM IMPORTS

Formato baseado em [Keep a Changelog](https://keepachangelog.com/).

---

## [Fase 2 — Checkout & Pedidos] — 2026-07-09

### Adicionado

- **Checkout completo** (`/checkout`) — formulário (Nome, WhatsApp, Cidade, Bairro, Rua, Número, Complemento, Ponto de referência), seletor de entrega (Entrega FM / Retirar na loja) e pagamento (PIX / Pagar na entrega). Aviso de cobertura Quixeré e região.
- **Página de confirmação** (`/pedido/:id`) — resumo, status, botão "Acompanhar pelo WhatsApp".
- **Meus pedidos** (`/conta/pedidos`) — lista de pedidos do cliente com status e atalho WhatsApp.
- **`src/lib/whatsapp.ts`** — templates para mensagem inicial (PIX / Pagar na entrega) e mensagens automáticas por status (separando, saiu, retirada, entregue, cancelado, pgto confirmado). Número da loja: `+55 88 98190-7458`.
- **RPC `create_order`** — cria pedido + itens atomicamente, valida e reserva estoque em `product_variants`.
- **Trigger `restore_stock_on_cancel`** — devolve estoque ao mudar status para `cancelled`.
- **Novos status** em `order_status`: `awaiting_store_confirmation`, `awaiting_pix_payment`, `payment_confirmed`, `separating`, `out_for_delivery`, `ready_for_pickup`.
- **Novos métodos** em `payment_method`: `pix`, `on_delivery`.
- **Novas colunas em `orders`**: `delivery_type` (`delivery` | `pickup`), `delivery_address` (jsonb), `customer_phone`.
- **Admin › Pedidos** — colunas cidade / entrega / pagamento; filtros por status, entrega, pagamento; alteração rápida de status inline; botão WhatsApp por linha.
- **Admin › Pedido detalhe** — mostra tipo de entrega, endereço completo com referência, botão "Enviar mensagem" com template automático baseado no status atual.

### Observações

- Estoque: reservado no `create_order`, devolvido em `cancelled`. O status `delivered` mantém a baixa (já reservada) como definitiva.
- Compatibilidade: valores antigos de enum (`pending`, `paid`, `shipped`, etc.) preservados.

---


## [Fase 2 — Hotfix] — Tipagem e correções — 2026-07-07

### Corrigido

- **`admin.pedidos.$id.tsx`** — `status` do pedido agora tipado como `Enums<"order_status">` (removido `as any`).
- **`StatusBadge`** — labels/estilos usam os valores reais do enum: `cancelled` (não `canceled`), `processing`, `refunded`.
- **RPC `admin_top_products` / `admin_top_categories`** — referenciavam a coluna inexistente `order_items.subtotal`. Agora somam `quantity * unit_price`.
- **`admin.pedidos.$id.tsx`** — display do subtotal do item calcula `unit_price * quantity` (a tabela `order_items` não tem coluna `subtotal`).
- Remoção sistemática de `as any` em rotas do admin:
  - Navegação (`to: "/admin/..."`, `params: { id }`) — passa agora pelo tipo gerado do route tree.
  - `useMutation.onError` tipado como `(e: Error)`.
  - Snapshots (`customer_snapshot`, `address_snapshot`, `product_snapshot`) tipados via interfaces locais.
  - Retornos das RPCs (`admin_kpis`, `admin_sales_by_day`, `admin_top_products`, `admin_top_categories`) usam os tipos gerados em `types.ts`.
  - Produto (`/admin/produtos/$id`) tipado como `Tables<"products"> & { product_images, product_variants }`.
- **`AdminShell`** — `NavItem.to` restrito a união literal das rotas registradas.

### Estado do build

- `tsgo --noEmit` → **0 erros / 0 warnings**.
- `as any` remanescente: apenas no arquivo gerado `src/routeTree.gen.ts` (não editável).

---



## [Fase 2] — Painel Administrativo — 2026-07-06

Entrega da área **`/admin`** completa: dashboard, CRUDs, gestão de pedidos, clientes, configurações da loja. Design system, tokens e loja pública **inalterados**.

### Adicionado — Backend

- **5 storage buckets privados** (`products`, `banners`, `categories`, `brands`, `avatars`) com políticas RLS:
  - Leitura pública dos objetos (via URL assinada de longa duração).
  - Escrita/remoção restrita a `has_role(auth.uid(), 'admin')`.
- **Novas colunas**
  - `reviews.approved boolean default true` — moderação de avaliações.
  - `brands.description text`.
- **Novas policies RLS** para leitura/gestão pelo admin em `profiles`, `addresses`, `user_roles`, `orders`, `order_items`, `notifications`, `reviews`.
- **Trigger `set_order_number`** gera `FM-AAAAMMDD-XXXXX` automaticamente ao criar pedido (quando não fornecido).
- **RPCs `SECURITY DEFINER`** (autoprotegidas por `has_role`):
  - `admin_kpis()` — KPIs do dashboard.
  - `admin_sales_by_day(days)` — série temporal de vendas.
  - `admin_top_products(lim)` — produtos mais vendidos.
  - `admin_top_categories(lim)` — categorias mais vendidas.
  - `admin_customers_list()` — lista de clientes com métricas agregadas.

### Adicionado — Frontend / Rotas

Layout `/admin` (SSR desligado, gate por role admin, redireciona `customer` para `/`).

| Rota | Tela |
| --- | --- |
| `/admin` | Dashboard (8 KPIs, gráfico de vendas 30d, donut de categorias, pedidos recentes, top vendidos) |
| `/admin/produtos` | Lista com busca, filtros, ordenação e paginação |
| `/admin/produtos/novo` · `/admin/produtos/$id` | Editor em abas (Geral · Preços · Variações · Imagens · SEO) — duplicar, excluir |
| `/admin/categorias` · `/admin/marcas` | CRUD com upload de imagem e ícone |
| `/admin/banners` | CRUD com posição, ordem e imagem |
| `/admin/cupons` | CRUD com tipo (%/R$), validade, limite de uso e status |
| `/admin/pedidos` · `/admin/pedidos/$id` | Lista + detalhe com timeline de status, itens, snapshot de endereço |
| `/admin/clientes` · `/admin/clientes/$id` | Lista com métricas + perfil completo (pedidos + endereços) |
| `/admin/avaliacoes` | Moderação (aprovar/ocultar/excluir) |
| `/admin/configuracoes` | Loja · Contato · Redes · Pagamento · Rodapé (salvos em `site_settings`) |
| `/admin/perfil` | Dados do admin autenticado |

### Adicionado — Componentes reutilizáveis

- `AdminShell` — sidebar fixa (desktop) + drawer (mobile) + topbar; item ativo com barra dourada.
- `KpiCard`, `PageHeader`, `StatusBadge`, `EmptyState`, `ConfirmDialog`.
- `DataTable` genérico com busca em tempo real, ordenação por coluna, paginação, skeleton loading e empty state.
- `ImageUploader` com upload múltiplo, reordenação drag-and-drop (`@dnd-kit`), definir capa, remover.
- `ProductForm` com abas para geral/preço/variações/imagens/SEO e matriz de variações editável.

### Adicionado — Dependências

`recharts@2.15`, `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`, `framer-motion`, `date-fns`.

### UX

- Toast notifications (`sonner`).
- Confirmação antes de excluir.
- Skeleton e loading states em todas as tabelas e cards.
- Empty states com CTA.
- Microinterações (hover, transições sutis).
- Menu responsivo (drawer mobile).

### Segurança

- Nenhum papel armazenado em `profiles`; todos via `user_roles` + `has_role()` `SECURITY DEFINER`.
- Acesso admin **verificado no cliente E no servidor** (RLS + RPCs com `RAISE EXCEPTION 'forbidden'`).
- Uploads restritos por RLS em `storage.objects`.
- Publishable key apenas no browser.

### Próximos passos — Fase 3 (Checkout & Cliente)

- Checkout dual: WhatsApp (`wa.me` com Zod validation) + Mercado Pago (Pix + Cartão) via `createServerFn` + webhook em `/api/public/webhooks/mercadopago`.
- Área do cliente: pedidos, favoritos, endereços, notificações.
- Aplicação de cupons no checkout com validação (mín. pedido, expiração, limite de uso).
- Trigger `on_order_paid` para decrementar `product_variants.stock`.
- Emails transacionais (confirmação de pedido).

### Próximos passos — Fase 4 (Polish)

- Reviews visíveis apenas aprovadas na loja pública, produtos relacionados.
- Busca full-text (`pg_trgm` / `websearch_to_tsquery`).
- Animações Framer Motion refinadas em toda a jornada.
- Push notifications (PWA), service worker offline.
- Testes E2E (Playwright).

---

## [Fase 1] — Fundação — 2026-07-04

_(preservado — ver histórico do repositório.)_

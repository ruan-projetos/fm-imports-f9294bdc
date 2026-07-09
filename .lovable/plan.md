## Fase 2 — Checkout, Pedidos e WhatsApp

Escopo grande. Antes de implementar, alinho a arquitetura para você aprovar.

### 1. Banco de dados (migração)

**Ampliar enum `order_status`** com os novos estados exigidos:
- `awaiting_store_confirmation` (aguardando confirmação da loja — PIX)
- `awaiting_pix_payment` (aguardando pagamento PIX)
- `payment_confirmed`
- `separating` (separando pedido)
- `out_for_delivery` (saiu para entrega)
- `ready_for_pickup` (disponível para retirada)

Os valores atuais (`pending`, `paid`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`) são mantidos por compatibilidade. `pending` = "Novo pedido".

**Ampliar enum `payment_method`** com:
- `pix` (PIX manual via WhatsApp — sem QR automático)
- `on_delivery` (pagar na entrega)

Mantenho `mercado_pago_pix`, `mercado_pago_card`, `whatsapp` para não quebrar nada.

**Novos campos em `orders`:**
- `delivery_type` (`text`, `delivery` | `pickup`, default `delivery`) — preparado para futura expansão (transportadora, correios etc. sem breaking change).
- `delivery_address` (`jsonb`) — snapshot detalhado (cidade, bairro, rua, número, complemento, ponto de referência, whatsapp).
- Já existem: `customer_snapshot`, `address_snapshot`, `notes`, `total`, `order_number`.

**RPC `create_order`** (`SECURITY DEFINER`) — cria pedido atômico:
1. Valida estoque de cada variante.
2. Insere `orders` + `order_items`.
3. Decrementa `product_variants.stock` (reserva).
4. Retorna `{ id, order_number }`.

**RPC `cancel_order`** — devolve estoque ao cancelar. Trigger em `orders.status` chama isso se novo status for `cancelled` e antigo não era.

**Policies:** ajusto `orders_own_insert` para permitir insert via RPC (já é `authenticated`), e adiciono policy de update pelo próprio dono apenas para `cancelled` (opcional — Fase 3).

### 2. Frontend

**Novas rotas:**
- `src/routes/checkout.tsx` — formulário completo (Nome, WhatsApp, Cidade, Bairro, Rua, Número, Complemento, Ponto de referência), seletor de entrega (Entrega FM / Retirar), seletor de pagamento (PIX / Pagar na entrega), aviso "Atualmente realizamos entregas apenas em Quixeré e cidades da região.", resumo do carrinho, botão "Finalizar pedido".
- `src/routes/pedido.$id.tsx` — página de confirmação: número, resumo, forma de pagamento/entrega, status, botão "Acompanhar pelo WhatsApp".
- `src/routes/conta.pedidos.tsx` — "Meus pedidos" (lista + status + botão WhatsApp). Substitui o placeholder atual em `/conta`.

**Fluxo pós-checkout:**
1. Chama `create_order` RPC.
2. Toast "Pedido criado com sucesso."
3. `useCart.clear()`.
4. Abre WhatsApp da loja em nova aba com mensagem pré-preenchida (template PIX ou Pagar-na-entrega).
5. Redireciona para `/pedido/:id`.

**Utilitário `src/lib/whatsapp.ts`:**
- `buildOrderMessage(order, items, paymentMethod)` — gera template PIX / Pagar-na-entrega.
- `buildStatusMessage(order, newStatus)` — templates automáticos (separando, saiu, retirada, entregue).
- `openWhatsApp(number, message)` — abre em nova aba.

### 3. Painel admin (`/admin/pedidos`)

**Enriquecer listagem:**
- Colunas: número, cliente, WhatsApp, cidade, forma de entrega, forma de pagamento, valor, data, status.
- Busca já existe → ampliar para incluir cidade e telefone.
- **Filtros:** status (multi), forma de entrega, forma de pagamento, período.
- **Alteração rápida de status:** select inline por linha.
- **Botão "Enviar mensagem":** abre WhatsApp do cliente com template automático da mudança de status (se aplicável) ou vazio.

**Página detalhe (`/admin/pedidos/$id`):**
- Já existe, apenas atualizo `STATUSES` com os novos valores e adiciono os campos novos (delivery_type, delivery_address, referência).
- Botão "Enviar mensagem ao cliente" com template baseado no status atual.

**StatusBadge:** adicionar mapeamento visual e labels em PT-BR para os novos status.

### 4. Estoque

- **Criar pedido** → RPC decrementa `variants.stock`.
- **Cancelar pedido** → trigger devolve ao estoque.
- **Entregar** → nada (já estava reservado). Documento isso em DATABASE.md como "reservado no create, definitivo no delivered".

### 5. Documentação

Atualizar `CHANGELOG.md`, `DATABASE.md` (novos enums, RPCs, triggers) e `README.md` com o fluxo completo.

---

### Arquivos a criar/editar

**Criar**
- `supabase/migrations/<ts>_checkout_orders.sql`
- `src/routes/checkout.tsx`
- `src/routes/pedido.$id.tsx`
- `src/routes/conta.pedidos.tsx`
- `src/lib/whatsapp.ts`

**Editar**
- `src/components/admin/StatusBadge.tsx` (novos status)
- `src/routes/admin.pedidos.index.tsx` (filtros, colunas, mudança rápida, botão WhatsApp)
- `src/routes/admin.pedidos.$id.tsx` (novos status + campos + botão WhatsApp cliente)
- `src/routes/carrinho.tsx` (habilitar botão "Finalizar" → `/checkout`)
- `src/routes/conta.tsx` (link para `/conta/pedidos`)
- `CHANGELOG.md`, `DATABASE.md`, `README.md`

### Pontos que quero confirmar

1. **Login obrigatório para checkout?** Como as policies exigem `auth.uid()` no insert de `orders`, o cliente precisa estar logado. Se quiser guest checkout eu ajusto policies + `user_id nullable`. Por padrão vou exigir login (mais seguro e alinhado ao esquema atual).
2. **Estoque:** decremento imediato no create, retorno no cancel. Confirma?
3. Posso prosseguir com a implementação completa?
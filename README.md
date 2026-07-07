# FM IMPORTS — E-commerce Premium (PWA)

Plataforma de e-commerce completa para a **FM IMPORTS**, construída como Progressive Web App com aparência de aplicativo nativo. Curadoria de moda, calçados, acessórios e perfumaria importados.

> **Status:** Fase 1 (Fundação) e Fase 2 (Painel Administrativo) concluídas — build limpa em TypeScript strict. Ver [`CHANGELOG.md`](./CHANGELOG.md).

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | **TanStack Start v1** (React 19 + Vite 7, SSR + server functions) |
| Linguagem | TypeScript (strict) |
| Estilo | Tailwind CSS v4 + shadcn/ui + tokens semânticos (dark-first) |
| Roteamento | TanStack Router (file-based, type-safe) |
| Data fetching | TanStack Query + `createServerFn` |
| Forms | React Hook Form + Zod |
| Estado global | Zustand (carrinho persistente) |
| Backend | **Lovable Cloud** — Postgres + Auth + Storage + RLS |
| Pagamentos (Fase 2) | Mercado Pago (Pix + Cartão) + WhatsApp `wa.me` |
| PWA | Web App Manifest + ícones (service worker na Fase 4) |
| Fontes | Space Grotesk (display) + Inter (body) |

---

## Como rodar localmente

Pré-requisitos: [Bun](https://bun.sh) ≥ 1.1 e Node 20+.

```bash
# 1. Instalar dependências
bun install

# 2. Rodar em modo dev (Vite + SSR)
bun run dev
# → http://localhost:8080
```

O projeto usa **Lovable Cloud** — variáveis Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, etc.) já vêm injetadas no ambiente Lovable. Para rodar fora da Lovable, copie `.env.example` para `.env` e preencha suas chaves.

### Scripts

| Comando | Descrição |
| --- | --- |
| `bun run dev` | Dev server (SSR + HMR) na porta 8080 |
| `bun run build` | Build de produção |
| `bun run preview` | Serve o build |
| `bun run lint` | ESLint |

---

## Estrutura de pastas

```text
src/
├── routes/                    # File-based routing (TanStack Router)
│   ├── __root.tsx             # Shell (HTML, PWA meta, providers)
│   ├── index.tsx              # Home
│   ├── produtos.index.tsx     # Catálogo
│   ├── produtos.$slug.tsx     # Detalhe do produto
│   ├── categoria.$slug.tsx    # Categoria
│   ├── carrinho.tsx
│   ├── auth.tsx
│   └── _authenticated/        # (Fase 2) rotas gated por login
├── components/
│   ├── layout/                # Header, Footer, BottomNav, WhatsAppFab
│   ├── home/                  # HeroCarousel, CategoryStrip
│   ├── product/               # ProductCard, ProductRow
│   └── ui/                    # shadcn/ui
├── store/cart.ts              # Zustand (carrinho persistente)
├── lib/
│   ├── queries.ts             # TanStack Query fetchers
│   └── format.ts              # formatBRL, etc.
├── integrations/supabase/     # Clientes (auto-gerados — não editar)
└── styles.css                 # Design system + tokens

supabase/
└── migrations/                # Migrações SQL versionadas

public/
├── manifest.webmanifest       # PWA
├── logo-fm.jpg
├── hero/                      # Imagens dos banners
└── products/                  # Imagens dos produtos
```

---

## Banco de dados

Documentação completa em [`DATABASE.md`](./DATABASE.md) — inclui todas as tabelas, colunas, relacionamentos, políticas RLS e diagramas.

**Resumo:** 16 tabelas cobrindo catálogo (produtos + variações + imagens + categorias + marcas), comércio (carrinho, pedidos, cupons, endereços), engajamento (favoritos, reviews, notificações), configuração (banners, site_settings) e autorização (profiles, user_roles).

---

## PWA

Instalável em Android e iOS via "Adicionar à Tela Inicial". Ícone, splash colors e display `standalone` definidos em `public/manifest.webmanifest`. Cache offline do shell na Fase 4.

---

## Design System

Dark-first, elegante, inspirado na logo (coroa dourada + preto).

- **Cores** (tokens em `src/styles.css`):
  - `--background` preto profundo · `--foreground` off-white
  - `--card` grafite · `--muted-foreground` cinza médio
  - `--accent` / `--gold` **dourado coroa** — usado em CTAs premium e badges
- **Tipografia:** Space Grotesk (títulos) + Inter (corpo)
- **Grid:** 8pt · **Radius:** 12–16px · **Animações:** transições sutis (Framer Motion na Fase 4)

Nunca use `text-white`, `bg-black` ou cores hardcoded em componentes — sempre tokens semânticos.

---

## Roadmap

- ✅ **Fase 1 — Fundação:** design system, schema completo, PWA, home + catálogo + detalhe + carrinho + auth.
- 🚧 **Fase 2 — Compra:** checkout WhatsApp + Mercado Pago, cupons, área do cliente, webhook MP.
- ⏳ **Fase 3 — Admin:** dashboard com KPIs, CRUDs completos, gestão de pedidos e relatórios.
- ⏳ **Fase 4 — Polish:** reviews, busca inteligente, animações refinadas, push notifications, e2e tests.

Ver detalhes no [`CHANGELOG.md`](./CHANGELOG.md) e no plano em [`.lovable/plan.md`](./.lovable/plan.md).

---

## Segurança

- **RLS** habilitado em todas as tabelas do schema `public`.
- Roles em tabela dedicada `user_roles` (nunca em `profiles`) + função `has_role()` `SECURITY DEFINER`.
- Publishable key no cliente; service role apenas em servidor.
- Sem secrets em código.

---

## Licença

Proprietário — © FM IMPORTS.

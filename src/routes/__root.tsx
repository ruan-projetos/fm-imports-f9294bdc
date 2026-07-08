import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-gradient-silver">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-black"
        >
          Voltar para a home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-xl font-semibold">Não foi possível carregar</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Algo deu errado. Tente novamente ou volte para a home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full gradient-gold px-5 py-2.5 text-sm font-semibold text-black"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="rounded-full border border-border bg-transparent px-5 py-2.5 text-sm font-medium"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0a0a0a" },
      { title: "FM IMPORTS · Moda Masculina" },
      {
        name: "description",
        content:
          "FM IMPORTS — moda premium importada. Camisetas, tênis, perfumes, relógios e acessórios com curadoria exclusiva.",
      },
      { property: "og:title", content: "FM IMPORTS · Moda Masculina" },
      {
        property: "og:description",
        content: "FM IMPORTS — moda premium importada. Camisetas, tênis, perfumes, relógios e acessórios com curadoria exclusiva.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "FM IMPORTS · Moda Masculina" },
      { name: "twitter:description", content: "FM IMPORTS — moda premium importada. Camisetas, tênis, perfumes, relógios e acessórios com curadoria exclusiva." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/klPvrlPPouZg1pYnTHcRlyiDtUh2/social-images/social-1783515987029-Shop_(1).webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/klPvrlPPouZg1pYnTHcRlyiDtUh2/social-images/social-1783515987029-Shop_(1).webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "apple-touch-icon", href: "/logo-fm.jpg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Chrome() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const hideChrome = path.startsWith("/auth") || path.startsWith("/admin");
  return (
    <>
      {!hideChrome && <Header />}
      <main className="min-h-[60vh] pb-24 md:pb-0">
        <Outlet />
      </main>
      {!hideChrome && <Footer />}
      {!hideChrome && <BottomNav />}
      {!hideChrome && <WhatsAppFab />}
      <Toaster theme="dark" position="top-center" />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Chrome />
    </QueryClientProvider>
  );
}

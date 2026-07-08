import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type AuthSearch = { redirect?: string };

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  component: AuthPage,
});

function AuthPage() {
  const router = useRouter();
  const search = Route.useSearch();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function redirectAfterLogin(userId: string) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const wanted = search.redirect;
    const safe = wanted && wanted.startsWith("/") ? wanted : null;
    if (safe && (isAdmin || !safe.startsWith("/admin"))) {
      router.navigate({ to: safe });
    } else if (isAdmin) {
      router.navigate({ to: "/admin" });
    } else {
      router.navigate({ to: "/" });
    }
  }

  // If already signed in, bounce to the right place
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) redirectAfterLogin(data.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Você já pode entrar.");
        setMode("login");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo à FM IMPORTS 👑");
        if (data.user) await redirectAfterLogin(data.user.id);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Não foi possível concluir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex justify-center">
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl font-bold tracking-widest text-gradient-silver">
              FM
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">
              Imports
            </span>
          </div>
        </Link>

        <h1 className="mt-10 font-display text-2xl font-semibold">
          {mode === "login" ? "Entrar na sua conta" : "Criar sua conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login"
            ? "Acesse pedidos, favoritos e cupons"
            : "Cadastre-se para desbloquear cupons e histórico"}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Nome completo
              </label>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:border-gold"
              />
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:border-gold"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Senha
            </label>
            <input
              required
              minLength={6}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 w-full rounded-xl border border-input bg-card px-4 text-sm outline-none focus:border-gold"
            />
          </div>

          <button
            disabled={loading}
            className="mt-2 h-12 w-full rounded-full gradient-gold text-sm font-semibold text-black disabled:opacity-60"
          >
            {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="font-medium text-gold hover:opacity-80"
          >
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </p>

        <Link
          to="/"
          className="mt-8 block text-center text-xs text-muted-foreground hover:text-foreground"
        >
          ← Voltar para a loja
        </Link>
      </div>
    </div>
  );
}

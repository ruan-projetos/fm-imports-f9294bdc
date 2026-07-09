import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Package, Shield, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export const Route = createFileRoute("/conta")({
  ssr: false,
  component: ContaPage,
});

function ContaPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!data.user) {
        navigate({ to: "/auth", search: { redirect: "/conta" } });
        return;
      }
      setUser(data.user);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      if (!mounted) return;
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  async function handleLogout() {
    await supabase.auth.signOut();
    toast.success("Você saiu da sua conta");
    navigate({ to: "/", replace: true });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 pb-28">
      <h1 className="font-display text-2xl font-semibold">Minha conta</h1>
      <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>

      <div className="mt-8 space-y-3">
        {isAdmin && (
          <Link
            to="/admin"
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm hover:border-gold"
          >
            <Shield className="h-5 w-5 text-gold" />
            <div className="flex-1">
              <div className="font-medium">Painel administrativo</div>
              <div className="text-xs text-muted-foreground">Gerenciar loja</div>
            </div>
          </Link>
        )}
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm">
          <UserIcon className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Perfil</div>
            <div className="text-xs text-muted-foreground">Em breve</div>
          </div>
        </div>
        <Link
          to="/conta/pedidos"
          className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm hover:border-gold"
        >
          <Package className="h-5 w-5 text-muted-foreground" />
          <div className="flex-1">
            <div className="font-medium">Meus pedidos</div>
            <div className="text-xs text-muted-foreground">Acompanhe pedidos e status</div>
          </div>
        </Link>

        <button
          onClick={handleLogout}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-4 py-3 text-sm font-medium hover:border-destructive hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}

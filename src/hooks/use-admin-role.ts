import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdminSessionState =
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "forbidden"; userId: string }
  | { status: "admin"; userId: string; email: string | null };

export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<AdminSessionState>({ status: "loading" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (mounted) setState({ status: "unauthenticated" });
        return;
      }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const isAdmin = (roles ?? []).some((r) => r.role === "admin");
      if (!mounted) return;
      setState(
        isAdmin
          ? { status: "admin", userId: user.id, email: user.email ?? null }
          : { status: "forbidden", userId: user.id },
      );
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_e) => {
      // Re-check on sign-in/out
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (!user) {
          if (mounted) setState({ status: "unauthenticated" });
          return;
        }
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);
        const isAdmin = (roles ?? []).some((r) => r.role === "admin");
        if (!mounted) return;
        setState(
          isAdmin
            ? { status: "admin", userId: user.id, email: user.email ?? null }
            : { status: "forbidden", userId: user.id },
        );
      });
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}

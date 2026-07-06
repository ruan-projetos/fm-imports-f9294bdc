import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminSession } from "@/hooks/use-admin-role";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const session = useAdminSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session.status === "unauthenticated") {
      navigate({ to: "/auth", search: { redirect: "/admin" } as any });
    } else if (session.status === "forbidden") {
      navigate({ to: "/" });
    }
  }, [session.status, navigate]);

  if (session.status === "loading" || session.status !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <AdminShell email={session.email}>
      <Outlet />
    </AdminShell>
  );
}
